
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { AnnouncementDb } from '../utils/announcementDb';
// import { v4 as uuidv4 } from 'uuid'; // Removed to avoid dependency issues

function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

export default {
    data: new SlashCommandBuilder()
        .setName('duyuruzamanli')
        .setDescription('İleri tarihli duyuru planlar.')
        .addIntegerOption(opt => opt.setName('dakika').setDescription('Kaç dakika sonra?').setRequired(true))
        .addStringOption(opt => opt.setName('mesaj').setDescription('Duyuru mesajı').setRequired(true))
        .addChannelOption(opt => opt.setName('kanal').setDescription('Hangi kanal? (Boş bırakılırsa varsayılan)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 2) return interaction.reply({ content: '⛔ Sadece Bot 2.', ephemeral: true });

        const minutes = interaction.options.getInteger('dakika') || 1;
        const message = interaction.options.getString('mesaj') || '';
        const channel = interaction.options.getChannel('kanal');

        const executeAt = Date.now() + (minutes * 60 * 1000);

        // Determine channel ID
        let targetChannelId = channel?.id;
        if (!targetChannelId) {
            const config = AnnouncementDb.get(interaction.guildId || '');
            targetChannelId = config.defaultChannelId;
        }

        if (!targetChannelId) {
            return interaction.reply({ content: '⛔ Kanal seçilmedi!', ephemeral: true });
        }

        const task = {
            id: generateId(),
            channelId: targetChannelId,
            content: message,
            executeAt: executeAt
        };

        AnnouncementDb.addSchedule(interaction.guildId || '', task);

        await interaction.reply({ content: `✅ Duyuru planlandı! \n⏱️ **${minutes} dakika** sonra gönderilecek.\nID: \`${task.id}\``, ephemeral: true });
    }
};
