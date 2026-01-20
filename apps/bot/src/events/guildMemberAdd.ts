
import { Events, GuildMember, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';
import { RegisterConfig } from '../commands/registerConfig'; // Type import
import { InviteDb } from '../utils/inviteDb';
import { inviteManager } from '../utils/inviteManager';

const configDb = new JsonDb<RegisterConfig>('registerConfig.json', {});

interface WelcomeConfig {
    [guildId: string]: {
        welcomeChannelId?: string;
        goodbyeChannelId?: string;
        welcomeMessage?: string;
        enabled: boolean;
    };
}

const db = new JsonDb<WelcomeConfig>('welcomeConfig.json', {});

export default {
    name: Events.GuildMemberAdd,
    async execute(member: GuildMember) {
        if (member.user.bot) return; // Ignore Bots

        const client = member.client as any;
        if (client.botIndex !== 3) return; // Assistant Bot

        const welConfig = db.read()[member.guild.id];
        const regConfig = configDb.read()[member.guild.id];

        // Auto Role (Unregister Role)
        if (regConfig && regConfig.enabled && regConfig.autoRole && regConfig.unregisterRoleIds && regConfig.unregisterRoleIds.length > 0) {
            await member.roles.add(regConfig.unregisterRoleIds).catch(err => console.error(`Failed to assign unregister role in ${member.guild.name}:`, err));
        }

        let targetChannelId: string | undefined;

        // Priority 1: Register Channel (if Register System Enabled)
        if (regConfig && regConfig.enabled && regConfig.registerChannelId) {
            targetChannelId = regConfig.registerChannelId;
        }
        // Priority 2: Welcome Channel (Legacy / Fallback)
        else if (welConfig && welConfig.enabled && welConfig.welcomeChannelId) {
            targetChannelId = welConfig.welcomeChannelId;
        }

        if (!targetChannelId && !InviteDb.read()[member.guild.id]?.enabled) return;

        // --- INVITE LOGGER LOGIC ---
        const invConfig = InviteDb.read()[member.guild.id];
        if (invConfig && invConfig.enabled && invConfig.channelId) {
            try {
                const inviteData = await inviteManager.findInviter(member);
                const logChannel = member.guild.channels.cache.get(invConfig.channelId) as TextChannel;

                if (logChannel) {
                    const inviter = inviteData.inviter;
                    const code = inviteData.code;
                    let inviteSource = 'Bilinmiyor';

                    if (inviteData.isVanity) inviteSource = 'Özel URL (Vanity)';
                    else if (inviter) inviteSource = `<@${inviter.id}>`;
                    else if (code) inviteSource = `Kod: ${code}`;

                    // Update DB with Inviter Map for Leave Logs
                    InviteDb.update(db => {
                        if (!db[member.guild.id]) db[member.guild.id] = { enabled: true, channelId: invConfig.channelId, inviterMap: {} };
                        db[member.guild.id].inviterMap[member.id] = {
                            inviterId: inviter?.id || null,
                            code: code || null
                        };
                    });

                    // Inviter Invite Count
                    let inviteCount = 0;
                    if (inviter) {
                        const invites = await member.guild.invites.fetch().catch(() => new Collection());
                        // Simple count of all codes by this inviter
                        inviteCount = invites.filter((i: any) => i.inviter?.id === inviter.id).reduce((acc: number, val: any) => acc + (val.uses || 0), 0);
                    }

                    // Format Date
                    const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                    const logEmbed = new EmbedBuilder()
                        .setColor('#00ffaa') // Green/Cyan
                        .setAuthor({ name: 'InviteLogger', iconURL: member.client.user.displayAvatarURL() })
                        .setTitle(`New member on ${member.guild.name}!`)
                        .setDescription(`${member} **${inviteData.isVanity ? 'Özel davet' : 'Davet'}** kullanarak sunucuya katıldı!`)
                        .setThumbnail(member.user.displayAvatarURL());

                    if (inviter) {
                        logEmbed.setDescription(`${member} joined using **${code}**. Invited by ${inviter} (**${inviteCount}** invites).`);
                        logEmbed.setFooter({ text: `${dateStr}`, iconURL: inviter.displayAvatarURL() });
                    } else if (inviteData.isVanity) {
                        logEmbed.setDescription(`${member} **Özel davet (Vanity: ${code})** kullanarak sunucuya katıldı!`);
                        logEmbed.setFooter({ text: `${dateStr}` });
                        // If code is null, fallback
                        if (!code) logEmbed.setDescription(`${member} **Özel davet (Vanity)** kullanarak sunucuya katıldı!`);
                    } else {
                        logEmbed.setDescription(`${member} katıldı. Davet eden bulunamadı.`);
                        logEmbed.setFooter({ text: `${dateStr}` });
                    }

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (e) {
                console.error('Invite Log Error:', e);
            }
        }

        const channel = member.guild.channels.cache.get(targetChannelId!) as TextChannel;
        if (!channel) return;

        try {
            const now = Date.now();
            const created = member.user.createdTimestamp;
            const accountAgeDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

            // Reliability Check (< 7 days suspect)
            const isReliable = accountAgeDays >= 7;
            const relStatusDisplay = isReliable ? 'Güvenilir!' : 'Şüpheli!';
            const relIcon = isReliable ? '☑️' : '⚠️';

            const embed = new EmbedBuilder()
                .setColor('#000000') // Black background like Nors
                .setAuthor({
                    name: `Yeni Bir Kullanıcı Katıldı, 👋 ${member.user.username}!`,
                    iconURL: member.guild.iconURL() || undefined
                })
                .setDescription(`
**Sunucumuza hoş geldin ${member}**

🔹 **Seninle birlikte ${member.guild.memberCount} kişiyiz.**

🧩 **Hesap oluşturulma tarihi:** <t:${Math.floor(created / 1000)}:f>
${relIcon} **Güvenilirlik durumu:** ${relStatusDisplay}
`)
                .setThumbnail(member.user.displayAvatarURL({ forceStatic: false, size: 256 }))
                .setFooter({ text: 'Valorica Asistan', iconURL: client.user.displayAvatarURL() });

            // Button with Target ID in customId
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`register_button_${member.id}`)
                        .setLabel('Normal Kayıt')
                        .setEmoji('🆔')
                        .setStyle(ButtonStyle.Primary)
                );

            // Welcome Text Logic
            let contentText = `${member} sunucuya giriş yaptı.`;
            if (regConfig.welcomeTextContent) {
                contentText = regConfig.welcomeTextContent
                    .replace(/{kullanıcı}/g, member.toString())
                    .replace(/{sunucu}/g, member.guild.name)
                    .replace(/{üyesayısı}/g, member.guild.memberCount.toString());

                if (contentText.includes('{yetkili}')) {
                    const staffMentions = (regConfig.staffRoleIds || []).map((id: string) => `<@&${id}>`).join(' ');
                    contentText = contentText.replace(/{yetkili}/g, staffMentions);
                }
            }

            await channel.send({ content: contentText, embeds: [embed], components: [row] });
        } catch (error) {
            console.error(`Error sending welcome message in ${member.guild.name}:`, error);
        }
    }
};
