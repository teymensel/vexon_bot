
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Botun ağzından mesaj yazar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(o => o.setName('mesaj').setDescription('Yazılacak mesaj').setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const message = interaction.options.getString('mesaj');

        // Send message to the channel
        const channel = interaction.channel as TextChannel;
        if (channel) {
            await channel.send({
                content: message || '.',
                allowedMentions: { parse: [] }
            });
        }

        // Reply ephemeral to confirm
        await interaction.reply({ content: '✅ Mesaj gönderildi.', ephemeral: true });
    }
};
