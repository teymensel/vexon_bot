import { Message, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';
import { RegisterConfig } from './registerConfig';

const db = new JsonDb<RegisterConfig>('registerConfig.json', {});

export default {
    data: new SlashCommandBuilder()
        .setName('isimyaşayarla')
        .setDescription('Kayıt formundaki isim ve yaş gerekliliklerini ayarlar.')
        .addSubcommand(sub =>
            sub.setName('isim').setDescription('İsim zorunluluğunu ayarlar.')
                .addBooleanOption(o => o.setName('zorunlu').setDescription('Zorunlu mu?').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('yaş').setDescription('Yaş zorunluluğunu ayarlar.')
                .addBooleanOption(o => o.setName('zorunlu').setDescription('Zorunlu mu?').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('göster').setDescription('Ayarları gösterir.')),

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

        if (subCommand === 'isim') {
            const req = isSlash ? (interaction as ChatInputCommandInteraction).options.getBoolean('zorunlu')! : (args?.[1] === 'aç');
            db.update(data => {
                if (!data[guildId].nameAgeRequirement) data[guildId].nameAgeRequirement = { name: true, age: true };
                data[guildId].nameAgeRequirement.name = req;
            });
            return isSlash ? (interaction as ChatInputCommandInteraction).reply(`✅ İsim gereksinimi: **${req ? 'GEREKLİ' : 'GEREKLİ DEĞİL'}**`) : (interaction as Message).reply(`İsim: ${req}`);
        }

        if (subCommand === 'yaş') {
            const req = isSlash ? (interaction as ChatInputCommandInteraction).options.getBoolean('zorunlu')! : (args?.[1] === 'aç');
            db.update(data => {
                if (!data[guildId].nameAgeRequirement) data[guildId].nameAgeRequirement = { name: true, age: true };
                data[guildId].nameAgeRequirement.age = req;
            });
            return isSlash ? (interaction as ChatInputCommandInteraction).reply(`✅ Yaş gereksinimi: **${req ? 'GEREKLİ' : 'GEREKLİ DEĞİL'}**`) : (interaction as Message).reply(`Yaş: ${req}`);
        }

        if (subCommand === 'göster') {
            const config = db.read()[guildId];
            const nameReq = config.nameAgeRequirement?.name ?? true;
            const ageReq = config.nameAgeRequirement?.age ?? true;

            const embed = new EmbedBuilder().setColor('#000000').setDescription(`**İsim:** ${nameReq ? 'Gerekli' : 'Opsiyonel'}\n**Yaş:** ${ageReq ? 'Gerekli' : 'Opsiyonel'}`);
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ embeds: [embed] }) : (interaction as Message).reply({ embeds: [embed] });
        }
    }
};
