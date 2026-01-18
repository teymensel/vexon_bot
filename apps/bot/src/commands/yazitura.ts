
import { Message } from 'discord.js';

export default {
    data: {
        name: 'yazitura',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 3) return;

        const outcome = Math.random() < 0.5 ? 'Yazı' : 'Tura';
        return message.reply(`🪙 **${outcome}** geldi!`);
    }
};
