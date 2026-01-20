import { Message, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';
import { PrefixDb } from '../utils/prefixDb';

export interface RegisterConfig {
    [guildId: string]: {
        staffRoleIds: string[];
        memberRoleIds: string[];
        unregisterRoleIds: string[];
        registerLogChannelId?: string; // Log
        registerMessageChannelId?: string; // Chat
        registerChannelId?: string; // Where Button/Welcome Embed goes [NEW]
        enabled: boolean;
        tag?: string;
        symbol?: string;
        autoName: boolean;
        autoRole: boolean;
        welcomeTag: boolean;
        buttonRegister: boolean;
        customWelcomeContent?: string;
        customWelcomeEnabled?: boolean;
        welcomeTextContent?: string;
        nameAgeRequirement: {
            name: boolean;
            age: boolean;
        };
    };
}

const db = new JsonDb<RegisterConfig>('registerConfig.json', {});

export default {
    data: new SlashCommandBuilder()
        .setName('kayıtayarlar')
        .setDescription('Kayıt sistemi ayarlarını yapılandırır.')
        .addSubcommand(sub =>
            sub.setName('göster').setDescription('Mevcut ayarları gösterir.')
        )
        .addSubcommand(sub =>
            sub.setName('yetkili-ekle').setDescription('Kayıt yetkilisi rolü ekler.')
                .addRoleOption(opt => opt.setName('rol').setDescription('Eklenecek rol').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('verilecek-rol-ekle').setDescription('Kayıt olanlara verilecek rolü ekler.')
                .addRoleOption(opt => opt.setName('rol').setDescription('Eklenecek rol').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('kayıtsız-rol-ekle').setDescription('Kayıt olunca alınacak rolü ekler.')
                .addRoleOption(opt => opt.setName('rol').setDescription('Silinecek rol').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('kayıt-kanalı').setDescription('Kayıt butonunun çıkacağı kanalı ayarlar.')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Kayıt kanalı').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('log-kanal').setDescription('Kayıt işlemleri log kanalını ayarlar.')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Log kanalı').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('chat-kanal').setDescription('Genel sohbet kanalını ayarlar (Hoşgeldin mesajı).')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Sohbet kanalı').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('tag-belirle').setDescription('Sunucu tagını ayarlar.')
                .addStringOption(opt => opt.setName('tag').setDescription('Tag sembolü/yazısı').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('sembol-belirle').setDescription('İsim başına gelecek sembolü ayarlar.')
                .addStringOption(opt => opt.setName('sembol').setDescription('Sembol').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('durum').setDescription('Kayıt sistemini açar/kapatır.')
                .addBooleanOption(opt => opt.setName('aktif').setDescription('Açık mı?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('karşılama-yazısı')
                .setDescription('Sunucuya girince atılan yazı ({kullanıcı}, {yetkili}, {sunucu}).')
                .addStringOption(o => o.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true))
        ),

    async execute(interaction: ChatInputCommandInteraction | Message, args?: string[]) {
        const client = interaction.client as any;
        if (client.botIndex !== 3) return; // Assistant Bot Only

        const isSlash = interaction instanceof ChatInputCommandInteraction;
        const guild = interaction.guild!;

        // Admin Check
        const permissions = isSlash ? (interaction as ChatInputCommandInteraction).memberPermissions : (interaction as Message).member?.permissions;
        if (!permissions?.has(PermissionFlagsBits.Administrator)) {
            const msg = '⛔ Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın!';
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ content: msg, ephemeral: true }) : (interaction as Message).reply(msg);
        }

        const guildId = guild.id;

        // Init DB with migration safety
        db.update(data => {
            if (!data[guildId]) {
                data[guildId] = {
                    staffRoleIds: [],
                    memberRoleIds: [],
                    unregisterRoleIds: [],
                    enabled: true,
                    autoName: false,
                    autoRole: true,
                    welcomeTag: true,
                    buttonRegister: true,
                    nameAgeRequirement: { name: true, age: true }
                };
            } else {
                if (!data[guildId].unregisterRoleIds) data[guildId].unregisterRoleIds = [];
                if (data[guildId].autoName === undefined) data[guildId].autoName = false;
                if (data[guildId].autoRole === undefined) data[guildId].autoRole = true;
                if (data[guildId].welcomeTag === undefined) data[guildId].welcomeTag = true;
                if (data[guildId].buttonRegister === undefined) data[guildId].buttonRegister = true;
                if (!data[guildId].nameAgeRequirement) data[guildId].nameAgeRequirement = { name: true, age: true };
            }
        });

        // Determine Subcommand
        let subCommand = '';
        if (isSlash) {
            subCommand = (interaction as ChatInputCommandInteraction).options.getSubcommand();
        } else {
            if (args && args.length > 0) subCommand = args[0].toLowerCase();
            else subCommand = 'göster';
        }

        const embed = new EmbedBuilder().setTimestamp().setColor('#000000');

        // --- Logic Handlers ---

        if (subCommand === 'yetkili-ekle' || subCommand === 'add-staff') {
            const role = isSlash ? (interaction as ChatInputCommandInteraction).options.getRole('rol') : null;
            if (!role) return isSlash ? (interaction as ChatInputCommandInteraction).reply('Rol seçilmeli.') : null;

            db.update(data => {
                const roles = data[guildId].staffRoleIds || [];
                if (!roles.includes(role.id)) roles.push(role.id);
                data[guildId].staffRoleIds = roles;
            });
            embed.setDescription(`✅ **${role.name}** artık kayıt yetkilisi.`);
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : null;
        }

        if (subCommand === 'verilecek-rol-ekle' || subCommand === 'add-role') {
            const role = isSlash ? (interaction as ChatInputCommandInteraction).options.getRole('rol') : null;
            if (!role) return isSlash ? (interaction as ChatInputCommandInteraction).reply('Rol seçilmeli.') : null;

            db.update(data => {
                const roles = data[guildId].memberRoleIds || [];
                if (!roles.includes(role.id)) roles.push(role.id);
                data[guildId].memberRoleIds = roles;
            });
            embed.setDescription(`✅ **${role.name}** artık kayıt edilenlere verilecek.`);
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : null;
        }

        if (subCommand === 'kayıtsız-rol-ekle') {
            const role = isSlash ? (interaction as ChatInputCommandInteraction).options.getRole('rol') : null;
            if (!role) return isSlash ? (interaction as ChatInputCommandInteraction).reply('Rol seçilmeli.') : null;

            db.update(data => {
                const roles = data[guildId].unregisterRoleIds || [];
                if (!roles.includes(role.id)) roles.push(role.id);
                data[guildId].unregisterRoleIds = roles;
            });
            embed.setDescription(`✅ **${role.name}** artık kayıt olunca silinecek.`);
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : null;
        }

        if (subCommand === 'kayıt-kanalı') {
            const channel = isSlash ? (interaction as ChatInputCommandInteraction).options.getChannel('kanal') : null;
            if (!channel) return isSlash ? (interaction as ChatInputCommandInteraction).reply('Kanal seçilmeli.') : null;

            db.update(data => {
                data[guildId].registerChannelId = channel.id;
            });
            embed.setDescription(`✅ Kayıt mesajı (buton) **${channel}** kanalına düşecek.`);
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : null;
        }

        if (subCommand === 'log-kanal' || subCommand === 'set-log') {
            const channel = isSlash ? (interaction as ChatInputCommandInteraction).options.getChannel('kanal') : null;
            if (!channel) return isSlash ? (interaction as ChatInputCommandInteraction).reply('Kanal seçilmeli.') : null;

            db.update(data => {
                data[guildId].registerLogChannelId = channel.id;
            });
            embed.setDescription(`✅ Kayıt logları **${channel}** kanalına düşecek.`);
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : null;
        }

        if (subCommand === 'karşılama-yazısı') {
            const msg = isSlash ? (interaction as ChatInputCommandInteraction).options.getString('mesaj') : null;
            if (!msg) return isSlash ? (interaction as ChatInputCommandInteraction).reply('Mesaj içeriği girilmeli.') : null;

            db.update(data => {
                data[guildId].welcomeTextContent = msg;
            });
            return isSlash ? (interaction as ChatInputCommandInteraction).reply(`✅ Sunucuya giriş yazısı ayarlandı.`) : null;
        }

        if (subCommand === 'chat-kanal') {
            const channel = isSlash ? (interaction as ChatInputCommandInteraction).options.getChannel('kanal') : null;
            if (!channel) return isSlash ? (interaction as ChatInputCommandInteraction).reply('Kanal seçilmeli.') : null;

            db.update(data => {
                data[guildId].registerMessageChannelId = channel.id;
            });
            embed.setDescription(`✅ Kayıt sohbet mesajları **${channel}** kanalına düşecek.`);
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : null;
        }

        if (subCommand === 'tag-belirle') {
            const tag = isSlash ? (interaction as ChatInputCommandInteraction).options.getString('tag') : null;
            if (!tag) return isSlash ? (interaction as ChatInputCommandInteraction).reply('Tag belirtilmeli.') : null;

            db.update(data => {
                data[guildId].tag = tag;
            });
            embed.setDescription(`✅ Sunucu tagı **${tag}** olarak ayarlandı.`);
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : null;
        }

        if (subCommand === 'sembol-belirle') {
            const symbol = isSlash ? (interaction as ChatInputCommandInteraction).options.getString('sembol') : null;
            if (!symbol) return isSlash ? (interaction as ChatInputCommandInteraction).reply('Sembol belirtilmeli.') : null;

            db.update(data => {
                data[guildId].symbol = symbol;
            });
            embed.setDescription(`✅ İsim sembolü **${symbol}** olarak ayarlandı.`);
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : null;
        }

        if (subCommand === 'durum' || subCommand === 'toggle') {
            let active = false;
            if (isSlash) {
                active = (interaction as ChatInputCommandInteraction).options.getBoolean('aktif')!;
            }

            db.update(data => {
                data[guildId].enabled = active;
            });
            embed.setDescription(`ℹ️ Kayıt sistemi **${active ? 'AÇIK' : 'KAPALI'}**.`);
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : null;
        }

        // Default: Show Config
        const config = db.read()[guildId];

        const fmtRole = (ids: string[] | undefined) => (ids && ids.length > 0) ? ids.map(id => `<@&${id}>`).join(', ') : 'Ayarlanmamış';
        const fmtChan = (id?: string) => id ? `<#${id}>` : 'Ayarlanmamış';

        const emojiOn = '🟢';
        const emojiOff = '🔴';
        const iconSettings = '⚙️';

        const logChan = fmtChan(config.registerLogChannelId);
        const chatChan = fmtChan(config.registerMessageChannelId);
        const regChan = fmtChan(config.registerChannelId); // New field

        const nameAgeReq = config.nameAgeRequirement || { name: true, age: true };

        const customWelcomeStatus = config.customWelcomeEnabled ? `${emojiOn} Açık` : `${emojiOff} Kapalı`;
        const welcomeTextPreview = config.welcomeTextContent ? (config.welcomeTextContent.length > 50 ? config.welcomeTextContent.substring(0, 50) + '...' : config.welcomeTextContent) : 'Ayarlanmamış (Varsayılan Kullanılır)';

        embed.setAuthor({ name: 'Kayıt Ayarlarınız!', iconURL: guild.iconURL() || undefined })
            .setDescription(`${iconSettings} Kayıt sistemi ayarlarınız aşağıda yer almaktadır.

**Kayıt Kanalı** (Buton/Embed)
${regChan}

**Log Kanalı** (İşlem Kayıtları)
${logChan}

**Sohbet Kanalı** (Hoşgeldin Mesajı)
${chatChan}

**Kayıt Türü**
Normal Kayıt

**Verilecek Rol(ler)**
${fmtRole(config.memberRoleIds)}

**Alınacak (Kayıtsız) Rol**
${fmtRole(config.unregisterRoleIds)}

**Kayıt Yetkilisi**
${fmtRole(config.staffRoleIds)}

**Sembol:**
${config.symbol || 'Sembol yok'}

**Tag:**
${config.tag || 'Tag yok'}

**Otomatik İsim:**
${config.autoName ? `${emojiOn} Otomatik İsim Açık` : `${emojiOff} Otomatik İsim Kapalı`}

**Otomatik Rol:**
${config.autoRole ? fmtRole(config.unregisterRoleIds) : 'Ayarlanmamış'}

**Özelleştirilmiş Mesaj:**
${customWelcomeStatus}
(Açmak/Kapatmak için \`/özelmesaj\`)

**Karşılama Yazısı (Embed Üstü):**
${welcomeTextPreview}

**Hoş Geldin Etiketi:**
${config.welcomeTag ? `${emojiOn} Hoş Geldin Etiketi Açık` : `${emojiOff} Hoş Geldin Etiketi Kapalı`}

**Buton Kayıt:**
${config.buttonRegister ? `${emojiOn} Buton Kayıt Açık` : `${emojiOff} Buton Kayıt Kapalı`}

**İsim Yaş Gereksinim**
İsim ${nameAgeReq.name ? 'Gerekli' : 'Gerekli Değil'}
Yaş ${nameAgeReq.age ? 'Gerekli' : 'Gerekli Değil'}
`)
            .setThumbnail(guild.iconURL())
            .setFooter({ text: `Valorica Asistan • ${new Date().toLocaleTimeString()}` });

        return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : (interaction as Message).reply({ embeds: [embed] });
    }
};
