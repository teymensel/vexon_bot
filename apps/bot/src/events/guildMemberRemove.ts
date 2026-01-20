
import { Events, GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';
import { InviteDb } from '../utils/inviteDb';

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
    name: Events.GuildMemberRemove,
    async execute(member: GuildMember) {
        const client = member.client as any;
        if (client.botIndex !== 2) return;

        // --- INVITE LOG LEAVE ---
        const invConfig = InviteDb.read()[member.guild.id];
        if (invConfig && invConfig.enabled && invConfig.channelId) {
            try {
                const logChannel = member.guild.channels.cache.get(invConfig.channelId) as TextChannel;
                if (logChannel) {
                    const record = invConfig.inviterMap?.[member.id];

                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setAuthor({ name: 'InviteLogger', iconURL: 'https://cdn.discordapp.com/emojis/1155926588261777468.png' })
                        .setTitle(`Member left ${member.guild.name}!`)
                        .setThumbnail(member.user.displayAvatarURL());

                    const dateStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    embed.setFooter({ text: `${dateStr}` });

                    if (record && record.inviterId) {
                        const inviter = await client.users.fetch(record.inviterId).catch(() => null);
                        const inviterName = inviter ? inviter.tag : 'Bilinmeyen Kullanıcı';
                        embed.setDescription(`${member.user.tag} Ayrıldı. **${inviterName}** tarafından davet edildi.`);
                    } else if (record && record.code === member.guild.vanityURLCode) {
                        embed.setDescription(`${member.user.tag} Bir makyaj daveti (Vanity) kullanarak katılmıştı.`);
                    } else {
                        embed.setDescription(`${member.user.tag} ayrıldı fakat onu davet edenleri kaydetmedim.`);
                    }

                    await logChannel.send({ embeds: [embed] });
                }
            } catch (e) { console.error('Invite Leave Log Error:', e); }
        }

        const config = db.read()[member.guild.id];
        if (!config || !config.enabled || !config.goodbyeChannelId) return;

        const channel = member.guild.channels.cache.get(config.goodbyeChannelId) as TextChannel;
        if (!channel) return;

        try {
            const joined = member.joinedTimestamp;
            const now = Date.now();
            const stayedDays = joined ? Math.floor((now - joined) / (1000 * 60 * 60 * 24)) : '?';

            const embed = new EmbedBuilder()
                .setColor('#ff4d4d')
                .setAuthor({ name: '🚶 Üye Ayrıldı', iconURL: member.guild.iconURL() || undefined })
                .setDescription(`
**${member.user.tag}** sunucudan ayrıldı.
🥀 Umarız tekrar görüşürüz.
                `)
                .addFields(
                    { name: '👤 Kullanıcı', value: `${member.user.tag}`, inline: true },
                    { name: '🆔 ID', value: `${member.id}`, inline: true },
                    { name: '⏳ Sunucuda Kaldı', value: `**${stayedDays}** gün`, inline: true },

                    { name: '📊 Güncel Üye Sayısı', value: `${member.guild.memberCount}`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL({ forceStatic: false, size: 256 }))
                .setFooter({ text: `Üye ID: ${member.id}`, iconURL: member.user.displayAvatarURL() })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(`Error sending goodbye message in ${member.guild.name}:`, error);
        }
    }
};
