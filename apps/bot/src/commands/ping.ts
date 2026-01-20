import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, version as djsVersion } from 'discord.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

function getFolderSize(dirPath: string): number {
    let size = 0;
    if (!fs.existsSync(dirPath)) return 0;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                size += getFolderSize(filePath);
            }
        } else {
            size += stats.size;
        }
    }
    return size;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Detaylı durum ve gecikme raporu.'),
    async execute(interaction: CommandInteraction) {
        const sent = await interaction.deferReply({ fetchReply: true });

        const timestamp = sent.createdTimestamp;
        const latency = timestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        // RAM
        const memoryUsage = process.memoryUsage().rss;

        // Disk (Project Size excluding node_modules)
        // Calculating root might be slow if many files. Let's calculate 'apps/bot' or just data.
        // For speed, let's just do './data' and './src'.
        // Or if user wants "Disk Usage" of the SERVER (Free Space), that's different.
        // Given "2gb", likely project size (if including videos/images) or just random text in user prompt.
        // Let's assume Project Size.
        const rootDir = path.resolve(__dirname, '../../'); // apps/bot/
        const trashSize = getFolderSize(rootDir);

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(latency < 200 ? 'Green' : (latency < 500 ? 'Yellow' : 'Red'))
            .addFields(
                { name: '📡 WebSocket', value: `${apiLatency}ms`, inline: true },
                { name: '⏱️ Roundtrip', value: `${latency}ms`, inline: true },
                { name: '💾 RAM Kullanımı', value: formatBytes(memoryUsage), inline: true },
                { name: '💿 Disk Kullanımı', value: formatBytes(trashSize), inline: true }
            )
            .setFooter({ text: `Bot: ${interaction.client.user?.username} • OS: ${os.type()} ${os.release()}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
