
import { Message, PermissionFlagsBits, ChannelType, GuildTextBasedChannel, TextChannel } from 'discord.js';
import { guardianDb, defaultGuildConfig } from '../utils/guardianDb';

// Need to define BotClient interface extensions locally or import
interface BotClient {
    botIndex: number;
}

export default {
    data: {
        name: 'logkur',
    },
    async execute(message: Message, args: string[]) {
        // Restriction: Only Bot 2 runs this
        const client = message.client as any;
        if (client.botIndex !== 4) return;

        // Admin Only
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('⛔ Bu komutu sadece **Yöneticiler** kullanabilir.');
        }

        const guildId = message.guild!.id;
        const targetChannelId = args[0];

        // Ensure DB entry exists
        guardianDb.update(data => {
            if (!data[guildId]) {
                data[guildId] = JSON.parse(JSON.stringify(defaultGuildConfig));
                data[guildId].whitelistIds = [];
                data[guildId].enabled = true;
            }
        });

        // 1. If args provided, set that channel
        if (targetChannelId) {
            // Validate channel
            // Strip mention syntax if present <#123>
            const cleanId = targetChannelId.replace(/[<#>]/g, '');
            const channel = message.guild!.channels.cache.get(cleanId);

            if (!channel || channel.type !== ChannelType.GuildText) {
                return message.reply(`❌ Geçerli bir Metin Kanalı ID'si veya etiketi giriniz. (\`${targetChannelId}\` bulunamadı)`);
            }

            guardianDb.update(data => {
                data[guildId].logChannelId = cleanId;
            });

            return message.reply(`✅ Güvenlik logları artık ${channel} kanalına gönderilecek.`);
        }

        // 2. If NO args, auto-create channel
        try {
            const existingChannel = message.guild!.channels.cache.find(c => c.name === '🛡️-security-logs');
            if (existingChannel) {
                guardianDb.update(data => {
                    data[guildId].logChannelId = existingChannel.id;
                });
                return message.reply(`ℹ️ Zaten **${existingChannel}** kanalı mevcut. Log kanalı olarak ayarlandı.`);
            }

            // Create Channel
            const newChannel = await message.guild!.channels.create({
                name: '🛡️-security-logs',
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: message.guild!.id, // @everyone
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: message.client.user!.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    },
                    // Add permissions for the admin running the command? usually they have admin perm anyway
                ],
                reason: 'Bot Guardian Log Channel Created via !logkur'
            });

            guardianDb.update(data => {
                data[guildId].logChannelId = newChannel.id;
            });

            return message.reply(`✅ **${newChannel}** kanalı başarıyla oluşturuldu ve log kanalı olarak ayarlandı!`);

        } catch (error) {
            console.error('Error creating log channel:', error);
            return message.reply('❌ Kanal oluşturulurken bir hata oluştu. Lütfen yetkilerimi kontrol edin.');
        }
    }
};
