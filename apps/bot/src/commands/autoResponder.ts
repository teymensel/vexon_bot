
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';

interface AutoResponseConfig {
    [guildId: string]: {
        enabled: boolean;
        responses: { input: string; output: string }[];
    }
}

export const autoResDb = new JsonDb<AutoResponseConfig>('autoResponse.json', {});

export default {
    data: new SlashCommandBuilder()
        .setName('selamsistemi')
        .setDescription('Otomatik cevap sistemini (SA-AS) yönetir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('ekle')
                .setDescription('Yeni bir cevap ekler (Örn: sa -> Aleyküm Selam)')
                .addStringOption(o => o.setName('girdi').setDescription('Kullanıcının yazdığı mesaj (Örn: sa)').setRequired(true))
                .addStringOption(o => o.setName('çıktı').setDescription('Botun vereceği cevap (Örn: Aleyküm Selam)').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('sil')
                .setDescription('Bir cevabı siler.')
                .addStringOption(o => o.setName('girdi').setDescription('Silinecek girdi kelimesi').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('liste').setDescription('Ekli cevapları listeler.'))
        .addSubcommand(sub => sub.setName('aç').setDescription('Sistemi açar.'))
        .addSubcommand(sub => sub.setName('kapat').setDescription('Sistemi kapatır.')),

    async execute(interaction: ChatInputCommandInteraction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId!;

        if (sub === 'aç') {
            autoResDb.update(data => {
                if (!data[guildId]) data[guildId] = { enabled: true, responses: [] };
                data[guildId].enabled = true;
            });
            return interaction.reply('✅ Selam sistemi (Oto-Cevap) **açıldı**.');
        }

        if (sub === 'kapat') {
            autoResDb.update(data => {
                if (!data[guildId]) data[guildId] = { enabled: false, responses: [] };
                data[guildId].enabled = false;
            });
            return interaction.reply('❌ Selam sistemi (Oto-Cevap) **kapatıldı**.');
        }

        if (sub === 'ekle') {
            const input = interaction.options.getString('girdi')!.toLowerCase(); // Store as lower for case-insensitive match
            const output = interaction.options.getString('çıktı')!;

            autoResDb.update(data => {
                if (!data[guildId]) data[guildId] = { enabled: true, responses: [] };

                // Remove existing if any
                data[guildId].responses = data[guildId].responses.filter(r => r.input !== input);
                data[guildId].responses.push({ input, output });
            });
            return interaction.reply(`✅ Eklendi: \`${input}\` yazılınca \`${output}\` diyeceğim.`);
        }

        if (sub === 'sil') {
            const input = interaction.options.getString('girdi')!.toLowerCase();
            autoResDb.update(data => {
                if (!data[guildId]) return;
                data[guildId].responses = data[guildId].responses.filter(r => r.input !== input);
            });
            return interaction.reply(`🗑️ Silindi: \`${input}\` artık cevaplanmayacak.`);
        }

        if (sub === 'liste') {
            const data = autoResDb.read()[guildId];
            if (!data || !data.responses || data.responses.length === 0) {
                return interaction.reply('Liste boş.');
            }

            const list = data.responses.map(r => `• **${r.input}** ➔ ${r.output}`).join('\n');
            const embed = new EmbedBuilder()
                .setColor('#000000')
                .setTitle('Oto Cevap Listesi')
                .setDescription(`${data.enabled ? '🟢 Sistem Açık' : '🔴 Sistem Kapalı'}\n\n${list}`);

            return interaction.reply({ embeds: [embed] });
        }
    }
};
