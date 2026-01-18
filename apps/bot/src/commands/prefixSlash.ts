
import { Message, PermissionFlagsBits } from 'discord.js';
import { PrefixDb } from '../utils/prefixDb';

// This will be handled as a SLASH command in interactionCreate
// But for now, since we haven't fully refactored the loader for pure Slash structure,
// We will support it via prefix temporarily OR rely on the fact that existing loader might handle it if we adapt.
// Wait, the plan says "Slash Command".
// We need to register it.
// Currently index.ts handles 'interactionCreate' by looking at `client.commands`.
// So if I export specific `data` structure (SlashCommandBuilder), it should work perfectly.

import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Bu botun komut ön ekini (prefix) değiştirir.')
        .addStringOption(option =>
            option.setName('yeni')
                .setDescription('Yeni prefix (Örn: ! veya .)')
                .setRequired(true)),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guildId) return interaction.reply('Bu komut sadece sunucularda kullanılabilir.');

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '⛔ Bu işlemi yapmak için **Yönetici** yetkisine sahip olmalısınız.', ephemeral: true });
        }

        const newPrefix = interaction.options.getString('yeni', true);
        const client = interaction.client as any;
        const botIndex = client.botIndex || 1;

        if (newPrefix.length > 3) {
            return interaction.reply({ content: '❌ Prefix en fazla 3 karakter olabilir.', ephemeral: true });
        }

        PrefixDb.setPrefix(interaction.guildId, botIndex, newPrefix);

        return interaction.reply(`✅ **Bot ${botIndex}** (${client.user?.username}) için prefix başarıyla **\`${newPrefix}\`** olarak değiştirildi!`);
    }
};
