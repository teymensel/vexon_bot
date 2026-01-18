
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import { AnnouncementDb } from '../utils/announcementDb';

export default {
    data: new SlashCommandBuilder()
        .setName('duyurubuton')
        .setDescription('Butonlu duyuru gönderir.')
        .addStringOption(option =>
            option.setName('baslik')
                .setDescription('Duyuru başlığı')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Duyuru içeriği')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('buton_yazisi')
                .setDescription('Butonun üzerinde yazacak metin')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('buton_linki')
                .setDescription('Butona tıklayınca gidilecek adres (URL)')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Opsiyonel: Farklı bir kanala gönder (Seçilmezse varsayılan kullanılır)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 2) return interaction.reply({ content: '⛔ Sadece Bot 2.', ephemeral: true });

        const title = interaction.options.getString('baslik') || '';
        const message = interaction.options.getString('mesaj') || '';
        const btnLabel = interaction.options.getString('buton_yazisi') || 'Tıkla';
        const btnUrl = interaction.options.getString('buton_linki') || '';

        let targetChannel = interaction.options.getChannel('kanal') as TextChannel;

        // Fallback to default channel
        if (!targetChannel) {
            const config = AnnouncementDb.get(interaction.guildId || '');
            if (config.defaultChannelId) {
                targetChannel = interaction.guild?.channels.cache.get(config.defaultChannelId) as TextChannel;
            }
        }

        if (!targetChannel) {
            return interaction.reply({ content: '⛔ Duyuru kanalı belirtilmedi! Lütfen kanalı seçin veya `/duyurukanal` ile varsayılanı ayarlayın.', ephemeral: true });
        }

        // Validate URL
        try {
            new URL(btnUrl);
        } catch (_) {
            return interaction.reply({ content: '⛔ Geçersiz URL formatı! (http/https ile başlamalı)', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle(title)
            .setDescription(message)
            .setTimestamp()
            .setFooter({ text: 'Duyuru Sistemi', iconURL: interaction.guild?.iconURL() || undefined });

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(btnLabel)
                    .setStyle(ButtonStyle.Link)
                    .setURL(btnUrl)
            );

        await targetChannel.send({ embeds: [embed], components: [row] });

        await interaction.reply({ content: `✅ Duyuru başarıyla ${targetChannel} kanalına gönderildi.`, ephemeral: true });
    }
};
