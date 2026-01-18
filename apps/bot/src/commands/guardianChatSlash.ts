
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { guardianDb, defaultGuildConfig } from '../utils/guardianDb';

// Factory for Chat Modules
const createChatCommand = (
    name: string,
    description: string,
    key: keyof typeof defaultGuildConfig.chat,
    hasLimit: boolean = false
) => {
    return {
        data: new SlashCommandBuilder()
            .setName(name)
            .setDescription(description)
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(opt =>
                opt.setName('durum')
                    .setDescription('Koruma durumu')
                    .setRequired(true)
                    .addChoices({ name: 'Aç', value: 'on' }, { name: 'Kapat', value: 'off' })
            )
            .addIntegerOption(opt =>
                opt.setName(hasLimit ? 'limit' : 'seviye')
                    .setDescription(hasLimit ? 'İzin verilen maksimum sayı' : 'Hassasiyet seviyesi (Opsiyonel)')
                    .setRequired(false)
            ),

        async execute(interaction: ChatInputCommandInteraction) {
            const client = interaction.client as any;
            if (client.botIndex !== 4) return interaction.reply({ content: '⛔ Sadece Bot 4 (Guardian).', ephemeral: true });

            const guildId = interaction.guildId!;
            const enabled = interaction.options.getString('durum') === 'on';
            const val = interaction.options.getInteger(hasLimit ? 'limit' : 'seviye');

            guardianDb.update(data => {
                if (!data[guildId]) data[guildId] = JSON.parse(JSON.stringify(defaultGuildConfig));
                const mod = data[guildId].chat[key];

                mod.enabled = enabled;

                // Specific Logic for params
                if (val) {
                    if (key === 'spam') (mod as any).limit = val;
                    if (key === 'emoji') (mod as any).limit = val;
                    if (key === 'mention') (mod as any).limit = val;
                    if (key === 'caps') (mod as any).percentage = val;
                }
            });

            await interaction.reply({
                content: `💬 **${name}** ayarlandı.\nDurum: **${enabled ? 'AÇIK' : 'KAPALI'}**`
            });
        }
    };
};

export default [
    createChatCommand('spamengel', 'Spam koruması.', 'spam', true),
    createChatCommand('capsengel', 'Büyük harf (Caps Lock) koruması.', 'caps'), // param implies percentage
    createChatCommand('emojiengel', 'Fazla emoji kullanımını engeller.', 'emoji', true),
    createChatCommand('mentionengel', 'Fazla etiketlemeyi engeller.', 'mention', true),
    createChatCommand('urlengel', 'Link paylaşımını engeller.', 'link'),
    createChatCommand('davetengel', 'Discord davet linklerini engeller.', 'invite'),
    createChatCommand('scamengel', 'Bilinen dolandırıcı sitelerini engeller.', 'scam'),

    // Küfür engel needs word management, simpler factory might not fit perfectly but basic toggle works
    {
        data: new SlashCommandBuilder()
            .setName('kufurengel')
            .setDescription('Küfür filtresini yönetir.')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(sub => sub.setName('ac').setDescription('Filtreyi açar.'))
            .addSubcommand(sub => sub.setName('kapat').setDescription('Filtreyi kapatır.'))
            .addSubcommand(sub =>
                sub.setName('ekle')
                    .setDescription('Yasaklı kelime ekler.')
                    .addStringOption(o => o.setName('kelime').setDescription('Yasaklanacak kelime').setRequired(true))
            )
            .addSubcommand(sub =>
                sub.setName('sil')
                    .setDescription('Yasaklı kelimeyi kaldırır.')
                    .addStringOption(o => o.setName('kelime').setDescription('Kaldırılacak kelime').setRequired(true))
            )
            .addSubcommand(sub => sub.setName('liste').setDescription('Yasaklı kelimeleri listeler.')),

        async execute(interaction: ChatInputCommandInteraction) {
            const client = interaction.client as any;
            if (client.botIndex !== 4) return interaction.reply({ content: '⛔ Sadece Bot 4.', ephemeral: true });

            const sub = interaction.options.getSubcommand();
            const guildId = interaction.guildId!;

            if (sub === 'liste') {
                const conf = guardianDb.get(guildId);
                const words = conf.chat.badWords.words;
                return interaction.reply({ content: `🤬 **Yasaklı Kelimeler:**\n${words.length > 0 ? words.join(', ') : 'Hiç yok.'}`, ephemeral: true });
            }

            guardianDb.update(data => {
                if (!data[guildId]) data[guildId] = JSON.parse(JSON.stringify(defaultGuildConfig));

                if (sub === 'ac') data[guildId].chat.badWords.enabled = true;
                if (sub === 'kapat') data[guildId].chat.badWords.enabled = false;

                if (sub === 'ekle') {
                    const word = interaction.options.getString('kelime');
                    if (word && !data[guildId].chat.badWords.words.includes(word)) {
                        data[guildId].chat.badWords.words.push(word);
                    }
                }

                if (sub === 'sil') {
                    const word = interaction.options.getString('kelime');
                    if (word) {
                        data[guildId].chat.badWords.words = data[guildId].chat.badWords.words.filter(w => w !== word);
                    }
                }
            });

            await interaction.reply({ content: `✅ İşlem başarılı: **${sub}**` });
        }
    }
];
