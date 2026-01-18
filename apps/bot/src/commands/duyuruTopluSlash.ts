
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, TextChannel, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('duyurutoplu')
        .setDescription('Birden fazla kanala aynı anda duyuru gönderir.')
        .addStringOption(opt => opt.setName('mesaj').setDescription('Duyuru mesajı').setRequired(true))
        // Discord Slash limited to 25 options. We can add 5 channels for simplicity.
        .addChannelOption(opt => opt.setName('kanal1').setDescription('Kanal 1').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addChannelOption(opt => opt.setName('kanal2').setDescription('Kanal 2').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('kanal3').setDescription('Kanal 3').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('kanal4').setDescription('Kanal 4').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('kanal5').setDescription('Kanal 5').addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 2) return interaction.reply({ content: '⛔ Sadece Bot 2.', ephemeral: true });

        const message = interaction.options.getString('mesaj') || '';

        const channels: TextChannel[] = [];
        for (let i = 1; i <= 5; i++) {
            const ch = interaction.options.getChannel(`kanal${i}`) as TextChannel;
            if (ch) channels.push(ch);
        }

        const embed = new EmbedBuilder()
            .setColor('#ED4245')
            .setDescription(message)
            .setTimestamp()
            .setFooter({ text: 'Toplu Duyuru', iconURL: interaction.guild?.iconURL() || undefined });

        await interaction.reply({ content: `📨 ${channels.length} kanala gönderiliyor...`, ephemeral: true });

        for (const channel of channels) {
            try {
                await channel.send({ embeds: [embed] });
            } catch (e) {
                console.error(`Failed to send to ${channel.name}`);
            }
        }

        await interaction.editReply(`✅ ${channels.length} kanala duyuru gönderildi.`);
    }
};
