
import { Message, PermissionFlagsBits } from 'discord.js';

export default {
    data: {
        name: 'ban',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 2) return;

        if (!message.member?.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply('⛔ Bu komutu kullanmak için **Üyeleri Yasakla** yetkisine sahip olmalısın.');
        }

        const target = message.mentions.members?.first();
        if (!target) return message.reply('**Kullanım:** `!ban @kullanıcı [sebep]`');

        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

        if (!target.bannable) return message.reply('❌ Bu kullanıcıyı yasaklayamam (Yetkim yetmiyor veya rolü benden yüksek).');

        try {
            await target.ban({ reason: `Banned by ${message.author.tag}: ${reason}` });
            return message.reply(`✅ **${target.user.tag}** sunucudan yasaklandı.\n📃 **Sebep:** ${reason}`);
        } catch (error) {
            console.error(error);
            return message.reply('❌ Yasaklama işlemi başarısız oldu.');
        }
    }
};
