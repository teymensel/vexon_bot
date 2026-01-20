
import { Message, PermissionFlagsBits } from 'discord.js';

export default {
    data: {
        name: 'mute',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 2) return;

        if (!message.member?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return message.reply('⛔ Bu komutu kullanmak için **Üyeleri Yönet (Zaman Aşımı)** yetkisine sahip olmalısın.');
        }

        const target = message.mentions.members?.first();
        if (!target) return message.reply('**Kullanım:** `!mute @kullanıcı 10m [sebep]`\n(Süreler: 1m, 1h, 1d)');

        const durationArg = args[1]; // "10m"
        const reason = args.slice(2).join(' ') || 'Sebep belirtilmedi';

        if (!durationArg) return message.reply('⚠️ Lütfen bir süre belirtin. (Örn: 5m)');

        let ms = 0;
        if (durationArg.endsWith('m')) ms = parseInt(durationArg) * 60 * 1000;
        else if (durationArg.endsWith('h')) ms = parseInt(durationArg) * 60 * 60 * 1000;
        else if (durationArg.endsWith('d')) ms = parseInt(durationArg) * 24 * 60 * 60 * 1000;
        else return message.reply('⚠️ Geçersiz zaman birimi! Kullan: `m` (dakika), `h` (saat), `d` (gün).');

        if (isNaN(ms)) return message.reply('⚠️ Geçersiz sayı!');

        if (target.id === message.guild!.ownerId) return message.reply('❌ Sunucu sahibini susturamazsın.');
        if (message.author.id !== message.guild!.ownerId) {
            if (target.roles.highest.position >= message.member!.roles.highest.position) {
                return message.reply('❌ Senin rolün bu kullanıcıyı susturmaya yetmiyor (Rolü senden yüksek veya eşit).');
            }
        }

        if (!target.moderatable) return message.reply('❌ Bu kullanıcıya zaman aşımı uygulayamam.');

        try {
            await target.timeout(ms, reason);
            return message.reply(`😶 **${target.user.tag}** susturuldu.\n⏱️ **Süre:** ${durationArg}\n📃 **Sebep:** ${reason}`);
        } catch (error) {
            console.error(error);
            return message.reply('❌ Susturma işlemi başarısız oldu.');
        }
    }
};
