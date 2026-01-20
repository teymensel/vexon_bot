
import { Message, PermissionFlagsBits } from 'discord.js';

export default {
    data: {
        name: 'kick',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 2) return;

        if (!message.member?.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply('⛔ Bu komutu kullanmak için **Üyeleri At** yetkisine sahip olmalısın.');
        }

        const target = message.mentions.members?.first();
        if (!target) return message.reply('**Kullanım:** `!kick @kullanıcı [sebep]`');

        const reason = args.slice(1).join(' ') || 'Sebep belirtilmedi';

        if (target.id === message.guild!.ownerId) return message.reply('❌ Sunucu sahibini atamazsın.');
        if (message.author.id !== message.guild!.ownerId) {
            if (target.roles.highest.position >= message.member!.roles.highest.position) {
                return message.reply('❌ Senin rolün bu kullanıcıyı atmaya yetmiyor (Rolü senden yüksek veya eşit).');
            }
        }

        if (!target.kickable) return message.reply('❌ Bu kullanıcıyı atamam (Yetkim yetmiyor veya rolü benden yüksek).');

        try {
            await target.kick(`Kicked by ${message.author.tag}: ${reason}`);
            return message.reply(`✅ **${target.user.tag}** sunucudan atıldı.\n📃 **Sebep:** ${reason}`);
        } catch (error) {
            console.error(error);
            return message.reply('❌ Atma işlemi başarısız oldu.');
        }
    }
};
