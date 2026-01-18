
import { Message, PermissionFlagsBits } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';

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
    data: {
        name: 'welcome-config',
    },
    async execute(message: Message, args: string[]) {
        // Restriction: Only Bot 2
        const client = message.client as any;
        if (client.botIndex !== 2) return;

        // Admin Check
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('⛔ Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın!');
        }

        const guildId = message.guild!.id;
        const subCommand = args[0]?.toLowerCase();

        db.update(data => {
            if (!data[guildId]) {
                data[guildId] = { enabled: true };
            }
        });

        if (subCommand === 'set-channel') {
            const channel = message.mentions.channels.first();
            const type = args[1]?.toLowerCase(); // 'welcome' or 'goodbye'

            if (!channel || (type !== 'welcome' && type !== 'goodbye')) {
                return message.reply('**Kullanım:** `!welcome-config set-channel <welcome|goodbye> #kanal`');
            }

            db.update(data => {
                if (type === 'welcome') data[guildId].welcomeChannelId = channel.id;
                else data[guildId].goodbyeChannelId = channel.id;
            });

            return message.reply(`✅ **${type === 'welcome' ? 'Hoş Geldin' : 'Güle Güle'}** kanalı ${channel} olarak ayarlandı!`);
        }

        if (subCommand === 'toggle') {
            let newState = false;
            db.update(data => {
                data[guildId].enabled = !data[guildId].enabled;
                newState = data[guildId].enabled;
            });
            return message.reply(`ℹ️ Hoş geldin sistemi **${newState ? 'AÇIK' : 'KAPALI'}** duruma getirildi.`);
        }

        if (subCommand === 'status') {
            const config = db.read()[guildId];
            return message.reply(`**Durum:**
            - Sistem: **${config.enabled ? 'AÇIK' : 'KAPALI'}**
            - Hoş Geldin Kanalı: <#${config.welcomeChannelId || 'Ayarlanmamış'}>
            - Güle Güle Kanalı: <#${config.goodbyeChannelId || 'Ayarlanmamış'}>`);
        }

        return message.reply(`**Hoş Geldin Sistemi Komutları:**
        - \`!welcome-config set-channel <welcome|goodbye> #kanal\`
        - \`!welcome-config toggle\`
        - \`!welcome-config status\``);
    }
};
