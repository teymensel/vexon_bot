import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { StatDb } from '../utils/statDb';

function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}s ${minutes % 60}d ${seconds % 60}sn`;
}

function createProgressBar(current: number, max: number, length: number = 10): string {
    const filled = Math.round((current / max) * length);
    const empty = length - filled;
    return '▮'.repeat(Math.max(0, filled)) + '▯'.repeat(Math.max(0, empty));
}

export default {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Kullanıcı istatistiklerini gösterir.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('İstatistiği gösterilecek kullanıcı (Opsiyonel)')),

    async execute(interaction: ChatInputCommandInteraction) {
        const guild = interaction.guild!;
        const targetUser = interaction.options.getUser('kullanici') || interaction.user;

        const db = StatDb.read();
        const guildStats = db[guild.id] || {};
        const userStat = guildStats[targetUser.id];

        if (!userStat) {
            return interaction.reply({ content: `❌ **${targetUser.tag}** için kayıtlı veri bulunamadı.`, ephemeral: true });
        }

        // Calculate Ranks (Simple)
        const allUsers = Object.values(guildStats);
        const rankVoice = allUsers.filter(u => u.totalVoiceMs > userStat.totalVoiceMs).length + 1;
        const rankMsg = allUsers.filter(u => u.totalMessages > userStat.totalMessages).length + 1;

        // Top Channel
        let topChannelId = '';
        let topChannelVal = 0;
        for (const [cid, stat] of Object.entries(userStat.channelStats)) {
            if (stat.messages + (stat.voiceMs / 1000) > topChannelVal) {
                topChannelVal = stat.messages + (stat.voiceMs / 1000);
                topChannelId = cid;
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#2b2d31') // Dark/Professional
            .setAuthor({ name: `${targetUser.tag} İstatistikleri`, iconURL: targetUser.displayAvatarURL() })
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .addFields(
                {
                    name: '🎙️ Ses İstatistiği',
                    value: `\`${formatTime(userStat.totalVoiceMs)}\`\n(Sıralama: #${rankVoice})`,
                    inline: true
                },
                {
                    name: '💬 Mesaj İstatistiği',
                    value: `\`${userStat.totalMessages} Mesaj\`\n(Sıralama: #${rankMsg})`,
                    inline: true
                },
                {
                    name: '🏆 En Aktif Kanal',
                    value: topChannelId ? `<#${topChannelId}>` : 'Veri Yok',
                    inline: false
                }
            )
            .setFooter({ text: 'Valorica Stat System', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        // Optional: Add visual bar if we defined "max" logic, but user wanted personal stats.

        await interaction.reply({ embeds: [embed] });
    }
};
