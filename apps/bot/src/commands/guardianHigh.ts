
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { guardianDb, defaultGuildConfig } from '../utils/guardianDb';

export default {
    data: new SlashCommandBuilder()
        .setName('yuksekkoruma')
        .setDescription('Yüksek Koruma Modunu (High Protection) açar veya kapatır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('durum')
                .setDescription('Mod durumu')
                .setRequired(true)
                .addChoices(
                    { name: 'AKTİF ET (Adminler Dahil)', value: 'on' },
                    { name: 'DEVRE DIŞI BIRAK', value: 'off' }
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 4) return interaction.reply({ content: '⛔ Sadece Bot 4.', ephemeral: true });

        const guildId = interaction.guildId!;
        const action = interaction.options.getString('durum');
        const newState = action === 'on';

        guardianDb.update(data => {
            if (!data[guildId]) data[guildId] = JSON.parse(JSON.stringify(defaultGuildConfig));
            data[guildId].highProtection = newState;

            // If enabling, ensure main toggle is on
            if (newState) data[guildId].enabled = true;
        });

        if (newState) {
            const embed = new EmbedBuilder()
                .setTitle('🔒 YÜKSEK KORUMA AKTİF!')
                .setDescription(`
**DİKKAT: Yüksek koruma modu açıldı!**

Bu modda:
• **Yöneticiler dahil** herkes koruma kurallarına tabidir.
• Sadece **Bot Sahibi** ve **Whitelist** (Güvenli Liste) muaf tutulur.
• Ban, Kick, Kanal/Rol silme limitleri herkese uygulanır.
• *Not: Spam/URL engeli yöneticileri etkilemez.*
                `)
                .setColor('DarkRed')
                .setTimestamp()
                .setFooter({ text: 'Valorica Guardian', iconURL: client.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({
                content: '🔓 **Yüksek Koruma Modu KAPATILDI.**\nArtık Yöneticiler (Administrator yetkisi olanlar) botun korumalarına takılmayacak.'
            });
        }
    }
};
