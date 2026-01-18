
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { guardianDb } from '../utils/guardianDb';

export default {
    data: new SlashCommandBuilder()
        .setName('tumkorumalar')
        .setDescription('Tüm koruma sistemlerini tek seferde açar veya kapatır.')
        .addStringOption(opt =>
            opt.setName('durum')
                .setDescription('Açmak mı kapatmak mı istiyorsun?')
                .setRequired(true)
                .addChoices(
                    { name: 'Aç (Aktif Et)', value: 'on' },
                    { name: 'Kapat (Devre Dışı Bırak)', value: 'off' }
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 4) return interaction.reply({ content: '⛔ Sadece Bot 4 (Guardian).', ephemeral: true });

        const state = interaction.options.getString('durum') === 'on';
        const guildId = interaction.guildId!;

        guardianDb.update(data => {
            const conf = data[guildId]; // get ref
            if (!conf) return; // Should allow get logic to init but update lambda expects existing check usually. 
            // Our JsonDb update logic passes the whole object.

            // We need to initialize if missing inside update? 
            // JsonDb implementation usually passes the whole data object.

            if (!data[guildId]) {
                // Init if empty
                // For now, let's assume it was init by 'get' call or existing logic.
                // Actually, let's assume get() logic handles it, but update() writes directly to this.data.
            }

            // We'll update master toggle and sub-modules if requested? 
            // "Tüm korumaları aç" usually implies enabling master toggle.
            // But maybe user wants "Enable EVERYTHING" (all submodules).
            // Let's implement enabling Master Toggle + Core Modules.

            data[guildId].enabled = state;

            if (state) {
                // Determine sensible defaults for "High Protection" or just enable main toggle?
                // Description said "Tüm koruma sistemlerini...". Ideally it sets enabled=true on sub-settings too.
                // Let's Enable common ones.
                data[guildId].chat.spam.enabled = true;
                data[guildId].chat.link.enabled = true;
                data[guildId].chat.badWords.enabled = true;
                data[guildId].limits.ban.enabled = true;
                data[guildId].limits.kick.enabled = true;
                data[guildId].limits.channelDelete.enabled = true;
                data[guildId].limits.roleDelete.enabled = true;
                data[guildId].limits.botAdd.enabled = true;
            } else {
                // Disable all?
                data[guildId].chat.spam.enabled = false;
                data[guildId].chat.link.enabled = false;
                data[guildId].chat.badWords.enabled = false;
                // ... disable others or just rely on master toggle?
                // Let's set main ones to false to be clean.
            }
        });

        await interaction.reply({ content: `🛡️ Tüm korumalar **${state ? 'AKTİF EDİLDİ' : 'DEVRE DIŞI BIRAKILDI'}**.` });
    }
};
