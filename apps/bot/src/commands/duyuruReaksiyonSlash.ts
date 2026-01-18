
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, TextChannel } from 'discord.js';
import { AnnouncementDb } from '../utils/announcementDb';

export default {
    data: new SlashCommandBuilder()
        .setName('duyurureaksiyon')
        .setDescription('Emojili/Reaksiyonlu duyuru gönderir.')
        .addStringOption(option =>
            option.setName('baslik')
                .setDescription('Duyuru başlığı')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Duyuru içeriği')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('emojiler')
                .setDescription('Boşlukla ayrılmış emojiler (Örn: ✅ ❌)')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Opsiyonel: Farklı bir kanala gönder')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 2) return interaction.reply({ content: '⛔ Sadece Bot 2.', ephemeral: true });

        const title = interaction.options.getString('baslik') || '';
        const message = interaction.options.getString('mesaj') || '';
        const emojisStr = interaction.options.getString('emojiler') || '';

        // Simple emoji splitter by space
        const emojis = emojisStr.split(' ').filter(e => e.trim().length > 0);

        let targetChannel = interaction.options.getChannel('kanal') as TextChannel;

        if (!targetChannel) {
            const config = AnnouncementDb.get(interaction.guildId || '');
            if (config.defaultChannelId) {
                targetChannel = interaction.guild?.channels.cache.get(config.defaultChannelId) as TextChannel;
            }
        }

        if (!targetChannel) {
            return interaction.reply({ content: '⛔ Duyuru kanalı bulunamadı.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle(title)
            .setDescription(message)
            .setTimestamp();

        const sentMsg = await targetChannel.send({ embeds: [embed] });

        // Add Reactions
        for (const emoji of emojis) {
            try {
                await sentMsg.react(emoji);
            } catch (error) {
                console.error(`Failed to react with ${emoji}:`, error);
                // Continue even if one fails
            }
        }

        await interaction.reply({ content: `✅ Duyuru ${targetChannel} kanalına gönderildi ve emojiler eklendi.`, ephemeral: true });
    }
};
