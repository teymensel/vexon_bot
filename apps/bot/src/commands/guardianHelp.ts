
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

const createHelpCommand = (name: string, description: string, title: string, fields: { name: string, value: string }[]) => {
    return {
        data: new SlashCommandBuilder()
            .setName(name)
            .setDescription(description),
        async execute(interaction: ChatInputCommandInteraction) {
            const client = interaction.client as any;
            // Ensure only Bot 4 responds if these are Guardian specific, 
            // but 'komutlar' might be general. Assuming Guardian Context for now based on user flow.
            if (client.botIndex !== 4) return interaction.reply({ content: '⛔ Sadece Bot 4.', ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle(`📚 ${title}`)
                .setColor('Blue')
                .addFields(fields)
                .setFooter({ text: 'Valorica Guardian', iconURL: client.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });
        }
    };
};

// Define command contents
const whitelistFields = [
    { name: '/whitelist ekle <user>', value: 'Güvenli listeye kullanıcı ekler.' },
    { name: '/whitelist cikar <user>', value: 'Güvenli listeden kullanıcı çıkarır.' },
    { name: '/whitelist liste', value: 'Güvenli listeyi gösterir.' },
    { name: '/bot-whitelist', value: '(Legacy) ID bazlı işlem yapar.' }
];

const modFields = [
    { name: '/banengel', value: 'Sağ-tık Ban koruması.' },
    { name: '/kickengel', value: 'Sağ-tık Kick koruması.' },
    { name: '/rolengel', value: 'Rol silme/oluşturma koruması.' },
    { name: '/kanalengel', value: 'Kanal silme/oluşturma koruması.' },
    { name: '/webhookengel', value: 'Webhook açılmasını engeller.' },
    { name: '/botengel', value: 'İzinsiz bot eklemeyi engeller.' }
];

const autoFields = [
    { name: '/spamengel', value: 'Spam koruması.' },
    { name: '/urlengel', value: 'Link/URL engeli.' },
    { name: '/kufurengel', value: 'Küfür filtresi.' },
    { name: '/capsengel', value: 'Büyük harf koruması.' },
    { name: '/raidmod', value: 'Saldırı koruması (Anti-Raid).' },
    { name: '/otocevap', value: 'Otomatik cevaplar (Yakında).' }
];

const generalFields = [
    { name: '/guard', value: 'Güvenlik paneli/Dashboard.' },
    { name: '/tumkorumalar', value: 'Hepsini Aç/Kapat.' },
    { name: '/logkur', value: 'Log kanalını ayarlar.' },
    { name: '/yuksekkoruma', value: 'Yüksek güvenlik modunu açar.' },
    { name: '/scan', value: 'Sunucu güvenlik taraması yapar.' },
    { name: '/stats', value: 'Bot istatistikleri.' }
];

// Export array of commands
export default [
    createHelpCommand('whitelistkomut', 'Whitelist komutlarını gösterir.', 'Whitelist Komutları', whitelistFields),
    createHelpCommand('moderasyonkomut', 'Moderasyon/Koruma komutlarını gösterir.', 'Koruma Komutları', modFields),
    createHelpCommand('otomasyonkomut', 'Otomasyon ve Chat komutlarını gösterir.', 'Otomasyon Komutları', autoFields),
    createHelpCommand('genelkomutlar', 'Genel komutları gösterir.', 'Genel Komutlar', generalFields),
    createHelpCommand('komutlar', 'Tüm kategorileri listeler.', 'Komut Menüsü', [
        { name: '🛡️ Koruma', value: '`/moderasyonkomut`' },
        { name: '🤖 Otomasyon', value: '`/otomasyonkomut`' },
        { name: '📝 Genel', value: '`/genelkomutlar`' },
        { name: '🤍 Whitelist', value: '`/whitelistkomut`' }
    ])
];
