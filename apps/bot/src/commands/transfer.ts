
import { Message, EmbedBuilder } from 'discord.js';
import { EconomyDb } from '../utils/economyDb';

export default {
    data: {
        name: 'transfer',
        description: 'Başka bir kullanıcıya para gönder.'
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 3) return;

        const targetUser = message.mentions.users.first();
        const amountStr = args[1]; // expecting: !transfer @user 100

        if (!targetUser) {
            return message.reply(`⚠️ **Kullanım:** \`!transfer @kullanıcı miktar\``);
        }

        if (targetUser.id === message.author.id) {
            return message.reply(`⚠️ Kendine para gönderemezsin!`);
        }

        if (targetUser.bot) {
            return message.reply(`⚠️ Botlara para gönderemezsin!`);
        }

        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) {
            return message.reply(`⚠️ Geçerli bir miktar girin!`);
        }

        const guildId = message.guild?.id || '';
        const success = EconomyDb.subtractBalance(guildId, message.author.id, amount);

        if (!success) {
            return message.reply(`⛔ Yetersiz bakiye!`);
        }

        EconomyDb.addBalance(guildId, targetUser.id, amount);

        const embed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('💸 Para Transferi')
            .setDescription(`**${message.author.username}** kullanıcısı **${targetUser.username}** kullanıcısına para gönderdi.`)
            .addFields(
                { name: 'Gönderilen Miktar', value: `**${amount} Coin**`, inline: true }
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
