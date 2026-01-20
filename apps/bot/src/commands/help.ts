
import { Message, EmbedBuilder } from 'discord.js';
import { PrefixDb } from '../utils/prefixDb';

export default {
    data: {
        name: 'help',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        const botIndex = client.botIndex;



        // Fetch prefix dynamically here too to ensure accuracy
        const prefix = PrefixDb.getPrefix(message.guild?.id || '', botIndex);

        const embed = new EmbedBuilder().setTimestamp();

        const username = client.user?.username || '';

        if (username.includes('Vexon') || botIndex === 1) {
            // VExon
            embed.setColor('#5865F2') // Blurple
                .setTitle('🤖 Ben Vexon! Senin Yapay Zeka Arkadaşın')
                .setDescription(`Selam! Ben **Vexon**. Teymensel tarafından geliştirildim.\nBenimle sohbet edebilir, resimler hakkında konuşabilir veya genel komutları kullanabilirsin.\n\n**Nasıl Konuşuruz?**\nBeni etiketlemen yeterli! 🗣️\n\n**Komutlarım (${prefix}):**`)
                .setThumbnail(client.user?.displayAvatarURL() || null)
                .addFields(
                    { name: '💬 Sohbet', value: 'Beni etiketle ve istediğini sor!', inline: false },
                    { name: '🖼️ Görsel', value: 'Bir resim yükle ve beni etiketle, sana ne gördüğümü anlatayım!', inline: false },
                    { name: '🛠️ Genel', value: `\`${prefix}avatar\`, \`${prefix}banner\`, \`${prefix}sesegel\``, inline: false },
                    { name: 'ℹ️ Bilgi', value: `\`${prefix}user-info\` (Bakımda), \`${prefix}server-info\` (Bakımda)`, inline: false }
                );
        } else if (username.includes('Asistan') || botIndex === 3) {
            // Valorica Assistant
            embed.setColor('#ED4245') // Red
                .setTitle('🛡️ Valorica Asistan')
                .setDescription(`Sunucu güvenliği ve düzeni benden sorulur.\nTicket sistemi ve moderasyon araçları için buradayım.\n\n**Komutlarım (${prefix}):**`)
                .addFields(
                    { name: '👮 Moderasyon', value: `\`${prefix}ban\`, \`${prefix}kick\`, \`${prefix}mute\`, \`${prefix}sil\`, \`${prefix}lock\`, \`${prefix}nuke\``, inline: false },
                    { name: '🎫 Ticket', value: `\`/ticket-setup\`, \`/ticket-config\``, inline: false },
                    { name: '👋 Kayıt & Karşılama', value: `\`${prefix}kayıt\`, \`${prefix}welcome-config\`, \`${prefix}kayıt-config\``, inline: false }
                );
        } else if (username.includes('Fan') || botIndex === 2) {
            // Valorica Fan
            embed.setColor('#FEE75C') // Yellow
                .setTitle('🎮 Valorica Fan')
                .setDescription(`Eğlenceye hazır mısın? Oyunlar ve yakında gelecek ekonomi sistemiyle buradayım!\n\n**Komutlarım (${prefix}):**`)
                .addFields(
                    { name: '🎲 Oyunlar', value: `\`${prefix}xox\`, \`${prefix}zar\`, \`${prefix}yazitura\`, \`${prefix}slot\`, \`${prefix}ask\``, inline: false },
                    { name: '💰 Ekonomi (Yakında)', value: `\`${prefix}daily\`, \`${prefix}cüzdan\`, \`${prefix}transfer\``, inline: false }
                );
        } else if (username.includes('Guardian') || botIndex === 4) {
            // Security - Guardian
            embed.setColor('#000000') // Black
                .setTitle('🔒 Bot Guardian')
                .setDescription(`Sistem Koruması Aktif.\nİzinsiz bot girişlerini engellerim.\n\n**Komutlarım (${prefix}):**`)
                .addFields(
                    { name: '🛡️ Güvenlik', value: `\`${prefix}logkur\`, \`${prefix}bot-whitelist\`, \`/bot-kanal\`, \`/ai-kanal\``, inline: false }
                );
        } else {
            embed.setDescription('Yardım menüsü yüklenemedi.');
        }

        // Common footer
        embed.setFooter({ text: 'Valorica Bot Systems • v2.1', iconURL: message.guild?.iconURL() || undefined });

        await message.reply({ embeds: [embed] });
    }
};
