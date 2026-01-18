
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
    name: Events.GuildMemberAdd,
    async execute(member: GuildMember) {
        const client = member.client as any;
        if (client.botIndex !== 2) return;

        const config = db.read()[member.guild.id];
        if (!config || !config.enabled || !config.welcomeChannelId) return;

        const channel = member.guild.channels.cache.get(config.welcomeChannelId) as TextChannel;
        if (!channel) return;

        // Determine if there is a custom message or use default
        // For now using a rich embed similar to user request

        try {
            const now = Date.now();
            const created = member.user.createdTimestamp;
            const accountAgeDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: '👋 Üye Katıldı', iconURL: member.guild.iconURL() || undefined })
                .setDescription(`
**Hoş Geldin ${member}!** 👋
**${member.guild.name}** sunucusuna hoş geldin!

> 🎉 **Aramıza Katılman Harika!**
> Seninle birlikte **${member.guild.memberCount}** kişi olduk. 🚀

📜 **Kuralları okumayı unutma!**
                `)
                .addFields(
                    { name: '👤 Kullanıcı', value: `${member.user.tag}`, inline: true },
                    { name: '🆔 ID', value: `${member.id}`, inline: true },
                    { name: '📅 Hesap Yaşı', value: `**${accountAgeDays}** gün`, inline: true },

                    { name: '📊 Üye Sayısı', value: `${member.guild.memberCount}`, inline: true },
                    { name: '🤖 Bot mu?', value: member.user.bot ? 'Evet' : 'Hayır', inline: true },
                    { name: '🗓️ Oluşturma', value: `<t:${Math.floor(created / 1000)}:R>`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL({ forceStatic: false, size: 256 }))
                .setFooter({ text: `Üye ID: ${member.id}`, iconURL: member.user.displayAvatarURL() })
                .setTimestamp();

            await channel.send({ content: `Hoş geldin ${member}!`, embeds: [embed] });
        } catch (error) {
            console.error(`Error sending welcome message in ${member.guild.name}:`, error);
        }
    }
};
