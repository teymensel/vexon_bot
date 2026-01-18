
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { guardianDb } from '../utils/guardianDb';

export default {
    data: new SlashCommandBuilder()
        .setName('guard')
        .setDescription('Koruma sistemi durum paneli.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 4) return interaction.reply({ content: '⛔ Sadece Bot 4 (Guardian).', ephemeral: true });

        const config = guardianDb.get(interaction.guildId!);

        const status = (bool: boolean) => bool ? '✅' : '❌';

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Valorica Guardian - Güvenlik Paneli')
            .setColor(config.enabled ? 'Green' : 'Red')
            .setDescription(`**Ana Koruma:** ${status(config.enabled)}\n**Log Kanalı:** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Ayarlanmamış'}`)
            .addFields(
                {
                    name: '🛑 Limitler (Anti-Nuke)',
                    value: `
                  Ban: ${status(config.limits.ban.enabled)}
                  Kick: ${status(config.limits.kick.enabled)}
                  Kanal Silme: ${status(config.limits.channelDelete.enabled)}
                  Rol Silme: ${status(config.limits.roleDelete.enabled)}
                  Bot Ekleme: ${status(config.limits.botAdd.enabled)}
                  `,
                    inline: true
                },
                {
                    name: '💬 Sohbet Koruması',
                    value: `
                  Spam: ${status(config.chat.spam.enabled)}
                  Reklam (Link): ${status(config.chat.link.enabled)}
                  Küfür: ${status(config.chat.badWords.enabled)}
                  Caps Lock: ${status(config.chat.caps.enabled)}
                  Etiket (Mention): ${status(config.chat.mention.enabled)}
                  `,
                    inline: true
                },
                {
                    name: '🚨 Raid Koruması',
                    value: `
                  Anti-Raid: ${status(config.raid.enabled)}
                  Hesap Yaşı: ${config.raid.minAccountAge} gün
                  Karantina: ${status(config.raid.quarantine.enabled)}
                  `,
                    inline: false
                }
            )
            .setFooter({ text: 'Ayarları değiştirmek için /korumalar veya tekil komutları (/banengel vb.) kullanın.' });

        await interaction.reply({ embeds: [embed] });
    }
};
