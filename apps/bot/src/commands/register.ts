
import { Message, GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';

// Reusing interfaces would be better in a shared types file, but keeping local for simplicity in this flow
interface RegisterConfig {
    [guildId: string]: {
        staffRoleIds: string[];
        memberRoleIds: string[];
        logChannelId?: string;
        enabled: boolean;
        tag?: string;
    };
}

interface RegistryStats {
    [guildId: string]: {
        [userId: string]: {
            total: number;
            male: number; // Placeholder for future
            female: number; // Placeholder
        }
    }
}

const configDb = new JsonDb<RegisterConfig>('registerConfig.json', {});
const statsDb = new JsonDb<RegistryStats>('registryStats.json', {});

export default {
    data: {
        name: 'kayıt',
        description: 'Kullanıcıyı kayıt eder.'
    },
    async execute(message: Message, args: string[]) {
        // Restriction: Only Bot 2 (Valorica)
        const client = message.client as any;
        if (client.botIndex !== 2) return;

        const guildId = message.guild!.id;
        const config = configDb.read()[guildId];

        // 1. Check if System Enabled
        if (!config || !config.enabled) {
            return message.reply('⚠️ Kayıt sistemi bu sunucuda aktif değil veya ayarlanmamış.');
        }

        // 2. Check Auth (Is user Staff?)
        // If no staff roles set, maybe allow admin only? For now strict check if roles exist.
        if (config.staffRoleIds.length > 0) {
            const hasStaffRole = message.member?.roles.cache.some(role => config.staffRoleIds.includes(role.id));
            if (!hasStaffRole && !message.member?.permissions.has('Administrator')) {
                return message.reply('⛔ Bu komutu kullanmak için kayıt yetkilisi olmalısın!');
            }
        }

        // 3. Parse Args
        // Expected: +kayıt <@target> <Name>
        const targetUser = message.mentions.members?.first();
        // Name is the rest of strings, standard args parsing removes mentions often, but here args depends on handler
        // Let's assume standard split: ["<@123>", "Ahmet", "Can"]
        if (!targetUser) {
            return message.reply('**Kullanım:** `+kayıt @kullanıcı İsim Yaş` (Yaş opsiyonel)');
        }

        // Filter out the mention from args to get the name
        const nameParts = args.filter(arg => !arg.startsWith('<@') && !arg.endsWith('>'));
        let newName = nameParts.join(' ');

        // Auto Capitalize
        newName = newName.replace(/\b\w/g, l => l.toUpperCase());

        if (!newName) {
            return message.reply('⚠️ Lütfen bir isim belirtin!');
        }

        // 4. Perform Action
        try {
            // 4.1 Update Nickname
            // Tag Logic: If tag exists in config, prepend it? User didn't explicitly ask but it's "Professional" standard.
            // Let's keep it simple: Just name for now explicitly requested.
            await targetUser.setNickname(newName);

            // 4.2 Add Roles
            if (config.memberRoleIds.length > 0) {
                await targetUser.roles.add(config.memberRoleIds);
            }

            // 4.3 Update Stats
            statsDb.update(data => {
                if (!data[guildId]) data[guildId] = {};
                if (!data[guildId][message.author.id]) {
                    data[guildId][message.author.id] = { total: 0, male: 0, female: 0 };
                }
                data[guildId][message.author.id].total += 1;
            });

            // 5. Response & Log
            const stats = statsDb.read()[guildId][message.author.id];

            // Success Embed to Channel
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00') // Success Green
                .setDescription(`✅ ${targetUser} başarıyla kayıt edildi!
                
                📋 **Yeni İsim:** \`${newName}\`
                🛡️ **Verilen Roller:** ${config.memberRoleIds.map(id => `<@&${id}>`).join(', ')}
                👤 **Yetkili:** ${message.author}
                📊 **Toplam Kayıtların:** \`${stats.total}\`
                `)
                .setAuthor({ name: 'Kayıt Başarılı', iconURL: message.guild!.iconURL() || undefined });

            message.reply({ embeds: [successEmbed] });

            // Log Channel
            if (config.logChannelId) {
                const logChannel = message.guild!.channels.cache.get(config.logChannelId) as TextChannel;
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#2b2d31')
                        .setTitle('📝 Kullanıcı Kayıt Edildi')
                        .setThumbnail(targetUser.user.displayAvatarURL())
                        .addFields(
                            { name: 'Kullanıcı', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
                            { name: 'Yetkili', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                            { name: 'Yeni İsim', value: `\`${newName}\``, inline: true },
                            { name: 'Toplam Kayıt', value: `\`${stats.total}\``, inline: true }
                        )
                        .setTimestamp();
                    logChannel.send({ embeds: [logEmbed] });
                }
            }

        } catch (error) {
            console.error(error);
            message.reply('❌ Kayıt işlemi sırasında bir hata oluştu. (Yetkim yetersiz olabilir veya rol hiyerarşisi sorunu)');
        }
    }
};
