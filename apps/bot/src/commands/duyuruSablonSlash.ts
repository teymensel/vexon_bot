
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { AnnouncementDb } from '../utils/announcementDb';

export default {
    data: new SlashCommandBuilder()
        .setName('duyurusablon')
        .setDescription('Duyuru şablonlarını yönetir.')
        .addSubcommand(sub =>
            sub.setName('ekle')
                .setDescription('Yeni şablon ekler')
                .addStringOption(opt => opt.setName('isim').setDescription('Şablon adı').setRequired(true))
                .addStringOption(opt => opt.setName('icerik').setDescription('Şablon içeriği').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('sil')
                .setDescription('Şablon siler')
                .addStringOption(opt => opt.setName('isim').setDescription('Şablon adı').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('liste')
                .setDescription('Şablonları listeler'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 2) return interaction.reply({ content: '⛔ Sadece Bot 2.', ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId || '';

        if (subcommand === 'ekle') {
            const name = interaction.options.getString('isim') || '';
            const content = interaction.options.getString('icerik') || '';

            AnnouncementDb.addTemplate(guildId, name, content);
            await interaction.reply({ content: `✅ **${name}** şablonu kaydedildi.`, ephemeral: true });

        } else if (subcommand === 'sil') {
            const name = interaction.options.getString('isim') || '';
            AnnouncementDb.removeTemplate(guildId, name);
            await interaction.reply({ content: `🗑️ **${name}** şablonu silindi.`, ephemeral: true });

        } else if (subcommand === 'liste') {
            const config = AnnouncementDb.get(guildId);
            const templates = Object.keys(config.templates);

            if (templates.length === 0) {
                return interaction.reply({ content: '📂 Kayıtlı şablon yok.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('📋 Duyuru Şablonları')
                .setDescription(templates.map(t => `• **${t}**`).join('\n'));

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
