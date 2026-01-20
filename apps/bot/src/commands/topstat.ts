import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { StatDb } from '../utils/statDb';

function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours}s ${minutes % 60}d`;
}

export default {
    data: new SlashCommandBuilder()
        .setName('topstat')
        .setDescription('Sunucu sıralamasını gösterir (Ses & Mesaj).'),

    async execute(interaction: ChatInputCommandInteraction) {
        const guild = interaction.guild!;
        const db = StatDb.read();
        const guildStats = db[guild.id] || {};

        if (Object.keys(guildStats).length === 0) {
            return interaction.reply({ content: 'ℹ️ Henüz veri yok.', ephemeral: true });
        }

        // Sort Top 10 Voice
        const topVoice = Object.entries(guildStats)
            .sort(([, a], [, b]) => b.totalVoiceMs - a.totalVoiceMs)
            .slice(0, 10);

        // Sort Top 10 Message
        const topMsg = Object.entries(guildStats)
            .sort(([, a], [, b]) => b.totalMessages - a.totalMessages)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setTitle(`🏆 ${guild.name} - En Aktif Üyeler`)
            .setColor('Gold')
            .setThumbnail(guild.iconURL());

        const voiceDesc = topVoice.map((entry, index) => {
            const [uid, stat] = entry;
            const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `${index + 1}.`));
            return `${medal} <@${uid}> \`${formatTime(stat.totalVoiceMs)}\``;
        }).join('\n') || 'Veri yok.';

        const msgDesc = topMsg.map((entry, index) => {
            const [uid, stat] = entry;
            const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `${index + 1}.`));
            return `${medal} <@${uid}> \`${stat.totalMessages} Mesaj\``;
        }).join('\n') || 'Veri yok.';

        embed.addFields(
            { name: '🎙️ En Çok Konuşanlar', value: voiceDesc, inline: true },
            { name: '💬 En Çok Mesaj Atanlar', value: msgDesc, inline: true }
        );

        await interaction.reply({ embeds: [embed] });
    }
};
