
import { Events, GuildMember, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';
import { RegisterConfig } from '../commands/registerConfig'; // Type import

const configDb = new JsonDb<RegisterConfig>('registerConfig.json', {});

interface WelcomeConfig {
    [guildId: string]: {
        welcomeChannelId?: string;
        goodbyeChannelId?: string;
        welcomeMessage?: string;
        enabled: boolean;
    };
}

const db = new JsonDb<WelcomeConfig>('welcomeConfig.json', {});

export default {
    name: Events.GuildMemberAdd,
    async execute(member: GuildMember) {
        if (member.user.bot) return; // Ignore Bots

        const client = member.client as any;
        if (client.botIndex !== 3) return; // Assistant Bot

        const welConfig = db.read()[member.guild.id];
        const regConfig = configDb.read()[member.guild.id];

        // Auto Role (Unregister Role)
        if (regConfig && regConfig.enabled && regConfig.autoRole && regConfig.unregisterRoleIds && regConfig.unregisterRoleIds.length > 0) {
            await member.roles.add(regConfig.unregisterRoleIds).catch(err => console.error(`Failed to assign unregister role in ${member.guild.name}:`, err));
        }

        let targetChannelId: string | undefined;

        // Priority 1: Register Channel (if Register System Enabled)
        if (regConfig && regConfig.enabled && regConfig.registerChannelId) {
            targetChannelId = regConfig.registerChannelId;
        }
        // Priority 2: Welcome Channel (Legacy / Fallback)
        else if (welConfig && welConfig.enabled && welConfig.welcomeChannelId) {
            targetChannelId = welConfig.welcomeChannelId;
        }

        if (!targetChannelId) return;

        const channel = member.guild.channels.cache.get(targetChannelId) as TextChannel;
        if (!channel) return;

        try {
            const now = Date.now();
            const created = member.user.createdTimestamp;
            const accountAgeDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

            // Reliability Check (< 7 days suspect)
            const isReliable = accountAgeDays >= 7;
            const relStatusDisplay = isReliable ? 'Güvenilir!' : 'Şüpheli!';
            const relIcon = isReliable ? '☑️' : '⚠️';

            const embed = new EmbedBuilder()
                .setColor('#000000') // Black background like Nors
                .setAuthor({
                    name: `Yeni Bir Kullanıcı Katıldı, 👋 ${member.user.username}!`,
                    iconURL: member.guild.iconURL() || undefined
                })
                .setDescription(`
**Sunucumuza hoş geldin ${member}**

🔹 **Seninle birlikte ${member.guild.memberCount} kişiyiz.**

🧩 **Hesap oluşturulma tarihi:** <t:${Math.floor(created / 1000)}:f>
${relIcon} **Güvenilirlik durumu:** ${relStatusDisplay}
`)
                .setThumbnail(member.user.displayAvatarURL({ forceStatic: false, size: 256 }))
                .setFooter({ text: 'Valorica Asistan', iconURL: client.user.displayAvatarURL() });

            // Button with Target ID in customId
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`register_button_${member.id}`)
                        .setLabel('Normal Kayıt')
                        .setEmoji('🆔')
                        .setStyle(ButtonStyle.Primary)
                );

            // Welcome Text Logic
            let contentText = `${member} sunucuya giriş yaptı.`;
            contentText = regConfig.welcomeTextContent
                .replace(/{kullanıcı}/g, member.toString())
                .replace(/{sunucu}/g, member.guild.name)
                .replace(/{üyesayısı}/g, member.guild.memberCount.toString());

            if (contentText.includes('{yetkili}')) {
                const staffMentions = (regConfig.staffRoleIds || []).map((id: string) => `<@&${id}>`).join(' ');
                contentText = contentText.replace(/{yetkili}/g, staffMentions);
            }

            await channel.send({ content: contentText, embeds: [embed], components: [row] });
        } catch (error) {
            console.error(`Error sending welcome message in ${member.guild.name}:`, error);
        }
    }
};
