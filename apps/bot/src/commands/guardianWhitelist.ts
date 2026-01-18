
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { guardianDb, defaultGuildConfig } from '../utils/guardianDb';

export default {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Guardian güvenli listesini (Whitelist) yönetir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('ekle')
                .setDescription('Bir kullanıcıyı veya botu güvenli listeye ekler.')
                .addUserOption(opt => opt.setName('hedef').setDescription('Kullanıcı/Bot').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('cikar')
                .setDescription('Bir kullanıcıyı güvenli listeden çıkarır.')
                .addUserOption(opt => opt.setName('hedef').setDescription('Kullanıcı/Bot').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('liste')
                .setDescription('Güvenli listedeki kullanıcıları görüntüler.')
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 4) return interaction.reply({ content: '⛔ Sadece Bot 4.', ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId!;

        // Ensure Config
        guardianDb.update(data => {
            if (!data[guildId]) data[guildId] = JSON.parse(JSON.stringify(defaultGuildConfig));
            // Ensure whitelist array exists
            if (!data[guildId].whitelistIds) data[guildId].whitelistIds = [];
        });

        // Re-read for logic
        const config = guardianDb.get(guildId);

        if (sub === 'liste') {
            const list = config.whitelistIds;
            if (list.length === 0) {
                return interaction.reply('ℹ️ Güvenli liste şu an **boş**.');
            }

            // Format labels
            const labels = await Promise.all(list.map(async (id: string) => {
                const user = await client.users.fetch(id).catch(() => null);
                return user ? `• ${user.tag} (\`${id}\`)` : `• \`${id}\``;
            }));

            const embed = new EmbedBuilder()
                .setTitle('🛡️ Guardian Whitelist')
                .setDescription(labels.join('\n'))
                .setColor('Green');

            return interaction.reply({ embeds: [embed] });
        }

        const target = interaction.options.getUser('hedef');
        if (!target) return interaction.reply({ content: '❌ Hedef bulunamadı.', ephemeral: true });

        if (sub === 'ekle') {
            if (config.whitelistIds.includes(target.id)) {
                return interaction.reply({ content: `⚠️ ${target} zaten listede.`, ephemeral: true });
            }

            guardianDb.update(data => {
                data[guildId].whitelistIds.push(target.id);
            });

            return interaction.reply(`✅ ${target} (\`${target.id}\`) güvenli listeye **EKLENDİ**.`);
        }

        if (sub === 'cikar') {
            if (!config.whitelistIds.includes(target.id)) {
                return interaction.reply({ content: `⚠️ ${target} zaten listede değil.`, ephemeral: true });
            }

            guardianDb.update(data => {
                data[guildId].whitelistIds = data[guildId].whitelistIds.filter(id => id !== target.id);
            });

            return interaction.reply(`🗑️ ${target} (\`${target.id}\`) güvenli listeden **ÇIKARILDI**.`);
        }
    }
};
