import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Botun komutlarını listeler.'),
    async execute(interaction: CommandInteraction) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('Bot Komutları')
            .setDescription('İşte kullanabileceğin komutların listesi:')
            .addFields(
                { name: '/ping', value: 'Botun gecikme süresini (ping) gösterir.', inline: true },
                { name: '/help', value: 'Bu yardım mesajını gösterir.', inline: true },
            )
            .setFooter({ text: 'Profesyonel Discord Botu' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
