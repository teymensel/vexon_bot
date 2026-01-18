
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, TextChannel } from 'discord.js';
import { ChannelDb } from '../utils/channelDb';

export default {
    data: new SlashCommandBuilder()
        .setName('bot-kanal')
        .setDescription('Botun çalışacağı kanalları yönetir (Sadece Admin).')
        .addSubcommand(sub =>
            sub.setName('ekle')
                .setDescription('Bir kanalı izinli listesine ekler.')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal seç').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('cikar')
                .setDescription('Bir kanalı izinli listesinden çıkarır.')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal seç').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('İzinli kanalları listeler.')),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return interaction.reply('Sunucu mecburi.');

        // Check for Admin or Owner
        const ownerId = interaction.guild?.ownerId;
        const isOwner = interaction.user.id === ownerId || interaction.user.id === '1067135718473863228'; // Bot Owner hardcoded
        const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

        if (!isOwner && !isAdmin) {
            return interaction.reply({ content: '⛔ Bu komut için Yönetici yetkisi gerekir.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        if (sub === 'list') {
            const config = ChannelDb.get(interaction.guildId);
            if (config.allowedChannels.length === 0) {
                return interaction.reply('🌐 Bot şu an **tüm kanallarda** çalışıyor (Kısıtlama yok).');
            }
            const channels = config.allowedChannels.map(id => `<#${id}>`).join(', ');
            return interaction.reply(`📋 **Botun Çalıştığı Kanallar:**\n${channels}`);
        }

        const channel = interaction.options.getChannel('kanal') as TextChannel;
        if (!channel) return interaction.reply('Kanal bulunamadı.');

        if (sub === 'ekle') {
            ChannelDb.addAllowedChannel(interaction.guildId, channel.id);
            return interaction.reply(`✅ Bot artık ${channel} kanalında çalışacak.`);
        }

        if (sub === 'cikar') {
            ChannelDb.removeAllowedChannel(interaction.guildId, channel.id);
            return interaction.reply(`🗑️ ${channel} kanal izni kaldırıldı.`);
        }
    }
};
