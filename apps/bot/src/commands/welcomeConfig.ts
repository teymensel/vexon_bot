
import { Message, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
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
    data: {
        name: 'welcome-config',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 3) return;

        // Admin Check
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('⛔ Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın!');
        }

        const guildId = message.guild!.id;
        const prefix = PrefixDb.getPrefix(guildId, 3);
        const subCommand = args[0]?.toLowerCase();

        db.update(data => {
            if (!data[guildId]) {
                data[guildId] = { enabled: true };
            }
        });

        const config = db.read()[guildId];
        const embed = new EmbedBuilder().setColor('#ED4245').setTimestamp();

        if (subCommand === 'set-channel') {
            const channel = message.mentions.channels.first();
            const type = args[1]?.toLowerCase(); // 'welcome' or 'goodbye'

            if (!channel || (type !== 'welcome' && type !== 'goodbye')) {
                embed.setDescription(`❌ **Hatalı Kullanım!**\nDoğru kullanım: \`${prefix}welcome-config set-channel <welcome|goodbye> #kanal\``);
                return message.reply({ embeds: [embed] });
            }

            db.update(data => {
                if (type === 'welcome') data[guildId].welcomeChannelId = channel.id;
                else data[guildId].goodbyeChannelId = channel.id;
            });

            embed.setDescription(`✅ **${type === 'welcome' ? 'Hoş Geldin' : 'Güle Güle'}** kanalı ${channel} olarak ayarlandı!`);
            return message.reply({ embeds: [embed] });
        }

        if (subCommand === 'toggle') {
            let newState = false;
            db.update(data => {
                data[guildId].enabled = !data[guildId].enabled;
                newState = data[guildId].enabled;
            });
            embed.setDescription(`ℹ️ Hoş geldin sistemi **${newState ? 'AÇIK' : 'KAPALI'}** duruma getirildi.`);
            return message.reply({ embeds: [embed] });
        }

        if (subCommand === 'status') {
            embed.setTitle('Hoş Geldin Sistemi Durumu')
                .addFields(
                    { name: 'Sistem Durumu', value: config.enabled ? '✅ Açık' : '❌ Kapalı', inline: true },
                    { name: 'Hoş Geldin Kanalı', value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : 'Ayarlanmamış', inline: true },
                    { name: 'Güle Güle Kanalı', value: config.goodbyeChannelId ? `<#${config.goodbyeChannelId}>` : 'Ayarlanmamış', inline: true }
                );
            return message.reply({ embeds: [embed] });
        }

        // Default Help
        embed.setTitle('👋 Hoş Geldin Sistemi Ayarları')
            .setDescription(`Aşağıdaki komutları kullanarak sistemi yapılandırabilirsiniz.\nPrefix: **${prefix}**`)
            .addFields(
                { name: '📍 Kanal Ayarlama', value: `\`${prefix}welcome-config set-channel welcome #kanal\`\n\`${prefix}welcome-config set-channel goodbye #kanal\`` },
                { name: '🔄 Aç/Kapat', value: `\`${prefix}welcome-config toggle\`` },
                { name: '📊 Durum Kontrol', value: `\`${prefix}welcome-config status\`` }
            )
            .setFooter({ text: 'Valorica Asistan' });

        return message.reply({ embeds: [embed] });
    }
};
