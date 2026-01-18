
import { Message, EmbedBuilder } from 'discord.js';

// Generic Fun Command Handler to keep it clean
// Supports: !yazitura, !zar, !ask, !slot
export default {
    data: {
        name: 'fun-bundle', // Internal name, we will handle multiple in execution or separate them
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 3) return; // Only Bot 3

        const content = message.content.slice(1).trim().split(/ +/); // Remove prefix
        const command = content.shift()?.toLowerCase();

        // COIN FLIP
        if (command === 'yazitura' || command === 'cf') {
            const outcome = Math.random() < 0.5 ? 'Yazı' : 'Tura';
            return message.reply(`🪙 **${outcome}** geldi!`);
        }

        // DICE
        if (command === 'zar' || command === 'dice') {
            const roll = Math.floor(Math.random() * 6) + 1;
            return message.reply(`🎲 **${roll}** attın!`);
        }

        // 8-BALL
        if (command === 'ask' || command === '8ball') {
            const question = args.join(' ');
            if (!question) return message.reply('🔮 Bir soru sormalısın! (Örn: `!ask Bugün şanslı mıyım?`)');

            const answers = [
                'Kesinlikle evet.', 'Bence öyle.', 'Kuşkusuz.', 'Evet.', 'Gelecek parlak görünüyor.',
                'Kararsızım, tekrar sor.', 'Şimdi söyleyemem.', 'Buna cevap vermesem daha iyi.',
                'İmkansız.', 'Pek iyi görünmüyor.', 'Hayır.', 'Şüpheli.'
            ];
            const answer = answers[Math.floor(Math.random() * answers.length)];
            return message.reply(`🔮 **Soru:** ${question}\n🎱 **Cevap:** ${answer}`);
        }

        // SLOT
        if (command === 'slot' || command === 'slots') {
            const fruits = ['🍎', '🍊', '🍇', '🍒', '💎', '7️⃣'];
            const a = fruits[Math.floor(Math.random() * fruits.length)];
            const b = fruits[Math.floor(Math.random() * fruits.length)];
            const c = fruits[Math.floor(Math.random() * fruits.length)];

            let result = 'Kaybettin 😢';
            if (a === b && b === c) result = 'JACKPOT! 🎰 Kazandın! 🎉';
            else if (a === b || b === c || a === c) result = 'İkili! Fena değil.';

            return message.reply(`🎰 Slot Makinesi 🎰\n| ${a} | ${b} | ${c} |\n**${result}**`);
        }
    }
};
