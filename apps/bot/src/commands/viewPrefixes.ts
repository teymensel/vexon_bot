import { ActionRowBuilder, EmbedBuilder, PermissionsBitField, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { PrefixDb } from '../utils/prefixDb';

export default {
    data: new SlashCommandBuilder()
        .setName('prefixler')
        .setDescription('Tüm botların ve bu sunucuda ayarlı olan prefixlerin listesini gösterir.'),

    async execute(interaction: ChatInputCommandInteraction) {
        // Only allow command in server
        if (!interaction.guild) {
            return interaction.reply({ content: 'Bu komut sadece sunucularda kullanılabilir.', ephemeral: true });
        }

        const guildId = interaction.guild.id;

        // Fetch prefixes for all 4 bots
        const prefix1 = PrefixDb.getPrefix(guildId, 1) || '!!';
        const prefix2 = PrefixDb.getPrefix(guildId, 2) || '.';
        const prefix3 = PrefixDb.getPrefix(guildId, 3) || 'va!'; // This is the one user cares about most right now
        const prefix4 = PrefixDb.getPrefix(guildId, 4) || '.';

        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Prefix Listesi')
            .setDescription(`Bu sunucuda (**${interaction.guild.name}**) aktif olan prefixler aşağıdadır:`)
            .setColor('#5865F2')
            .addFields(
                { name: 'Bot 1 (Moderasyon)', value: `\`${prefix1}\``, inline: true },
                { name: 'Bot 2 (Müzik/Eğlence)', value: `\`${prefix2}\``, inline: true },
                { name: 'Bot 3 (Asistan/AI)', value: `\`${prefix3}\``, inline: true },
                { name: 'Bot 4 (Diğer)', value: `\`${prefix4}\``, inline: true }
            )
            .setFooter({ text: 'Değiştirmek için ilgili botun prefix değiştirme komutunu kullanın.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
