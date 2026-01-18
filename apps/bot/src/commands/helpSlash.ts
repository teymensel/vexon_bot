
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { PrefixDb } from '../utils/prefixDb';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Botun yardım menüsünü ve komutlarını gösterir.'),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        const botIndex = client.botIndex;
        // Slash commands don't rely on prefix input, but we show the prefix for text commands usage
        const prefix = PrefixDb.getPrefix(interaction.guildId || '', botIndex);



        const embed = new EmbedBuilder().setTimestamp();

        if (botIndex === 1) {
            // VExon - Friendly AI
            embed.setColor('#5865F2') // Blurple
                .setTitle('🤖 Ben Vexon! Senin Yapay Zeka Arkadaşın')
                .setDescription(`Selam! Ben **Vexon**. Teymensel tarafından geliştirildim.\nBenimle sohbet edebilir, resimler hakkında konuşabilir veya genel komutları kullanabilirsin.\n\n**Nasıl Konuşuruz?**\nBeni etiketlemen yeterli! 🗣️\n\n**Komutlarım (` + prefix + `):**`)
                .setThumbnail(client.user?.displayAvatarURL() || null)
                .addFields(
                    { name: '💬 Sohbet', value: 'Beni etiketle ve istediğini sor!', inline: false },
                    { name: '🖼️ Görsel', value: 'Bir resim yükle ve beni etiketle, sana ne gördüğümü anlatayım!', inline: false },
                    { name: '🛠️ Genel', value: `\`${prefix}avatar\`, \`${prefix}banner\`, \`${prefix}sesegel\``, inline: false },
                    { name: 'ℹ️ Bilgi', value: `\`${prefix}user-info\` (Bakımda), \`${prefix}server-info\` (Bakımda)`, inline: false }
                );
        } else if (botIndex === 2) {
            // Valorica Assistant - Mod & Support
            embed.setColor('#ED4245') // Red
                .setTitle('🛡️ Valorica Asistan')
                .setDescription(`Sunucu güvenliği ve düzeni benden sorulur.\nTicket sistemi ve moderasyon araçları için buradayım.\n**Slash Komutları:** \`/ticket-setup\`, \`/ticket-config\`\n\n**Komutlarım (` + prefix + `):**`)
                .addFields(
                    { name: '👮 Moderasyon', value: `\`${prefix}ban\`, \`${prefix}kick\`, \`${prefix}mute\`, \`${prefix}sil\`, \`${prefix}lock\`, \`${prefix}nuke\``, inline: false },
                    { name: '🎫 Ticket', value: `\`/ticket-setup\`, \`/ticket-config\``, inline: false },
                    { name: '👋 Kayıt & Karşılama', value: `\`+kayıt\`, \`!welcome-config\`, \`+kayıt-config\``, inline: false }
                );
        } else if (botIndex === 3) {
            // Valorica Fan - Fun & Economy
            embed.setColor('#FEE75C') // Yellow
                .setTitle('🎮 Valorica Fan')
                .setDescription(`Eğlenceye hazır mısın? Oyunlar ve yakında gelecek ekonomi sistemiyle buradayım!\n\n**Komutlarım (` + prefix + `):**`)
                .addFields(
                    { name: '🎲 Oyunlar', value: `\`${prefix}xox\`, \`${prefix}zar\`, \`${prefix}yazitura\`, \`${prefix}slot\`, \`${prefix}ask\``, inline: false },
                    { name: '💰 Ekonomi (Yakında)', value: `\`${prefix}daily\`, \`${prefix}cüzdan\`, \`${prefix}transfer\``, inline: false }
                );
        } else if (botIndex === 4) {
            // Security - Guardian
            embed.setColor('#000000') // Black
                .setTitle('🔒 Bot Guardian')
                .setDescription(`Sistem Koruması Aktif.\nİzinsiz bot girişlerini engellerim.\n**Slash Komutları:** \`/bot-kanal\`, \`/ai-kanal\`\n\n**Komutlarım (` + prefix + `):**`)
                .addFields(
                    { name: '🛡️ Güvenlik', value: `\`${prefix}logkur\`, \`${prefix}bot-whitelist\`, \`/bot-kanal\`, \`/ai-kanal\``, inline: false }
                );
        } else {
            embed.setDescription('Yardım menüsü yüklenemedi.');
        }

        // Common footer
        embed.setFooter({ text: 'Valorica Bot Systems • v2.1', iconURL: interaction.guild?.iconURL() || undefined });

        await interaction.reply({ embeds: [embed] });
    }
};
