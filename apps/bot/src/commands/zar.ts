
import { Message } from 'discord.js';

export default {
    data: {
        name: 'zar',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 3) return;

        const roll = Math.floor(Math.random() * 6) + 1;
        return message.reply(`🎲 **${roll}** attın!`);
    }
};
