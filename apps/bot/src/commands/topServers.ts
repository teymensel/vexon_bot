import { Message, EmbedBuilder } from 'discord.js';

export default {
    data: {
        name: 'topservers',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;

        // Owner Check
        const OWNER_ID = '1067135718473863228'; // User provided ID
        if (message.author.id !== OWNER_ID) {
            // Check fallback env if strict
            return; // Silent fail for non-owners
        }

        const guilds = message.client.guilds.cache
            .map(g => ({ name: g.name, memberCount: g.memberCount, id: g.id }))
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 25); // Top 25

        const description = guilds.map((g, i) => {
            return `**${i + 1}.** ${g.name} - \`${g.memberCount} Üye\` (ID: ${g.id})`;
        }).join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`🤖 Bot Sunucuları (${message.client.guilds.cache.size})`)
            .setDescription(description || 'Sunucu bulunamadı.')
            .setColor('Gold')
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};
