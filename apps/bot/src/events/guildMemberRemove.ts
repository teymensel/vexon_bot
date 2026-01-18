
import { Events, GuildMember, TextChannel, EmbedBuilder } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';

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
