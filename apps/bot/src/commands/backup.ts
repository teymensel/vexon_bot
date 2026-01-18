
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { backupDb } from '../utils/backupDb';

export default {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Sunucu yedeği alır veya listeler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('al').setDescription('Yeni bir yedek alır.'))
        .addSubcommand(sub => sub.setName('liste').setDescription('Mevcut yedekleri listeler.')),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 4) return interaction.reply({ content: '⛔ Sadece Bot 4.', ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const guild = interaction.guild!;

        if (sub === 'al') {
            await interaction.deferReply();

            // Capture Config
            const roles = guild.roles.cache.map(r => ({
                name: r.name,
                color: r.hexColor,
                permissions: r.permissions.bitfield.toString()
            }));

            const channels = guild.channels.cache.map(c => ({
                name: c.name,
                type: c.type
            }));

            const backup = {
                timestamp: Date.now(),
                authorId: interaction.user.id,
                roles,
                channels
            };

            backupDb.addBackup(guild.id, backup);

            const embed = new EmbedBuilder()
                .setTitle('📦 Yedek Alındı')
                .setDescription(`
✅ **Başarılı!** Sunucu yapılandırması kaydedildi.
📂 **Roller:** ${roles.length}
📂 **Kanallar:** ${channels.length}
📅 **Tarih:** <t:${Math.floor(Date.now() / 1000)}:f>
                `)
                .setColor('Green');

            await interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'liste') {
            const backups = backupDb.getBackups(guild.id);
            if (backups.length === 0) return interaction.reply('ℹ️ Hiç yedek bulunamadı.');

            const desc = backups.map((b, i) => {
                return `**${i + 1}.** <t:${Math.floor(b.timestamp / 1000)}:R> - ${b.channels.length} Kanal, ${b.roles.length} Rol (Alan: <@${b.authorId}>)`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle('📂 Yedek Listesi')
                .setDescription(desc)
                .setColor('Blue');

            await interaction.reply({ embeds: [embed] });
        }
    }
};
