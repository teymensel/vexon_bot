
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { guardianDb, defaultGuildConfig } from '../utils/guardianDb';

export default [
    {
        data: new SlashCommandBuilder()
            .setName('raidmod')
            .setDescription('Raid modunu (Saldırı Koruması) açar/kapatır.')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(opt =>
                opt.setName('durum')
                    .setDescription('Durum')
                    .setRequired(true)
                    .addChoices({ name: 'Aç (Riskli - Katı Kurallar)', value: 'on' }, { name: 'Kapat', value: 'off' })
            ),
        async execute(interaction: ChatInputCommandInteraction) {
            const guildId = interaction.guildId!;
            const state = interaction.options.getString('durum') === 'on';

            guardianDb.update(data => {
                if (!data[guildId]) data[guildId] = JSON.parse(JSON.stringify(defaultGuildConfig));
                data[guildId].raid.enabled = state;
            });

            await interaction.reply(`🚨 Raid Modu **${state ? 'AKTİF AÇILDI' : 'KAPATILDI'}**. ${state ? 'Yeni gelen hesaplar sıkı denetlenecek.' : ''}`);
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('hesapyas')
            .setDescription('Sunucuya girmek için gereken minimum hesap yaşını belirler.')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addIntegerOption(opt => opt.setName('gun').setDescription('Gün sayısı (Örn: 7)').setRequired(true)),

        async execute(interaction: ChatInputCommandInteraction) {
            const days = interaction.options.getInteger('gun')!;
            guardianDb.update(data => {
                if (!data[interaction.guildId!]) data[interaction.guildId!] = JSON.parse(JSON.stringify(defaultGuildConfig));
                data[interaction.guildId!].raid.minAccountAge = days;
            });
            await interaction.reply(`👶 Minimum hesap yaşı **${days} gün** olarak ayarlandı.`);
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('karantina')
            .setDescription('Karantina (Jail) sistemini ayarlar.')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(sub =>
                sub.setName('rol')
                    .setDescription('Karantina rolünü belirler.')
                    .addRoleOption(opt => opt.setName('rol').setDescription('Cezalı rolü').setRequired(true))
            )
            .addSubcommand(sub => sub.setName('ac').setDescription('Sistemi açar.'))
            .addSubcommand(sub => sub.setName('kapat').setDescription('Sistemi kapatır.')),

        async execute(interaction: ChatInputCommandInteraction) {
            const sub = interaction.options.getSubcommand();
            guardianDb.update(data => {
                const g = interaction.guildId!;
                if (!data[g]) data[g] = JSON.parse(JSON.stringify(defaultGuildConfig));

                if (sub === 'rol') {
                    const role = interaction.options.getRole('rol');
                    data[g].raid.quarantine.roleId = role?.id;
                    data[g].raid.quarantine.enabled = true;
                }
                if (sub === 'ac') data[g].raid.quarantine.enabled = true;
                if (sub === 'kapat') data[g].raid.quarantine.enabled = false;
            });
            await interaction.reply(`⛓️ Karantina sistemi güncellendi: **${sub}**.`);
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('otoslowmode')
            .setDescription('Saldırı anında otomatik yavaş mod açılmasını sağlar.')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(opt =>
                opt.setName('durum')
                    .setDescription('Durum')
                    .setRequired(true)
                    .addChoices({ name: 'Aç', value: 'on' }, { name: 'Kapat', value: 'off' })
            ),
        async execute(interaction: ChatInputCommandInteraction) {
            const state = interaction.options.getString('durum') === 'on';
            guardianDb.update(data => {
                if (!data[interaction.guildId!]) data[interaction.guildId!] = JSON.parse(JSON.stringify(defaultGuildConfig));
                data[interaction.guildId!].raid.autoSlowmode.enabled = state;
            });
            await interaction.reply(`🐢 Oto-Slowmode **${state ? 'AÇIK' : 'KAPALI'}**.`);
        }
    }
];
