
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType } from 'discord.js';
import { AnnouncementDb } from '../utils/announcementDb';

export default {
    data: new SlashCommandBuilder()
        .setName('duyurukanal')
        .setDescription('Varsayılan duyuru kanalını ayarlar.')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Duyuruların yapılacağı kanal')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 2) {
            return interaction.reply({ content: '⛔ Bu komut sadece **Valorica Asistan** (Bot 2) içindir.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('kanal');
        if (!channel) return;

        AnnouncementDb.setChannel(interaction.guildId || '', channel.id);

        await interaction.reply({ content: `✅ Duyuru kanalı başarıyla **${channel}** olarak ayarlandı!`, ephemeral: true });
    }
};
