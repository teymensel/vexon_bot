
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, Role, CategoryChannel } from 'discord.js';
import { TicketDb } from '../utils/ticketDb';

export default {
    data: new SlashCommandBuilder()
        .setName('ticket-config')
        .setDescription('Ticket sistemi ayarlarını yapılandırır (Sadece Bot 2).')
        .addRoleOption(option =>
            option.setName('yetkili-rol')
                .setDescription('Ticketları görebilecek yetkili rolü')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('kategori')
                .setDescription('Yeni ticketların açılacağı kategori')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;

        // Restriction: Only Bot 2
        if (client.botIndex !== 2) {
            return interaction.reply({ content: '⛔ Bu komut sadece **Bot 2 (Asistan)** tarafından kullanılabilir.', ephemeral: true });
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '⛔ Bu işlemi yapmak için **Yönetici** yetkisine sahip olmalısınız.', ephemeral: true });
        }

        const role = interaction.options.getRole('yetkili-rol') as Role;
        const category = interaction.options.getChannel('kategori') as CategoryChannel;

        if (!role && !category) {
            return interaction.reply({ content: '⚠️ En az bir ayar (Rol veya Kategori) seçmelisiniz.', ephemeral: true });
        }

        TicketDb.update(interaction.guildId!, (data) => {
            if (role) data.supportRoleId = role.id;
            if (category) data.category = category.id;
        });

        let response = '✅ **Ticket Ayarları Güncellendi:**\n';
        if (role) response += `👤 **Yetkili Rolü:** ${role}\n`;
        if (category) response += `📂 **Kategori:** ${category.name}\n`;

        await interaction.reply({ content: response, ephemeral: true });
    }
};
