
import { Message, PermissionFlagsBits, TextChannel } from 'discord.js';

export default {
    data: {
        name: 'sil',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 2) return;

        if (!message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply('⛔ Bu komutu kullanmak için **Mesajları Yönet** yetkisine sahip olmalısın.');
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 1 || amount > 99) {
            return message.reply('**Kullanım:** `!sil <1-99>`');
        }

        try {
            const channel = message.channel as TextChannel;
            await channel.bulkDelete(amount + 1, true); // +1 because we delete the command itself too
            const msg = await channel.send(`✅ **${amount}** mesaj silindi.`);
            setTimeout(() => msg.delete().catch(() => { }), 3000);
        } catch (error) {
            console.error(error);
            return message.reply('❌ Mesajlar silinirken hata oluştu (14 günden eski mesajları silemem).');
        }
    }
};
