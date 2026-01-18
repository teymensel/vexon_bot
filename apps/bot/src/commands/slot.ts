
import { Message } from 'discord.js';

export default {
    data: {
        name: 'slot',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 3) return;

        const fruits = ['🍎', '🍊', '🍇', '🍒', '💎', '7️⃣'];
        const a = fruits[Math.floor(Math.random() * fruits.length)];
        const b = fruits[Math.floor(Math.random() * fruits.length)];
        const c = fruits[Math.floor(Math.random() * fruits.length)];

        let result = 'Kaybettin 😢';
        if (a === b && b === c) result = 'JACKPOT! 🎰 Kazandın! 🎉';
        else if (a === b || b === c || a === c) result = 'İkili! Fena değil.';

        return message.reply(`🎰 Slot Makinesi 🎰\n| ${a} | ${b} | ${c} |\n**${result}**`);
    }
};
