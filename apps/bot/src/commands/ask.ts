
import { Message } from 'discord.js';

export default {
    data: {
        name: 'ask',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 3) return;

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
};
