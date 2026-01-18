import { Message, Collection } from 'discord.js';
import { SpamConfig } from './utils/spamConfig';
import { SPAM_PATTERNS } from './utils/spamPatterns';

// Configuration
const IMAGE_THRESHOLD = 4;
const TEXT_FLOOD_THRESHOLD = 5; // Max messages in window
const DUPLICATE_THRESHOLD = 4; // Max same messages
const TIME_WINDOW = 5000; // 5 seconds (Reduced for faster reaction)
const MUTE_DURATION = 30 * 1000; // 30 seconds

interface UserHistory {
    timestamps: number[];
    messages: { content: string, id: string, time: number }[];
}

// Store user history: Map<GuildID, Map<UserID, UserHistory>>
const userHistory = new Collection<string, Collection<string, UserHistory>>();

export async function handleAntiSpam(message: Message) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;

    // CONFIG CHECK
    if (!SpamConfig.isEnabled(guildId)) return;
    if (SpamConfig.isExempt(guildId, message.channel.id, message.member?.roles.cache.map(r => r.id) || [])) return;

    const userId = message.author.id;
    const now = Date.now();

    // 0. IMMEDIATE CONTENT CHECK (Vertical Bars, Mass Mentions)
    let detectionReason = '';

    if (SPAM_PATTERNS.VERTICAL_BARS.test(message.content)) {
        detectionReason = 'Zararlı İçerik (Vertical Bars)';
    } else if (SPAM_PATTERNS.MASS_MENTION.test(message.content)) {
        // Check if user has permission to mention everyone? 
        // Usually Discord handles permissions, but if they bypass or use unusual methods:
        if (!message.member?.permissions.has('MentionEveryone')) {
            detectionReason = 'İzinsiz Toplu Etiket';
        }
    }

    // Initialize Collections
    if (!userHistory.has(guildId)) userHistory.set(guildId, new Collection());
    const guildHistory = userHistory.get(guildId)!;

    if (!guildHistory.has(userId)) {
        guildHistory.set(userId, { timestamps: [], messages: [] });
    }

    const userData = guildHistory.get(userId)!;

    // Add current message data
    userData.timestamps.push(now);
    userData.messages.push({ content: message.content, id: message.id, time: now });

    // Clean old data
    userData.timestamps = userData.timestamps.filter(t => now - t < TIME_WINDOW);
    userData.messages = userData.messages.filter(m => now - m.time < TIME_WINDOW);

    // --- DETECTION LOGIC (Continued if not already caught) ---

    // 1. Image Spam? (Simplified as rate limit)
    // ...

    // 2. Flood Detection (Rate Limit)
    if (!detectionReason && userData.timestamps.length >= TEXT_FLOOD_THRESHOLD) {
        detectionReason = 'Hızlı Mesaj (Flood)';
    }

    // 3. Duplicate Detection
    if (!detectionReason) {
        const duplicateCount = userData.messages.filter(m => m.content === message.content && m.content.length > 0).length;
        if (duplicateCount >= DUPLICATE_THRESHOLD) {
            detectionReason = 'Tekrarlanan Mesaj';
        }
    }

    // --- ACTION ---
    if (detectionReason) {
        try {
            const member = message.member;

            // 1. Timeout
            if (member && member.moderatable) {
                if (!member.isCommunicationDisabled()) {
                    // await member.timeout(MUTE_DURATION, `Anti-Spam: ${detectionReason}`);
                    console.log(`[Anti-Spam] Would accept timeout for ${member.user.tag} (${detectionReason}) but it is DISABLED.`);
                }
            }

            // 2. Cleanup Messages
            let messagesToDelete: string[] = [];

            if (detectionReason === 'Zararlı İçerik (Vertical Bars)' || detectionReason === 'İzinsiz Toplu Etiket') {
                // For these severe specific offenses, delete this specific message immediately
                messagesToDelete.push(message.id);
            } else if (detectionReason === 'Tekrarlanan Mesaj') {
                const sameContent = userData.messages.filter(m => m.content === message.content);
                sameContent.sort((a, b) => a.time - b.time);
                messagesToDelete = sameContent.slice(1).map(m => m.id);
            } else {
                // Flood
                const sortedMsgs = [...userData.messages].sort((a, b) => a.time - b.time);
                messagesToDelete = sortedMsgs.slice(1).map(m => m.id);
            }

            if (messagesToDelete.length > 0) {
                // Ensure distinct and valid
                messagesToDelete = [...new Set(messagesToDelete)];

                if (message.channel && 'bulkDelete' in message.channel) {
                    if (messagesToDelete.length === 1) {
                        // Bulk delete throws for 1 message sometimes if old, safe to just delete msg
                        const msgToDelete = message.channel.messages.cache.get(messagesToDelete[0]) || await message.channel.messages.fetch(messagesToDelete[0]).catch(() => null);
                        if (msgToDelete && msgToDelete.deletable) await msgToDelete.delete();
                    } else {
                        await (message.channel as any).bulkDelete(messagesToDelete).catch(() => { });
                    }
                }
            }

            // 3. Alert
            const channel = message.channel as any;
            const alertMsg = await channel.send(`🛑 <@${userId}> **${detectionReason}** tespit edildi! (Timeout Devre Dışı)`);
            setTimeout(() => alertMsg.delete().catch(() => { }), 5000);

            // Reset history
            guildHistory.set(userId, { timestamps: [], messages: [] });

        } catch (error) {
            console.error('Anti-Spam Action Failed:', error);
        }
    }
}
