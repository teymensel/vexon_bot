
import { Message, EmbedBuilder } from 'discord.js';

export default {
    data: {
        name: 'avatar',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 1) return; // Bot 1 Only

        const user = message.mentions.users.first() || message.author;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🖼️ ${user.tag} Avatarı`)
            .setImage(user.displayAvatarURL({ size: 1024, forceStatic: false })) // Dynamic (GIF supported)
            .setFooter({ text: `İsteyen: ${message.author.tag}` });

        return message.reply({ embeds: [embed] });
    }
};
