import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import { InviteDb } from '../utils/inviteDb';

export default {
    data: new SlashCommandBuilder()
        .setName('invitelog')
        .setDescription('Davet loglama sistemini yönetir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('ayarla')
                .setDescription('Log kanalını ayarlar.')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Log kanalı').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('durum')
                .setDescription('Sistemi açar veya kapatır.')
                .addStringOption(opt => opt.setName('secim').setDescription('Açık/Kapalı').setRequired(true).addChoices(
                    { name: 'Açık (Aktif)', value: 'on' },
                    { name: 'Kapalı (Deaktif)', value: 'off' }
                ))
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        InviteDb.update((db) => {
            if (!db[interaction.guildId!]) {
                db[interaction.guildId!] = { enabled: false, channelId: null, inviterMap: {} };
            }
        });

        const sub = interaction.options.getSubcommand();
        const config = InviteDb.read()[interaction.guildId!];

        if (sub === 'ayarla') {
            const channel = interaction.options.getChannel('kanal');
            InviteDb.update(db => {
                db[interaction.guildId!].channelId = channel!.id;
                db[interaction.guildId!].enabled = true; // Auto enable on set
            });
            await interaction.reply({ content: `✅ Invite Log kanalı <#${channel!.id}> olarak ayarlandı ve sistem **aktif edildi**.`, ephemeral: true });
        } else if (sub === 'durum') {
            const choice = interaction.options.getString('secim');
            const isOn = choice === 'on';
            InviteDb.update(db => {
                db[interaction.guildId!].enabled = isOn;
            });
            await interaction.reply({ content: `✅ Invite Log sistemi **${isOn ? 'AÇIK' : 'KAPALI'}** duruma getirildi.`, ephemeral: true });
        }
    }
};
