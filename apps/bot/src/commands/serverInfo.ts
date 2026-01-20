
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ChannelType } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('sunucu')
        .setDescription('Sunucu hakkında detaylı bilgi gösterir.'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;
        const guild = interaction.guild;

        // Fetch owner if not cached
        const owner = await guild.fetchOwner().catch(() => null);

        // Calculations
        const totalMembers = guild.memberCount;
        const online = guild.members.cache.filter(m => m.presence?.status !== 'offline').size; // Approx
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const humans = totalMembers - bots;

        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const roles = guild.roles.cache.size;
        const emojis = guild.emojis.cache.size;
        const boosts = guild.premiumSubscriptionCount || 0;
        const boostLevel = guild.premiumTier;

        // Date Formatting
        const createdDate = `<t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`;

        const embed = new EmbedBuilder()
            .setColor('#000000')
            .setAuthor({ name: `${guild.name} - Sunucu Bilgileri`, iconURL: guild.iconURL() || undefined })
            .setThumbnail(guild.iconURL() || null)
            .addFields(
                { name: '👑 Sunucu Sahibi', value: owner ? `${owner.user.tag} (<@${owner.id}>)` : 'Bilinmiyor', inline: true },
                { name: '📅 Kuruluş Tarihi', value: createdDate, inline: true },
                { name: '🆔 Sunucu ID', value: guild.id, inline: true },

                { name: '👥 Üyeler', value: `Toplam: **${totalMembers}**\nİnsan: **${humans}**\nBot: **${bots}**`, inline: true },
                { name: '💬 Kanallar', value: `Toplam: **${textChannels + voiceChannels}**\nYazı: **${textChannels}**\nSes: **${voiceChannels}**\nKategori: **${categories}**`, inline: true },
                { name: '📊 Diğer İstatistikler', value: `Rol Sayısı: **${roles}**\nEmoji Sayısı: **${emojis}**\nBoost: **${boosts}** (Seviye ${boostLevel})`, inline: true }
            )
            .setFooter({ text: `Valorica Asistan • ${new Date().toLocaleDateString('tr-TR')}` });

        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL()!);
        }

        await interaction.reply({ embeds: [embed] });
    }
};
