import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';

interface RegistrationData {
    [guildId: string]: {
        [userId: string]: {
            registrarId: string;
            registeredAt: number;
            // names could be added here if we track history
            previousNames?: string[];
        }
    }
}

// Ensure the DB exists (shared usage in register.ts later)
export const regDataDb = new JsonDb<RegistrationData>('registrationData.json', {});

export default {
    data: new SlashCommandBuilder()
        .setName('kayıtbilgi')
        .setDescription('Kullanıcının kayıt bilgisini gösterir.')
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Bilgisi istenen kullanıcı')
                .setRequired(false) // Default to self
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        if (client.botIndex !== 3) return;

        const targetMember = (interaction.options.getMember('kullanıcı') || interaction.member) as GuildMember;
        const guildId = interaction.guildId!;

        const data = regDataDb.read();
        const userRecord = data[guildId]?.[targetMember.id];

        const embed = new EmbedBuilder()
            .setColor('#000000') // Nors Black
            .setAuthor({ name: 'Kayıt Bilgisi!', iconURL: targetMember.guild.iconURL() || undefined })
            .setThumbnail(targetMember.user.displayAvatarURL({ size: 256 }));

        // Description Fields matching Nors
        // "Kullanıcının önceki isimleri:"
        // "Katılım Tarihi:"
        // "Kayıt Eden Kullanıcı:"
        // "Kayıt Tarihi:"
        // "Kayıt Kanalı:" (We might not track this per user yet, maybe assume current or config)
        // "Daha Önce Kaydedilmiş Mi?"

        const joinDate = targetMember.joinedTimestamp
            ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:f>`
            : 'Bilinmiyor';

        let description = `${targetMember} **Kullanıcısının Kayıt Bilgileri**\n\n`;

        description += `**Kullanıcının önceki isimleri:**\n`;
        if (userRecord?.previousNames && userRecord.previousNames.length > 0) {
            description += userRecord.previousNames.map(n => `\`${n}\``).join(', ') + '\n';
        } else {
            description += `İsim verisi bulunamadı.\n`; // Or empty line as screenshot
        }

        description += `\n**Katılım Tarihi:**\n${joinDate}\n`;

        if (userRecord) {
            // Registered
            description += `\n**Kayıt Eden Kullanıcı:**\n<@${userRecord.registrarId}>\n`;
            description += `\n**Kayıt Tarihi:**\n<t:${Math.floor(userRecord.registeredAt / 1000)}:f>\n`;

            // "Kayıt Kanalı" - We don't verify which channel it happened in unless we store it.
            // Screenshot shows "#red | kayıt-kanalı". I'll skip or use config's log channel as proxy if needed.
            // Let's omit or put "Bilinmiyor" if not stored.

            description += `\n**Daha Önce Kaydedilmiş Mi?**\nEvet (Veri mevcut)\n`;

        } else {
            // Not Registered (or no data)
            description += `\n**Kayıt Eden Kullanıcı:**\n- (Veri Yok)\n`;
            description += `\n**Kayıt Tarihi:**\n- (Veri Yok)\n`;
            description += `\n**Daha Önce Kaydedilmiş Mi?**\nHayır Edilmemiş (veya veri yok)\n`;
        }

        // Footer: "roxiyel tarafından istendi" with avatar
        embed.setDescription(description)
            .setFooter({
                text: `${interaction.user.username} tarafından istendi`,
                iconURL: interaction.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed] });
    }
};
