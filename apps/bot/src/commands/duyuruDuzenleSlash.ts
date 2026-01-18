
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('duyuruduzenle')
        .setDescription('Botun attığı bir duyuruyu düzenler.')
        .addStringOption(opt => opt.setName('mesaj_id').setDescription('Düzenlenecek mesajın ID\'si').setRequired(true))
        .addStringOption(opt => opt.setName('yeni_icerik').setDescription('Yeni mesaj içeriği').setRequired(true))
        .addChannelOption(opt => opt.setName('kanal').setDescription('Mesajın bulunduğu kanal').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 2) return interaction.reply({ content: '⛔ Sadece Bot 2.', ephemeral: true });

        const messageId = interaction.options.getString('mesaj_id');
        const newContent = interaction.options.getString('yeni_icerik');
        const channel = interaction.options.getChannel('kanal') as TextChannel;

        if (!channel || !messageId || !newContent) return;

        try {
            const message = await channel.messages.fetch(messageId);
            if (message.author.id !== client.user.id) {
                return interaction.reply({ content: '⛔ Bu mesaj benim değil! Sadece kendi mesajlarımı düzenleyebilirim.', ephemeral: true });
            }

            // Edit content keeping embeds if any? Usually simple edit replaces content.
            // If message has embeds, we might want to keep them.
            // For simplicity, we assume text edit. If it was an embed announcement, `edit` with string modifies content property only.
            await message.edit(newContent);

            await interaction.reply({ content: '✅ Duyuru düzenlendi.', ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ Mesaj bulunamadı veya düzenlenemedi.', ephemeral: true });
        }
    }
};
