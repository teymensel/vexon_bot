
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { guardianDb } from '../utils/guardianDb';

export default [
    // /stats: Bot Stats
    {
        data: new SlashCommandBuilder()
            .setName('stats')
            .setDescription('Guardian bot istatistiklerini gösterir.'),
        async execute(interaction: ChatInputCommandInteraction) {
            const client = interaction.client as any;
            if (client.botIndex !== 4) return interaction.reply({ content: '⛔ Sadece Bot 4.', ephemeral: true });

            const guildId = interaction.guildId!;
            const config = guardianDb.get(guildId);

            const stats = {
                ping: client.ws.ping,
                uptime: process.uptime(),
                serverCount: client.guilds.cache.size,
                userCount: client.users.cache.size,
                protectionEnabled: config.enabled
            };

            const hours = Math.floor(stats.uptime / 3600);
            const minutes = Math.floor((stats.uptime % 3600) / 60);

            const embed = new EmbedBuilder()
                .setTitle('📊 Guardian İstatistikleri')
                .addFields(
                    { name: 'Ping', value: `${stats.ping}ms`, inline: true },
                    { name: 'Uptime', value: `${hours}s ${minutes}dk`, inline: true },
                    { name: 'Sunucular', value: `${stats.serverCount}`, inline: true },
                    { name: 'Koruma Modu', value: stats.protectionEnabled ? '✅ Aktif' : '❌ Pasif', inline: true }
                )
                .setColor('Blue');

            await interaction.reply({ embeds: [embed] });
        }
    },

    // /scan: Security Audit
    {
        data: new SlashCommandBuilder()
            .setName('scan')
            .setDescription('Sunucu güvenlik taraması yapar ve riskleri raporlar.')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        async execute(interaction: ChatInputCommandInteraction) {
            const guild = interaction.guild!;
            await interaction.deferReply();

            const risks: string[] = [];
            const safe: string[] = [];

            // 1. Unsafe Permissions
            const adminRoles = guild.roles.cache.filter(r => r.permissions.has(PermissionFlagsBits.Administrator) && !r.managed);
            risks.push(`⚠️ Yönetici yetkisine sahip **${adminRoles.size}** rol bulundu.`);

            const everyone = guild.roles.everyone;
            if (everyone.permissions.has(PermissionFlagsBits.Administrator) || everyone.permissions.has(PermissionFlagsBits.BanMembers)) {
                risks.push('🚨 **@everyone** rolünde tehlikeli yetkiler var!');
            } else {
                safe.push('✅ @everyone yetkileri güvenli.');
            }

            // 2. Bot Integration
            const config = guardianDb.get(guild.id);
            if (!config.enabled) risks.push('❌ Guardian koruması kapalı.');
            else safe.push('✅ Guardian koruması aktif.');

            if (!config.logChannelId) risks.push('⚠️ Log kanalı ayarlanmamış.');
            else safe.push(`✅ Log kanalı ayarlı.`);

            // 3. Channel Risks
            const channels = guild.channels.cache;
            const openChannels = channels.filter(c => c.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.SendMessages)).size;
            safe.push(`ℹ️ **${openChannels}** kanal herkese açık.`);

            const embed = new EmbedBuilder()
                .setTitle('🛡️ Güvenlik Taraması (Scan)')
                .setDescription('Sunucunuzun genel güvenlik durumu aşağıdadır.')
                .addFields(
                    { name: 'Riskler', value: risks.length > 0 ? risks.join('\n') : '🎉 Risk bulunamadı!' },
                    { name: 'Güvenli Durumlar', value: safe.length > 0 ? safe.join('\n') : '-' }
                )
                .setColor(risks.length > 0 ? 'Orange' : 'Green');

            await interaction.editReply({ embeds: [embed] });
        }
    },

    // /rapor: Report
    {
        data: new SlashCommandBuilder()
            .setName('rapor')
            .setDescription('Sunucu koruma raporunu görüntüler.'),
        async execute(interaction: ChatInputCommandInteraction) {
            // Equivalent to /scan but maybe specific format? Using scan logic logic or simple summary
            const config = guardianDb.get(interaction.guildId!);

            const embed = new EmbedBuilder()
                .setTitle('📑 Koruma Raporu')
                .addFields(
                    { name: 'Anti-Nuke', value: config.limits.ban.enabled ? '✅' : '❌', inline: true },
                    { name: 'Chat Koruması', value: config.chat.spam.enabled ? '✅' : '❌', inline: true },
                    { name: 'Raid Koruması', value: config.raid.enabled ? '✅' : '❌', inline: true },
                    { name: 'Yüksek Koruma', value: config.highProtection ? '🔒 Aktif' : '🔓 Pasif', inline: true }
                )
                .setDescription('Detaylı ayarlar için `/guard` komutunu kullanın.')
                .setColor('Blue');

            await interaction.reply({ embeds: [embed] });
        }
    },

    // /ayar: Alias for /guard
    {
        data: new SlashCommandBuilder().setName('ayar').setDescription('Koruma ayarlarını açar (Alias: /guard).'),
        execute: async (i: any) => i.client.commands.get('guard').execute(i)
    },
    // /log: Alias for /logkur info? Or shortcut
    {
        data: new SlashCommandBuilder().setName('log').setDescription('Log ayarlarını gösterir.'),
        execute: async (i: ChatInputCommandInteraction) => {
            const config = guardianDb.get(i.guildId!);
            return i.reply(`📜 **Log Kanalı:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Ayarlanmamış'}`);
        }
    },
    // /auto: Shortcut for automation help
    {
        data: new SlashCommandBuilder().setName('auto').setDescription('Otomasyon komutları.'),
        execute: async (i: any) => i.client.commands.get('otomasyonkomut').execute(i)
    }
];
