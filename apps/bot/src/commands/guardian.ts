
import { Message, PermissionFlagsBits } from 'discord.js';
import { guardianDb, defaultGuildConfig } from '../utils/guardianDb';

export default {
    data: {
        name: 'bot-whitelist',
    },
    async execute(message: Message, args: string[]) {
        // Restriction: Only Bot 2
        const client = message.client as any;
        if (client.botIndex !== 4) return;

        // Admin Only
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('⛔ Bu komutu sadece **Yöneticiler** kullanabilir.');
        }

        const subCommand = args[0]?.toLowerCase();
        const targetId = args[1];
        const guildId = message.guild!.id;

        guardianDb.update(data => {
            if (!data[guildId]) {
                data[guildId] = JSON.parse(JSON.stringify(defaultGuildConfig));
                data[guildId].whitelistIds = [];
                data[guildId].enabled = true;
            }
        });

        if (subCommand === 'add') {
            if (!targetId) return message.reply('**Kullanım:** `!bot-whitelist add <BOT_ID>`');

            guardianDb.update(data => {
                if (!data[guildId].whitelistIds.includes(targetId)) {
                    data[guildId].whitelistIds.push(targetId);
                }
            });
            return message.reply(`✅ \`${targetId}\` güvenli listeye eklendi.`);
        }

        if (subCommand === 'remove') {
            if (!targetId) return message.reply('**Kullanım:** `!bot-whitelist remove <BOT_ID>`');

            guardianDb.update(data => {
                data[guildId].whitelistIds = data[guildId].whitelistIds.filter(id => id !== targetId);
            });
            return message.reply(`🗑️ \`${targetId}\` listeden çıkarıldı.`);
        }

        if (subCommand === 'list') {
            const list = guardianDb.read()[guildId].whitelistIds;
            if (list.length === 0) return message.reply('ℹ️ Güvenli liste boş.');
            return message.reply(`📜 **Güvenli Bot Listesi:**\n\`${list.join('\n')}\``);
        }

        if (subCommand === 'toggle') {
            let newState = false;
            guardianDb.update(data => {
                data[guildId].enabled = !data[guildId].enabled;
                newState = data[guildId].enabled;
            });
            return message.reply(`🛡️ Bot Koruma Sistemi **${newState ? 'AÇIK' : 'KAPALI'}**.`);
        }

        return message.reply(`**Bot Koruma Komutları:**
        - \`!bot-whitelist add <ID>\`
        - \`!bot-whitelist remove <ID>\`
        - \`!bot-whitelist list\`
        - \`!bot-whitelist toggle\``);
    }
};
