import { Message, GuildMember, TextChannel, User, EmbedBuilder, PermissionFlagsBits, PartialGuildMember } from 'discord.js';
import { guardianDb } from '../utils/guardianDb';
import { ChannelDb } from '../utils/channelDb';

// Cache for rate limiting / spam detection
const spamMap = new Map<string, { count: number, lastMsg: number, timer?: NodeJS.Timeout }>();
const mentionMap = new Map<string, { count: number, lastMsg: number }>();
const capsMap = new Map<string, number>();

// Limits Cache (for events like channelCreate)
const limitTracker = new Map<string, { count: number, firstEvent: number }>();

// --- MEMORY CLEANUP TASK ---
setInterval(() => {
    const now = Date.now();
    spamMap.forEach((val, key) => {
        if (now - val.lastMsg > 600000) spamMap.delete(key); // 10 mins
    });
    mentionMap.forEach((val, key) => {
        if (now - val.lastMsg > 600000) mentionMap.delete(key);
    });
    capsMap.clear(); // Caps map seems ephemeral, clear periodically
    limitTracker.forEach((val, key) => {
        if (now - val.firstEvent > 600000) limitTracker.delete(key);
    });
    // LimitMap (inside class) needs cleanup too? It has its own logic but map grows.
    GuardianLogic.cleanupLimits();
}, 300000); // Run every 5 mins

export class GuardianLogic {

    // --- HELPER: LOGGING ---
    static async logAction(guild: any, title: string, description: string, color: any = 'Red') {
        const config = guardianDb.get(guild.id);
        if (!config.logChannelId) return;

        const channel = guild.channels.cache.get(config.logChannelId) as TextChannel;
        // Check if channel exists and is text-based (has send)
        if (channel && channel.isTextBased()) {
            const embed = new EmbedBuilder()
                .setTitle(`🛡️ ${title}`)
                .setDescription(description)
                .setColor(color)
                .setTimestamp();
            await channel.send({ embeds: [embed] }).catch(() => { });
        }
    }

    // --- HELPER: PUNISHMENT ---
    static async punish(member: GuildMember, action: 'kick' | 'ban' | 'log', reason: string) {
        if (member.permissions.has(PermissionFlagsBits.Administrator)) return; // Never punish admins via auto-mod

        try {
            if (action === 'kick') {
                if (member.kickable) {
                    await member.kick(reason);
                    await this.logAction(member.guild, 'Kullanıcı Atıldı', `👤 **Kullanıcı:** ${member.user.tag}\n📄 **Sebep:** ${reason}`, 'Orange');
                }
            } else if (action === 'ban') {
                if (member.bannable) {
                    await member.ban({ reason });
                    await this.logAction(member.guild, 'Kullanıcı Yasaklandı', `👤 **Kullanıcı:** ${member.user.tag}\n📄 **Sebep:** ${reason}`, 'Red');
                }
            } else {
                await this.logAction(member.guild, 'Güvenlik Uyarısı', `👤 **Kullanıcı:** ${member.user.tag}\n📄 **İhlal:** ${reason} (Sadece Log)`, 'Yellow');
            }
        } catch (e) {
            console.error(`Failed to punish ${member.user.tag}:`, e);
        }
    }

    // --- CHAT PROTECTION ---
    static async checkMessage(message: Message) {
        if (!message.guild || message.author.bot) return;
        const config = guardianDb.get(message.guild.id);

        if (!config.enabled) return;

        // Whitelist Check
        if (config.whitelistIds.includes(message.author.id)) return;
        if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return; // Admins bypass chat filters usually

        const content = message.content;

        // 1. LINK BLOCKER
        if (config.chat.link.enabled) {
            const linkRegex = /(https?:\/\/[^\s]+)/g;
            if (linkRegex.test(content)) {
                // TODO: WhiteList Check logic could be added here
                if (config.chat.link.allowWhiteList) {
                    // Skip if needed
                }
                await message.delete().catch(() => { });
                const msg = await (message.channel as TextChannel).send(`⚠️ ${message.author}, link paylaşmak yasak!`);
                setTimeout(() => msg.delete().catch(() => { }), 3000);
                return; // Stop further checks
            }
        }

        // 2. BAD WORDS
        if (config.chat.badWords.enabled) {
            const found = config.chat.badWords.words.some((word: string) => content.toLowerCase().includes(word.toLowerCase()));
            if (found) {
                await message.delete().catch(() => { });
                const msg = await (message.channel as TextChannel).send(`⚠️ ${message.author}, küfür/yasaklı kelime kullandın!`);
                setTimeout(() => msg.delete().catch(() => { }), 3000);
                return;
            }
        }

        // 3. CAPS LOCK
        if (config.chat.caps.enabled && content.length > 5) {
            const capsCount = content.replace(/[^A-Z]/g, "").length;
            const percentage = (capsCount / content.length) * 100;
            if (percentage >= config.chat.caps.percentage) {
                await message.delete().catch(() => { });
                const msg = await (message.channel as TextChannel).send(`⚠️ ${message.author}, çok fazla büyük harf kullanma!`);
                setTimeout(() => msg.delete().catch(() => { }), 3000);
                return;
            }
        }

        // 4. SPAM
        if (config.chat.spam.enabled) {
            const key = `${message.guild.id}-${message.author.id}`;
            const now = Date.now();
            const userData = spamMap.get(key) || { count: 0, lastMsg: now };

            if (now - userData.lastMsg < 2000) { // 2 seconds window
                userData.count++;
            } else {
                userData.count = 1;
            }
            userData.lastMsg = now;
            spamMap.set(key, userData);

            if (userData.count >= config.chat.spam.limit) {
                // Action: Timeout or Mute
                await message.member?.timeout(60 * 1000, 'Spam Koruması').catch(() => { });
                await (message.channel as TextChannel).send(`🔇 ${message.author} spam yaptığı için susturuldu.`);
                userData.count = 0; // Reset
            }
        }
    }

    // --- RAID / MEMBER CHECKS ---
    static async checkMemberJoin(member: GuildMember) {
        if (member.user.bot) return; // Separate check for bots
        const config = guardianDb.get(member.guild.id);
        if (!config.enabled) return;

        // 1. Account Age
        if (config.raid.minAccountAge > 0) {
            const now = Date.now();
            const created = member.user.createdTimestamp;
            const ageDays = (now - created) / (1000 * 60 * 60 * 24);

            if (ageDays < config.raid.minAccountAge) {
                try {
                    await member.send(`⛔ Hesabınız çok yeni (${Math.floor(ageDays)} gün). Sunucu güvenliği için en az ${config.raid.minAccountAge} günlük olmalı.`);
                    await member.kick('Hesap yaşı yetersiz (Anti-Raid)');
                    this.logAction(member.guild, 'Raid Koruması', `👤 ${member.user.tag} sunucudan atıldı.\n👶 Hesap Yaşı: ${ageDays.toFixed(1)} gün`, 'Red');
                    return;
                } catch (e) {
                    console.error('Kick failed:', e);
                }
            }
        }

        // 2. Quarantine
        if (config.raid.quarantine.enabled && config.raid.quarantine.roleId) {
            const role = member.guild.roles.cache.get(config.raid.quarantine.roleId);
            if (role) {
                await member.roles.add(role).catch(() => { });
                await this.logAction(member.guild, 'Karantina', `👤 ${member.user} karantinaya alındı.`);
            }
        }
    }

    // --- ANTI-NUKE MONITORING ---
    // In-memory storage for limits: key = "guildId-userId-action" -> { count, lastReset }
    static limitMap = new Map<string, { count: number, lastReset: number }>();

    static async checkLimit(guild: any, executorId: string, actionKey: 'ban' | 'kick' | 'channelCreate' | 'channelDelete' | 'roleCreate' | 'roleDelete' | 'webhook' | 'botAdd') {
        const config = guardianDb.get(guild.id);
        if (!config.enabled) return;

        const limitConfig = config.limits[actionKey];
        if (!limitConfig.enabled) return;

        // Access Control
        // If High Protection is OFF: Admins are ignored.
        // If High Protection is ON: Admins are CHECKED, only Owner & Whitelist are ignored.
        const member = await guild.members.fetch(executorId).catch(() => null);
        if (!member) return;

        const isOwner = guild.ownerId === executorId;
        const isWhitelisted = config.whitelistIds.includes(executorId);
        const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

        if (isOwner || isWhitelisted) return; // Always safe
        if (!config.highProtection && isAdmin) return; // Standard mode: Admins safe

        // Check Rate Limit
        const key = `${guild.id}-${executorId}-${actionKey}`;
        const now = Date.now();
        const data = this.limitMap.get(key) || { count: 0, lastReset: now };

        // Reset every minute (generic window)
        if (now - data.lastReset > 60000) {
            data.count = 0;
            data.lastReset = now;
        }

        data.count++;
        this.limitMap.set(key, data);

        const max = 'limit' in limitConfig ? (limitConfig as any).limit : 1; // Default 1 for boolean types

        if (data.count >= max) {
            // Action!
            const reason = `Anti-Nuke: ${actionKey} limiti aşıldı (${data.count}/${max})`;
            await this.punish(member, limitConfig.action, reason);

            // Reset count prevents infinite loop of punishments, though punish checks bannable
            data.count = 0;
            this.limitMap.set(key, data);
        }
    }

    // --- MONITORS ---
    static async checkChannelMonitor(channel: any, type: 'create' | 'delete') {
        const guild = channel.guild;
        setTimeout(async () => {
            const auditType = type === 'create' ? 10 : 12; // CHANNEL_CREATE=10, CHANNEL_DELETE=12
            const logs = await guild.fetchAuditLogs({ limit: 1, type: auditType }).catch(() => null);
            if (!logs) return;
            const entry = logs.entries.first();
            if (!entry) return;
            if ((Date.now() - entry.createdTimestamp) > 5000) return; // Old log

            await this.checkLimit(guild, entry.executor.id, type === 'create' ? 'channelCreate' : 'channelDelete');
        }, 1000);
    }

    static async checkRoleMonitor(role: any, type: 'create' | 'delete') {
        const guild = role.guild;
        setTimeout(async () => {
            const auditType = type === 'create' ? 30 : 32; // ROLE_CREATE=30, ROLE_DELETE=32
            const logs = await guild.fetchAuditLogs({ limit: 1, type: auditType }).catch(() => null);
            if (!logs || !logs.entries.first()) return;
            const entry = logs.entries.first()!;
            if ((Date.now() - entry.createdTimestamp) > 5000) return;

            await this.checkLimit(guild, entry.executor.id, type === 'create' ? 'roleCreate' : 'roleDelete');
        }, 1000);
    }

    static async checkBanMonitor(ban: any) { // GuildBan
        const guild = ban.guild;
        setTimeout(async () => {
            const logs = await guild.fetchAuditLogs({ limit: 1, type: 22 }).catch(() => null);
            if (!logs || !logs.entries.first()) return;
            const entry = logs.entries.first()!;
            if ((Date.now() - entry.createdTimestamp) > 5000) return;

            await this.checkLimit(guild, entry.executor.id, 'ban');
        }, 1000);
    }

    static async checkKickMonitor(member: any) {
        const guild = member.guild;
        setTimeout(async () => {
            const logs = await guild.fetchAuditLogs({ limit: 1, type: 20 }).catch(() => null);
            if (!logs || !logs.entries.first()) return;
            const entry = logs.entries.first()!;
            if (entry.target?.id !== member.id) return;
            if ((Date.now() - entry.createdTimestamp) > 5000) return;

            await this.checkLimit(guild, entry.executor.id, 'kick');
        }, 1000);
    }

    static cleanupLimits() {
        const now = Date.now();
        this.limitMap.forEach((val, key) => {
            if (now - val.lastReset > 600000) this.limitMap.delete(key);
        });
    }
}

