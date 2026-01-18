
import { Message, EmbedBuilder } from 'discord.js';
import { EconomyDb } from '../utils/economyDb';

export default {
    data: {
        name: 'cuzdan', // 'cüzdan' might have encoding issues with some inputs, safer to default to 'cuzdan' but can alias
        description: 'Bakiyeni görüntüle.'
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 3) return;

        const targetUser = message.mentions.users.first() || message.author;
        const guildId = message.guild?.id || '';

        const balance = EconomyDb.getBalance(guildId, targetUser.id);

        const embed = new EmbedBuilder()
            .setColor('#FEE75C')
            .setAuthor({ name: `${targetUser.username} Cüzdanı`, iconURL: targetUser.displayAvatarURL() })
            .setDescription(`💳 **Hesap Durumu:**`)
            .addFields(
                { name: 'Bakiye', value: `**${balance} Coin**`, inline: true },
                { name: 'Durum', value: balance > 0 ? '🤑 Zengin' : '💸 Fakir', inline: true }
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
