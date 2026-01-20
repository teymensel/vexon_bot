import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ChannelType } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';
import { PrefixDb } from '../utils/prefixDb';

interface WelcomeConfig {
    [guildId: string]: {
        welcomeChannelId?: string;
        goodbyeChannelId?: string;
        welcomeMessage?: string;
        enabled: boolean;
    };
}

const db = new JsonDb<WelcomeConfig>('welcomeConfig.json', {});

export default {
    data: new SlashCommandBuilder()
        .setName('welcome-config')
        .setDescription('Hoş geldin / Güle güle kanallarını ayarlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('set-channel')
                .setDescription('Kanal ayarlar.')
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Hangisi?')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Hoş Geldin (Welcome)', value: 'welcome' },
                            { name: 'Güle Güle (Goodbye)', value: 'goodbye' }
                        )
                )
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Hedef Kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub => sub.setName('toggle').setDescription('Sistemi açar veya kapatır.'))
        .addSubcommand(sub => sub.setName('status').setDescription('Mevcut durumu gösterir.')),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 3) return interaction.reply({ content: '⛔ Sadece Bot 3 (Asistan).', ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild!.id;

        db.update(data => {
            if (!data[guildId]) data[guildId] = { enabled: true };
        });

        const config = db.read()[guildId];
        const embed = new EmbedBuilder().setColor('#ED4245').setTimestamp();

        if (sub === 'set-channel') {
            const type = interaction.options.getString('type')!;
            const channel = interaction.options.getChannel('channel')!;

            db.update(data => {
                if (type === 'welcome') data[guildId].welcomeChannelId = channel.id;
                else data[guildId].goodbyeChannelId = channel.id;
            });

            embed.setDescription(`✅ **${type === 'welcome' ? 'Hoş Geldin' : 'Güle Güle'}** kanalı ${channel} olarak ayarlandı!`);
            await interaction.reply({ embeds: [embed] });
        }

        if (sub === 'toggle') {
            let newState = false;
            db.update(data => {
                data[guildId].enabled = !data[guildId].enabled;
                newState = data[guildId].enabled;
            });
            embed.setDescription(`ℹ️ Hoş geldin sistemi **${newState ? 'AÇIK' : 'KAPALI'}** duruma getirildi.`);
            await interaction.reply({ embeds: [embed] });
        }

        if (sub === 'status') {
            embed.setTitle('Hoş Geldin Sistemi Durumu')
                .addFields(
                    { name: 'Sistem Durumu', value: config.enabled ? '✅ Açık' : '❌ Kapalı', inline: true },
                    { name: 'Hoş Geldin Kanalı', value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : 'Ayarlanmamış', inline: true },
                    { name: 'Güle Güle Kanalı', value: config.goodbyeChannelId ? `<#${config.goodbyeChannelId}>` : 'Ayarlanmamış', inline: true }
                );
            await interaction.reply({ embeds: [embed] });
        }
    }
};
