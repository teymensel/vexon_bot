import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, Message, TextChannel, Collection, Attachment, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ButtonInteraction } from 'discord.js';
import { SPAM_PATTERNS } from '../utils/spamPatterns';

// Suspicious Keywords
const SUSPICIOUS_KEYWORDS = [
    'free nitro', 'bedava nitro', 'steam community', 'airdrop', 'crypto',
    'hediye', 'gift', 'aktivasyon', 'bakiye', 'withdraw', 'yatırım', 'kripto',
    'discord.gift', 't.me/', 'whatsapp', 'hacked'
];

interface SuspectData {
    score: number;
    reasons: Set<string>;
    messages: { id: string, content: string, channelId: string, channelName: string, time: number, link: string }[];
    imageHashes: Set<string>;
}

// Utility to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default {
    data: new SlashCommandBuilder()
        .setName('spamtespit')
        .setDescription('Sunucuyu veya belirli hedefleri profesyonelce tarar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Sadece belirli bir kullanıcıyı tara')
                .setRequired(false)
        )
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Sadece belirli bir kanalı tara')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('gun')
                .setDescription('Kaç gün geriye gidilsin? (Varsayılan: 365)')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Kanal başına taranacak mesaj sayısı (Varsayılan: 500)')
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        const guild = interaction.guild;
        if (!guild) return;

        // Options
        const targetUser = interaction.options.getUser('kullanici');
        const targetChannel = interaction.options.getChannel('kanal') as TextChannel;
        const days = interaction.options.getInteger('gun') || 365;
        const msgLimit = interaction.options.getInteger('limit') || 500;

        const TIME_LIMIT_MS = days * 24 * 60 * 60 * 1000;
        const NOW = Date.now();

        const suspects = new Collection<string, SuspectData>();

        let channelList: TextChannel[] = [];

        if (targetChannel) {
            if (!targetChannel.isTextBased() || targetChannel.isVoiceBased()) {
                await interaction.editReply('❌ Seçilen kanal metin tabanlı değil.');
                return;
            }
            channelList = [targetChannel];
        } else {
            const channels = await guild.channels.fetch();
            const textChannels = channels.filter(c => c && c.isTextBased() && !c.isVoiceBased()) as Collection<string, TextChannel>;
            channelList = Array.from(textChannels.values());
        }

        // Initial Status
        const statusEmbed = new EmbedBuilder()
            .setTitle('🛡️ Profesyonel Güvenlik Taraması')
            .setColor('Blue')
            .addFields(
                { name: '🎯 Hedef', value: targetChannel ? `#${targetChannel.name}` : `Tüm Kanallar (${channelList.length})`, inline: true },
                { name: '👤 Kullanıcı', value: targetUser ? `<@${targetUser.id}>` : 'Genel Tarama', inline: true },
                { name: '📅 Kapsam', value: `${days} Gün / ${msgLimit} Mesaj`, inline: true }
            )
            .setDescription('⏳ Veriler analiz ediliyor, lütfen bekleyin...')
            .setFooter({ text: 'Güvenlik Protokolü v2.1' })
            .setTimestamp();

        const statusMsg = await interaction.editReply({ embeds: [statusEmbed] });

        let scannedMessagesCount = 0;

        // --- SCANNING ---
        for (let i = 0; i < channelList.length; i++) {
            const channel = channelList[i];

            // Progress Update
            if (channelList.length === 1 || i % 5 === 0 || i === channelList.length - 1) {
                statusEmbed.setDescription(
                    `🔄 **Analiz Durumu**\n` +
                    `📂 **Kanal:** ${channel.name} (${i + 1}/${channelList.length})\n` +
                    `📨 **İncelenen Mesaj:** ${scannedMessagesCount}\n` +
                    `⚠️ **Tespit Edilen Risk:** ${suspects.size}`
                );
                await statusMsg.edit({ embeds: [statusEmbed] }); // Edit specific msg object
            }

            let lastId: string | undefined = undefined;
            let channelMsgCount = 0;
            let keepFetching = true;

            while (keepFetching && channelMsgCount < msgLimit) {
                try {
                    const fetchOptions: any = { limit: 100 };
                    if (lastId) fetchOptions.before = lastId;
                    const messages = (await channel.messages.fetch(fetchOptions)) as unknown as Collection<string, Message>;

                    if (messages.size === 0) {
                        keepFetching = false;
                        break;
                    }

                    for (const msg of messages.values()) {
                        lastId = msg.id;
                        channelMsgCount++;
                        scannedMessagesCount++;

                        if (NOW - msg.createdTimestamp > TIME_LIMIT_MS) {
                            keepFetching = false;
                            continue;
                        }

                        if (targetUser && msg.author.id !== targetUser.id) continue;
                        if (msg.author.bot) continue;

                        if (!targetUser && msg.author.id === guild.ownerId) continue;

                        const isLikelyBotCommand = /^[\!\$\+\-\.\?\/]/.test(msg.content);

                        const userId = msg.author.id;
                        if (!suspects.has(userId)) {
                            suspects.set(userId, { score: 0, reasons: new Set(), messages: [], imageHashes: new Set() });
                        }
                        const currentSuspect = suspects.get(userId)!;

                        // 0. NEW CHECKS (Vertical Bars, Mass Mentions)
                        if (SPAM_PATTERNS.VERTICAL_BARS.test(msg.content)) {
                            currentSuspect.score += 20; // High score
                            currentSuspect.reasons.add('Zararlı İçerik (Vertical Bars)');
                        }

                        if (SPAM_PATTERNS.MASS_MENTION.test(msg.content)) {
                            currentSuspect.score += 15;
                            currentSuspect.reasons.add('İzinsiz Toplu Etiket (@everyone/@here)');
                        }

                        // 1. Keywords
                        const contentLower = msg.content.toLowerCase();
                        for (const keyword of SUSPICIOUS_KEYWORDS) {
                            if (contentLower.includes(keyword)) {
                                currentSuspect.score += 5;
                                currentSuspect.reasons.add(`Yasaklı: ${keyword}`);
                            }
                        }

                        // 2. Image Spam
                        if (msg.attachments.size > 0) {
                            msg.attachments.forEach((att: Attachment) => {
                                const hash = `${att.size}-${att.name?.substring(0, 5)}`;
                                if (currentSuspect.imageHashes.has(hash)) {
                                    currentSuspect.score += 5;
                                    currentSuspect.reasons.add('Tekrarlanan Resim');
                                } else {
                                    currentSuspect.imageHashes.add(hash);
                                }
                            });
                        }

                        // 3. Link Flooding
                        if (/(https?:\/\/[^\s]+)/g.test(msg.content)) {
                            currentSuspect.reasons.add('Link Paylaşımı');
                            // Mark this message as a link message in data? For smart example picking
                        }

                        currentSuspect.messages.push({
                            id: msg.id,
                            content: msg.content,
                            channelId: channel.id,
                            channelName: channel.name,
                            time: msg.createdTimestamp,
                            link: msg.url
                        });
                    }
                    await sleep(100);

                } catch (e) {
                    keepFetching = false;
                }
            }
        }

        // --- POST PROCESSING & FILTERING ---
        suspects.forEach((data, userId) => {
            const msgs = data.messages;
            const uniqueContent = new Set(msgs.map(m => m.content));
            const isBotSpamLikely = msgs.every(m => /^[\!\$\+\-\.\?\/]/.test(m.content));

            if (!isBotSpamLikely && msgs.length > 5 && uniqueContent.size <= 2) {
                data.score += 20;
                data.reasons.add('Sürekli Aynı Mesaj');
            }

            const msgChannels = new Set(msgs.map(m => m.channelName));
            if (msgChannels.size > 3 && msgs.length > 5) {
                data.score += 15;
                data.reasons.add('Çoklu Kanal Spamı');
            }

            if (!isBotSpamLikely && msgs.length >= 5) {
                msgs.sort((a, b) => a.time - b.time);
                for (let i = 0; i < msgs.length - 4; i++) {
                    if (msgs[i + 4].time - msgs[i].time < 10000) {
                        data.score += 15;
                        data.reasons.add('Flood (Hızlı Mesaj)');
                        break;
                    }
                }
            }
        });

        // Filter and Sort
        let displayedSuspects = suspects;
        if (!targetUser) {
            displayedSuspects = suspects.filter(s => s.score >= 10);
        }

        displayedSuspects.sort((a, b) => b.score - a.score);

        // --- FINAL REPORT ---
        const resultEmbed = new EmbedBuilder()
            .setTitle('🛡️ Güvenlik Tarama Raporu')
            .setFooter({ text: 'Marple • Gelişmiş Tehdit Analizi' })
            .setTimestamp();

        const components: any[] = [];

        if (displayedSuspects.size === 0) {
            resultEmbed.setColor('Green')
                .setDescription(`✅ **Sistem Temiz**\n\n🔎 **${scannedMessagesCount}** mesaj tarandı.\n🛡️ Herhangi bir tehdit unsuru bulunamadı.`);
        } else {
            resultEmbed.setColor(targetUser ? 'Orange' : 'Red')
                .setDescription(`⚠️ **${displayedSuspects.size} Potansiyel Tehdit Tespit Edildi**\n\n🔎 Toplam **${scannedMessagesCount}** mesaj analiz edildi.`);

            let fieldCount = 0;
            const topSuspectUserId = displayedSuspects.firstKey()!;
            const topSuspectData = displayedSuspects.first()!;

            displayedSuspects.forEach((data, userId) => {
                if (fieldCount >= 6) return; // Reduce to 6 to allow more vertical space for details

                const topReasons = Array.from(data.reasons);
                const reasonStr = topReasons.join(', ') || 'Manuel İnceleme';

                // --- Smart Example Selection ---
                // Try to find an example matching the most critical reason
                let smartExample = '';

                if (topReasons.some(r => r.includes('Link'))) {
                    const linkMsg = data.messages.find(m => /(https?:\/\/[^\s]+)/g.test(m.content));
                    if (linkMsg) smartExample = `🔗 Link: ${linkMsg.content}`;
                } else if (topReasons.some(r => r.includes('Yasaklı'))) {
                    const badMsg = data.messages.find(m => SUSPICIOUS_KEYWORDS.some(k => m.content.toLowerCase().includes(k)));
                    if (badMsg) smartExample = `🚫 Yasaklı: ${badMsg.content}`;
                } else if (topReasons.some(r => r.includes('Resim'))) {
                    smartExample = '🖼️ [Görsel İçerik Tekrarı]';
                } else {
                    // Default to first 'real' content
                    const msg = data.messages.find(m => m.content.length > 1) || data.messages[0];
                    smartExample = msg ? (msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : '')) : '[İçerik Yok]';
                }

                // Link Preview (Last 3 risk messages or distinct channels)
                const distinctChannels = new Set(data.messages.map(m => m.channelName)).size;
                const linkList = data.messages.slice(-3).map((m, idx) => `[Mesaj ${idx + 1}](${m.link})`).join(' • ');

                resultEmbed.addFields({
                    name: `🔴 SKOR: ${data.score} | <@${userId}>`,
                    value: `> **Sebep:** ${reasonStr}\n> **Yayılım:** ${distinctChannels} Kanal | ${data.messages.length} Mesaj\n> **Mesajlar:** ${linkList}\n> **Örnek:** \`${smartExample.replace(/`/g, '')}\``
                });
                fieldCount++;
            });

            // Action Button
            if ((topSuspectData.score >= 20 || targetUser) && suspects.size > 0) {
                const punishBtn = new ButtonBuilder()
                    .setCustomId(`punish_${topSuspectUserId}`)
                    .setLabel(`🚨 <@${topSuspectUserId}> HESABINI TEMİZLE (3 GÜN)`)
                    .setStyle(ButtonStyle.Danger);

                const row = new ActionRowBuilder().addComponents(punishBtn);
                components.push(row);
            }
        }

        const msg = await interaction.editReply({ embeds: [resultEmbed], components });

        if (components.length > 0) {
            const filter = (i: ButtonInteraction) => i.customId.startsWith('punish_') && i.user.id === interaction.user.id;
            // INCREASED TIMEOUT to 15 Minutes
            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter, time: 900000 });

            collector.on('collect', async i => {
                // Defer immediately to prevent "Interaction failed"
                await i.deferReply();

                const targetId = i.customId.split('_')[1];
                const suspect = suspects.get(targetId);

                if (!suspect) {
                    await i.editReply('❌ Veri zaman aşımına uğradı veya bulunamadı.');
                    return;
                }

                try {
                    const member = await guild.members.fetch(targetId);

                    if (member.id === guild.ownerId) {
                        await i.editReply('❌ Sunucu sahibine işlem yapılamaz!');
                        return;
                    }

                    if (member && member.moderatable) {
                        await member.timeout(3 * 24 * 60 * 60 * 1000, `Marple Güvenlik: Skor ${suspect.score}`);
                    }

                    let deleted = 0;
                    // Only delete the messages found in the scan
                    for (const m of suspect.messages) {
                        try {
                            const ch = await guild.channels.fetch(m.channelId) as TextChannel;
                            if (ch) {
                                const dMsg = await ch.messages.fetch(m.id).catch(() => null);
                                if (dMsg) { await dMsg.delete(); deleted++; await sleep(250); }
                            }
                        } catch { }
                    }

                    await i.editReply({ content: `✅ **Tehdit Bertaraf Edildi**\n👤 <@${targetId}> 3 gün süreyle izole edildi.\n🧹 **${deleted}** adet zararlı mesaj temizlendi.` });

                    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder().setCustomId('done').setLabel('İşlem Tamamlandı').setStyle(ButtonStyle.Success).setDisabled(true)
                    );

                    // Update original message to remove buttons
                    await interaction.editReply({ components: [disabledRow] });

                } catch (e) {
                    console.error(e);
                    await i.editReply(`❌ Bir hata oluştu: ${e}`);
                }
            });
        }
    }
};
