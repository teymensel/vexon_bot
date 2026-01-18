
import { Message, EmbedBuilder } from 'discord.js';
import { EconomyDb } from '../utils/economyDb';

export default {
    data: {
        name: 'daily',
        description: 'Günlük ödülünü al.'
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        // Only Bot 3 (Fan)
        if (client.botIndex !== 3) return;

        const userId = message.author.id;
        const guildId = message.guild?.id || '';

        const lastDaily = EconomyDb.getLastDaily(guildId, userId);
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours

        if (now - lastDaily < cooldown) {
            const remaining = cooldown - (now - lastDaily);
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

            return message.reply(`⏳ Günlük ödülünü zaten aldın! **${hours} saat ${minutes} dakika** sonra tekrar gel.`);
        }

        // Random Amount 100-500
        const reward = Math.floor(Math.random() * (500 - 100 + 1)) + 100;

        EconomyDb.addBalance(guildId, userId, reward);
        EconomyDb.setDaily(guildId, userId);

        const currentBalance = EconomyDb.getBalance(guildId, userId);

        const embed = new EmbedBuilder()
            .setColor('#FEE75C') // Yellow
            .setTitle('💰 Günlük Ödül Kazanıldı!')
            .setDescription(`Tebrikler ${message.author}! Bugün şanslı günündesin.`)
            .addFields(
                { name: 'Kazanılan', value: `**+${reward} Coin**`, inline: true },
                { name: 'Yeni Bakiye', value: `**${currentBalance} Coin**`, inline: true }
            )
            .setFooter({ text: 'Valorica Fan Economy', iconURL: message.guild?.iconURL() || undefined });

        await message.reply({ embeds: [embed] });
    }
};
