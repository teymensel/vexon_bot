
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, TextChannel } from 'discord.js';
import { ChannelDb } from '../utils/channelDb';

export default {
    data: new SlashCommandBuilder()
        .setName('ai-kanal')
        .setDescription('Yapay Zeka (Chat) özelliğini kanallarda açar/kapatır.')
        .addSubcommand(sub =>
            sub.setName('engelle')
                .setDescription('Bu kanalda yapay zeka cevap vermeyi durdurur.')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal seç').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('izinver')
                .setDescription('Bu kanalda yapay zeka tekrar aktif olur.')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal seç').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('AI özelliğinin kapalı olduğu kanalları listeler.')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return interaction.reply('Sunucu mecburi.');

        // Check for Admin or Owner
        const ownerId = interaction.guild?.ownerId;
        const isOwner = interaction.user.id === ownerId || interaction.user.id === '1067135718473863228';
        const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

        if (!isOwner && !isAdmin) {
            return interaction.reply({ content: '⛔ Bu komut için Yönetici yetkisi gerekir.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'list') {
            const config = ChannelDb.get(interaction.guildId);
            if (config.aiDisabledChannels.length === 0) {
                return interaction.reply('🌐 Yapay Zeka şu an **tüm kanallarda** aktiftir.');
            }
            const channels = config.aiDisabledChannels.map(id => `<#${id}>`).join(', ');
            return interaction.reply(`🔇 **AI Kapalı Kanallar:**\n${channels}`);
        }

        const channel = interaction.options.getChannel('kanal') as TextChannel;
        if (!channel) return interaction.reply('Kanal bulunamadı.');

        if (sub === 'engelle') {
            ChannelDb.addAiDisabledChannel(interaction.guildId, channel.id);
            return interaction.reply(`🔇 ${channel} kanalında Yapay Zeka **kapatıldı**. Artık cevap vermeyecek (etiketlense bile).`);
        }

        if (sub === 'izinver') {
            ChannelDb.removeAiDisabledChannel(interaction.guildId, channel.id);
            return interaction.reply(`🗣️ ${channel} kanalında Yapay Zeka **tekrar açıldı**.`);
        }
    }
};
