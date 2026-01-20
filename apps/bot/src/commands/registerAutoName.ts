import { Message, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';
import { RegisterConfig } from './registerConfig';

const db = new JsonDb<RegisterConfig>('registerConfig.json', {});

export default {
    data: new SlashCommandBuilder()
        .setName('otoisimayarla')
        .setDescription('Kayıt sırasında ismin otomatik değiştirilip değiştirilmeyeceğini ayarlar.')
        .addSubcommand(sub => sub.setName('aç').setDescription('Otomatik isim değişimi açar.'))
        .addSubcommand(sub => sub.setName('kapat').setDescription('Otomatik isim değişimi kapatır.'))
        .addSubcommand(sub => sub.setName('göster').setDescription('Durumu gösterir.')),

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
        db.update(data => { if (!data[guildId]) data[guildId] = { staffRoleIds: [], memberRoleIds: [], unregisterRoleIds: [], enabled: true, autoName: false, autoRole: true, welcomeTag: true, buttonRegister: true, nameAgeRequirement: { name: true, age: true } }; });

        let subCommand = '';
        if (isSlash) subCommand = (interaction as ChatInputCommandInteraction).options.getSubcommand();
        else subCommand = args && args.length > 0 ? args[0].toLowerCase() : 'göster';

        if (subCommand === 'aç') {
            db.update(data => { data[guildId].autoName = true; });
            return isSlash ? (interaction as ChatInputCommandInteraction).reply('✅ Otomatik isim değiştirme **AÇILDI**. Kayıt olunca isim değişecek.') : (interaction as Message).reply('Açıldı.');
        }

        if (subCommand === 'kapat') {
            db.update(data => { data[guildId].autoName = false; });
            return isSlash ? (interaction as ChatInputCommandInteraction).reply('✅ Otomatik isim değiştirme **KAPATILDI**. İsim aynı kalacak.') : (interaction as Message).reply('Kapatıldı.');
        }

        if (subCommand === 'göster') {
            const config = db.read()[guildId];
            const embed = new EmbedBuilder().setColor('#000000').setDescription(`**Otomatik İsim:** ${config.autoName ? '🟢 Açık' : '🔴 Kapalı'}`);
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : (interaction as Message).reply({ embeds: [embed] });
        }
    }
};
