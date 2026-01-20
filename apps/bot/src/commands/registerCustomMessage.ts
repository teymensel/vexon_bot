import { Message, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';
import { RegisterConfig } from './registerConfig';

const db = new JsonDb<RegisterConfig>('registerConfig.json', {});

export default {
    data: new SlashCommandBuilder()
        .setName('özelmesaj')
        .setDescription('Kayıt sonrası atılacak özel hoşgeldin mesajını ayarlar.')
        .addSubcommand(sub =>
            sub.setName('ayarla').setDescription('Özel mesajı ayarlar.').addStringOption(o => o.setName('mesaj').setDescription('Mesaj içeriği ({kullanıcı}, {sunucu}, {üyesayısı})').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('aç').setDescription('Özel mesajı aktif eder.')
        )
        .addSubcommand(sub =>
            sub.setName('kapat').setDescription('Özel mesajı kapatır.')
        )
        .addSubcommand(sub =>
            sub.setName('göster').setDescription('Mevcut özel mesaj ayarlarını gösterir.')
        ),

    async execute(interaction: ChatInputCommandInteraction | Message, args?: string[]) {
        const client = interaction.client as any;
        if (client.botIndex !== 3) return;

        const isSlash = interaction instanceof ChatInputCommandInteraction;
        const guild = interaction.guild!;

        const permissions = isSlash ? (interaction as ChatInputCommandInteraction).memberPermissions : (interaction as Message).member?.permissions;
        if (!permissions?.has(PermissionFlagsBits.Administrator)) {
            const msg = '⛔ Yönetici yetkisi gerekli.';
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ content: msg, ephemeral: true }) : (interaction as Message).reply(msg);
        }

        const guildId = guild.id;

        // Ensure Config
        db.update(data => {
            if (!data[guildId]) {
                data[guildId] = {
                    staffRoleIds: [], memberRoleIds: [], unregisterRoleIds: [], enabled: true, autoName: false, autoRole: true, welcomeTag: true, buttonRegister: true, nameAgeRequirement: { name: true, age: true }
                };
            }
        });

        let subCommand = '';
        if (isSlash) subCommand = (interaction as ChatInputCommandInteraction).options.getSubcommand();
        else subCommand = args && args.length > 0 ? args[0].toLowerCase() : 'göster';

        if (subCommand === 'ayarla') {
            const msg = isSlash
                ? (interaction as ChatInputCommandInteraction).options.getString('mesaj')
                : args?.slice(1).join(' ');

            if (!msg) return isSlash ? (interaction as ChatInputCommandInteraction).reply('Mesaj girmelisin.') : (interaction as Message).reply('Mesaj gir.');

            db.update(data => {
                data[guildId].customWelcomeContent = msg;
                data[guildId].customWelcomeEnabled = true;
            });

            return isSlash ? (interaction as ChatInputCommandInteraction).reply(`✅ Özel mesaj ayarlandı ve açıldı.\n\n**Önizleme:**\n${msg}`) : (interaction as Message).reply(`✅ Ayarlandı: ${msg}`);
        }

        if (subCommand === 'aç') {
            db.update(data => { data[guildId].customWelcomeEnabled = true; });
            return isSlash ? (interaction as ChatInputCommandInteraction).reply('✅ Özel mesaj sistemi **AÇILDI**.') : (interaction as Message).reply('Açıldı.');
        }

        if (subCommand === 'kapat') {
            db.update(data => { data[guildId].customWelcomeEnabled = false; });
            return isSlash ? (interaction as ChatInputCommandInteraction).reply('✅ Özel mesaj sistemi **KAPATILDI**.') : (interaction as Message).reply('Kapatıldı.');
        }

        if (subCommand === 'göster') {
            const config = db.read()[guildId];
            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setAuthor({ name: 'Özel Mesaj Ayarları', iconURL: guild.iconURL() || undefined })
                .setDescription(`
**Durum:** ${config.customWelcomeEnabled ? '🟢 Açık' : '🔴 Kapalı'}

**Mesaj İçeriği:**
${config.customWelcomeContent || 'Ayarlanmamış.'}

**Değişkenler:**
\`{kullanıcı}\` - Üyeyi etiketler
\`{sunucu}\` - Sunucu ismi
\`{üyesayısı}\` - Toplam üye
`)
                .setFooter({ text: 'Valorica Asistan' });

            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : (interaction as Message).reply({ embeds: [embed] });
        }
    }
};
