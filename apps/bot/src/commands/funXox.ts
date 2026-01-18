
import { Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from 'discord.js';

export default {
    data: {
        name: 'xox',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 3) return;

        const opponent = message.mentions.users.first();
        if (!opponent) return message.reply('🎮 **XOX** oynamak için birini etiketlemelisin! (Örn: `!xox @arkadaş`)');
        if (opponent.bot) return message.reply('🤖 Botlarla oynayamazsın (henüz)!');
        if (opponent.id === message.author.id) return message.reply('❌ Kendinle oynayamazsın!');

        // Board State: 0-8 indices. null = empty, X = host, O = opponent
        let board = Array(9).fill(null);
        let turn = message.author.id; // Host starts
        let gameOver = false;

        const getButton = (index: number) => {
            const btn = new ButtonBuilder()
                .setCustomId(`xox_${index}`)
                .setStyle(ButtonStyle.Secondary);

            if (board[index] === 'X') btn.setLabel('X').setStyle(ButtonStyle.Danger).setDisabled(true);
            else if (board[index] === 'O') btn.setLabel('O').setStyle(ButtonStyle.Success).setDisabled(true);
            else btn.setLabel('➖');

            return btn;
        };

        const getComponents = () => {
            const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(getButton(0), getButton(1), getButton(2));
            const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(getButton(3), getButton(4), getButton(5));
            const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(getButton(6), getButton(7), getButton(8));
            return [row1, row2, row3];
        };

        const checkWin = (mark: string) => {
            const wins = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
                [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
                [0, 4, 8], [2, 4, 6]             // Diagonals
            ];
            return wins.some(combo => combo.every(idx => board[idx] === mark));
        };

        const msg = await message.reply({
            content: `🎮 **XOX:** <@${message.author.id}> (X) vs <@${opponent.id}> (O)\nSıra: <@${turn}>`,
            components: getComponents()
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000 // 1 min game
        });

        collector.on('collect', async i => {
            if (i.user.id !== turn) {
                return i.reply({ content: '❌ Sıra sende değil!', ephemeral: true });
            }

            const index = parseInt(i.customId.split('_')[1]);
            const mark = turn === message.author.id ? 'X' : 'O';
            board[index] = mark;

            if (checkWin(mark)) {
                gameOver = true;
                await i.update({
                    content: `🏆 **KAZANAN:** <@${turn}>! 🎉`,
                    components: getComponents() // Show final board
                });
                collector.stop();
            } else if (board.every(cell => cell !== null)) {
                gameOver = true;
                await i.update({
                    content: `🤝 **BERABERE!**`,
                    components: getComponents()
                });
                collector.stop();
            } else {
                turn = turn === message.author.id ? opponent.id : message.author.id;
                await i.update({
                    content: `🎮 **XOX:** <@${message.author.id}> (X) vs <@${opponent.id}> (O)\nSıra: <@${turn}>`,
                    components: getComponents()
                });
            }
        });

        collector.on('end', () => {
            if (!gameOver) {
                msg.edit({ content: '⏳ Süre doldu oyun iptal!', components: [] });
            }
        });
    }
};
