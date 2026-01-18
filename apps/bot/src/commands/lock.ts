
import { Message, PermissionFlagsBits, TextChannel } from 'discord.js';

export default {
    data: {
        name: 'lock',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 2) return;

        if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply('⛔ Bu komutu kullanmak için **Kanalları Yönet** yetkisine sahip olmalısın.');
        }

        const channel = message.channel as TextChannel;
        const subCommand = args[0]?.toLowerCase(); // optional 'aç' or 'kapat'

        // !lock aç -> Unlock
        if (subCommand === 'aç' || subCommand === 'unlock') {
            await channel.permissionOverwrites.edit(message.guild!.id, {
                SendMessages: true
            });
            return message.reply('🔓 Kanal kilidi açıldı.');
        }

        // !lock (default) -> Lock
        await channel.permissionOverwrites.edit(message.guild!.id, {
            SendMessages: false
        });
        return message.reply('🔒 Kanal **kilitlendi**! Sadece yetkililer konuşabilir.');
    }
};
