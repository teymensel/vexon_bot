
import {
    SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder,
    ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType
} from 'discord.js';
import { PrefixDb } from '../utils/prefixDb';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Botun yardım menüsünü ve komutlarını gösterir.'),

    async execute(interaction: ChatInputCommandInteraction) {
        // Guard: Legacy Prefix Handler passes Message object which has .author
        if ((interaction as any).author) return;

        const client = interaction.client as any;
        const botIndex = client.botIndex;
        const prefix = PrefixDb.getPrefix(interaction.guildId || '', botIndex);

        // If it's NOT Bot 3, use the basic static embed logic (Legacy)
        if (botIndex !== 3) {
            const embed = new EmbedBuilder().setTimestamp();

            if (botIndex === 1) {
                embed.setColor('#5865F2')
                    .setTitle('🤖 Ben Vexon!')
                    .setDescription(`Yapay Zeka Arkadaşın.\nPrefix: \`${prefix}\``)
                    .addFields({ name: 'Komutlar', value: 'sohbet, görsel, avatar, banner' });
            } else if (botIndex === 2) {
                embed.setColor('#ED4245')
                    .setTitle('🛡️ Bot 2 (Yedek/Mod)')
                    .setDescription(`Moderasyon botu.\nPrefix: \`${prefix}\``);
            } else if (botIndex === 4) {
                embed.setColor('#000000')
                    .setTitle('🔒 Guardian')
                    .setDescription(`Güvenlik Botu.\nPrefix: \`${prefix}\`\n\nCommands: /bot-kanal, /ai-kanal, logkur, whitelist`);
            }
            embed.setFooter({ text: 'Valorica Bot Systems' });
            return interaction.reply({ embeds: [embed] });
        }

        // --- BOT 3 (VALORICA ASİSTAN) INTERACTIVE MENU ---

        // Menu Options
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('Bir kategori seçin...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Ana Menü')
                    .setDescription('Genel bakışa döner.')
                    .setEmoji('🏠')
                    .setValue('home'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Kayıt Sistemi')
                    .setDescription('Kayıt, İsim, Otorol, Karşılama...')
                    .setEmoji('📝')
                    .setValue('register'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Genel / Kullanıcı')
                    .setDescription('Say, Afk, Emoji, Selam Sistemi...')
                    .setEmoji('🛠️')
                    .setValue('general'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Moderasyon & Diğer')
                    .setDescription('Ticket, Duyuru...')
                    .setEmoji('🛡️')
                    .setValue('mod')
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        // Embeds
        const homeEmbed = new EmbedBuilder()
            .setColor('#000000')
            .setAuthor({ name: 'Valorica Asistan | Yardım', iconURL: interaction.guild?.iconURL() || undefined })
            .setDescription(`
Merhaba **${interaction.user?.username || 'Gezgin'}**! 👋
Ben **Valorica Asistan**. Sunucunuzun kayıt, moderasyon ve eğlence işlerini yönetmek için buradayım.

Aşağıdaki menüyü kullanarak komutlarım hakkında detaylı bilgi alabilirsin.

**Prefixim:** \`${prefix}\`
**Slash Komutları:** ✅ Destekleniyor
`)
            .setThumbnail(client.user?.displayAvatarURL())
            .setFooter({ text: 'Menüden seçim yapın • 60 saniye aktif' });

        const registerEmbed = new EmbedBuilder()
            .setColor('#000000')
            .setTitle('📝 Kayıt Sistemi Komutları')
            .setDescription('Gelişmiş Nors-Tarzı Kayıt Sistemi detayları.')
            .addFields(
                { name: '`/kayıtayarlar karşılama-yazısı`', value: 'Sunucuya giriş yazısını ayarlar ({kullanıcı}, {yetkili}, {sunucu}).' },
                { name: '`/özelmesaj`', value: 'Kayıt sonrası atılacak DM/Chat mesajını özelleştirir.' },
                { name: '`/otoisimayarla`', value: 'Kayıt olurken ismi değiştirip değiştirmeyeceğini (Tag/Sembol) ayarlar.' },
                { name: '`/isimyaşayarla`', value: 'Kayıt formunda İsim/Yaş zorunluluğunu ayarlar.' },
                { name: '`/kayıtbilgi`', value: 'Bir kullanıcının geçmiş kayıt isimlerini ve detaylarını gösterir.' },
                { name: '`/kayıt` (veya Buton)', value: 'Manuel kayıt başlatır.' }
            );

        const generalEmbed = new EmbedBuilder()
            .setColor('#000000')
            .setTitle('🛠️ Genel & Kullanıcı Komutları')
            .addFields(
                { name: '`/afk` veya `va!afk`', value: 'AFK moduna geçersiniz. Sizi etiketleyenlere sebep iletilir.' },
                { name: '`/say`', value: 'Sunucu istatistiklerini (Üye, Ses, Boost) gösterir.' },
                { name: '`/selamsistemi`', value: 'Oto-Cevap (SA-AS) sistemini yönetir (Ekle/Sil/Liste).' },
                { name: '`/emojiekle` veya `va!emojiekle`', value: 'Sunucuya kolayca emoji eklersiniz.' },
                { name: '`Duyuru Sistemi`', value: '`/duyuru` ile gelişmiş duyurular (resimli/embedli) yapabilirsiniz.' }
            );

        const modEmbed = new EmbedBuilder()
            .setColor('#000000')
            .setTitle('🛡️ Moderasyon & Diğer')
            .addFields(
                { name: '`/ticket-setup`', value: 'Destek talebi (Ticket) sistemini kurar.' },
                { name: '`/ticket-panel`', value: 'Ticket panelini gönderir.' },
                { name: 'Gelen/Giden', value: 'Gelen/Giden üyeler için ayarlanan kanallara mesaj atar (RegisterConfig içinde).' }
            );

        // Map Values to Embeds
        const embeds: { [key: string]: EmbedBuilder } = {
            'home': homeEmbed,
            'register': registerEmbed,
            'general': generalEmbed,
            'mod': modEmbed
        };

        const originalUserId = interaction.user.id;
        const reply = await interaction.reply({ embeds: [homeEmbed], components: [row] });

        // Collector
        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60000,
            filter: i => i.user.id === originalUserId
        });

        collector.on('collect', async i => {
            const val = i.values[0];
            const targetEmbed = embeds[val] || homeEmbed;
            await i.update({ embeds: [targetEmbed] });
        });

        collector.on('end', () => {
            // Disable menu after timeout
            interaction.editReply({ components: [] }).catch(() => { });
        });
    }
};
