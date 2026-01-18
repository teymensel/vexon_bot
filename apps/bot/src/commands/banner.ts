
import { Message, EmbedBuilder } from 'discord.js';

export default {
    data: {
        name: 'banner',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 1) return; // Bot 1 Only

        let user = message.mentions.users.first() || message.author;

        // Use force fetch to get banner
        try {
            user = await user.fetch();
        } catch (e) {
            console.error('Failed to fetch user for banner', e);
        }

        if (!user.banner) {
            return message.reply(`❌ **${user.tag}** kullanıcısının banner'ı yok.`);
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`🖼️ ${user.tag} Bannerı`)
            .setImage(user.bannerURL({ size: 1024, forceStatic: false }) || null)
            .setFooter({ text: `İsteyen: ${message.author.tag}` });

        return message.reply({ embeds: [embed] });
    }
};
