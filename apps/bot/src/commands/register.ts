import { Message, GuildMember, EmbedBuilder, TextChannel, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';
import { RegisterConfig } from './registerConfig'; // Import interface
import { regDataDb } from './registerInfo'; // Import the new DB

const configDb = new JsonDb<RegisterConfig>('registerConfig.json', {});

interface RegistryStats {
    [guildId: string]: {
        [userId: string]: {
            total: number;
        }
    }
}
const statsDb = new JsonDb<RegistryStats>('registryStats.json', {});

export default {
    data: new SlashCommandBuilder()
        .setName('kayıt')
        .setDescription('Kullanıcıyı kayıt eder.')
        .addUserOption(option =>
            option.setName('kullanıcı').setDescription('Kayıt edilecek kullanıcı').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('isim').setDescription('Yeni isim').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('yaş').setDescription('Yaş (Opsiyonel)').setRequired(false)
        ),
    async execute(interaction: ChatInputCommandInteraction | Message, args?: string[]) {
        const client = interaction.client as any;
        if (client.botIndex !== 3) return;

        const isSlash = interaction instanceof ChatInputCommandInteraction;
        const guild = interaction.guild!;
        const member = isSlash ? (interaction as ChatInputCommandInteraction).member as GuildMember : (interaction as Message).member;

        const config = configDb.read()[guild.id];

        // 1. Check if System Enabled
        if (!config || !config.enabled) {
            const msg = '⚠️ Kayıt sistemi bu sunucuda aktif değil veya ayarlanmamış.';
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ content: msg, ephemeral: true }) : (interaction as Message).reply(msg);
        }

        // 2. Check Auth
        if (config.staffRoleIds.length > 0) {
            const hasStaffRole = member?.roles.cache.some(role => config.staffRoleIds.includes(role.id));
            if (!hasStaffRole && !member?.permissions.has('Administrator')) {
                const msg = '⛔ Bu komutu kullanmak için kayıt yetkilisi olmalısın!';
                return isSlash ? (interaction as ChatInputCommandInteraction).reply({ content: msg, ephemeral: true }) : (interaction as Message).reply(msg);
            }
        }

        // 3. Parse Target & Name
        let targetUser: GuildMember | null = null;
        let newName = '';
        let age: string | number | null = null;

        if (isSlash) {
            const slash = interaction as ChatInputCommandInteraction;
            targetUser = slash.options.getMember('kullanıcı') as GuildMember;
            newName = slash.options.getString('isim')!;
            age = slash.options.getInteger('yaş');
        } else {
            // Legacy (+kayıt @user Name Age)
            const msg = interaction as Message;
            targetUser = msg.mentions.members?.first() || null;
            if (!targetUser || !args) {
                return msg.reply('**Kullanım:** `+kayıt @kullanıcı İsim Yaş`');
            }
            // Parse Name/Age from args
            const params = args.filter(a => !a.startsWith('<@') && !a.endsWith('>'));
            const lastParam = params[params.length - 1];
            if (params.length > 1 && !isNaN(Number(lastParam))) {
                age = lastParam;
                newName = params.slice(0, -1).join(' ');
            } else {
                newName = params.join(' ');
            }
        }

        if (!targetUser) {
            const msg = 'Kullanıcı bulunamadı.';
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ content: msg, ephemeral: true }) : (interaction as Message).reply(msg);
        }

        // Hierarchy Check
        if (targetUser.id === guild.ownerId) {
            const msg = '❌ Sunucu sahibini kayıt edemezsin/değiştiremezsin.';
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ content: msg, ephemeral: true }) : (interaction as Message).reply(msg);
        }

        if (member && member.id !== guild.ownerId) {
            if (targetUser.roles.highest.position >= member.roles.highest.position) {
                const msg = '❌ Senden daha yüksek/eşit yetkideki birini kayıt edemezsin.';
                return isSlash ? (interaction as ChatInputCommandInteraction).reply({ content: msg, ephemeral: true }) : (interaction as Message).reply(msg);
            }
        }

        // Formatting
        newName = newName.replace(/\b\w/g, l => l.toUpperCase());

        // Append Symbol / Tag
        let finalName = newName;
        // Reset base for reconstruction
        if (age) finalName += ` | ${age}`;

        // Prepend Tag/Symbol
        // Check user config: Usually "Tag Symbol Name" or "Symbol Name".
        // Screenshot showed 'Tag: Tag yok', 'Sembol: Sembol yok'.
        // If they exist:
        if (config.symbol) finalName = `${config.symbol} ${finalName}`;
        if (config.tag) finalName = `${config.tag} ${finalName}`;

        // 4. Perform Action
        try {
            // Update Name (ensure max 32 chars)
            await targetUser.setNickname(finalName.substring(0, 32)).catch(e => console.warn('Nickname update failed (likely higher role):', e.message));

            // Roles
            if (config.memberRoleIds.length > 0) {
                await targetUser.roles.add(config.memberRoleIds).catch(e => console.error('Role add failed:', e));
            }

            // Unregister Role Removal
            if (config.unregisterRoleIds && config.unregisterRoleIds.length > 0) {
                await targetUser.roles.remove(config.unregisterRoleIds).catch(e => console.warn("Failed to remove unregister role", e));
            }

            // Update Stats (Registrar)
            const registrarId = member!.user.id;
            statsDb.update(data => {
                if (!data[guild.id]) data[guild.id] = {};
                if (!data[guild.id][registrarId]) {
                    data[guild.id][registrarId] = { total: 0 };
                }
                data[guild.id][registrarId].total += 1;
            });

            // Save Registration Data (Target)
            regDataDb.update(data => {
                if (!data[guild.id]) data[guild.id] = {};
                data[guild.id][targetUser!.id] = {
                    registrarId: registrarId,
                    registeredAt: Date.now(),
                    // previousNames could be managed here by pushing current nickname before change?
                    // For now, simple.
                };
            });

            // 5. Response & Log
            const stats = statsDb.read()[guild.id][registrarId];

            const successEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: 'Kayıt Başarılı', iconURL: guild.iconURL() || undefined })
                .setDescription(`${targetUser} başarıyla kayıt edildi!`);

            if (isSlash) {
                await (interaction as ChatInputCommandInteraction).reply({ embeds: [successEmbed] });
            } else {
                await (interaction as Message).reply({ embeds: [successEmbed] });
            }

            // Log Channel
            // Config field rename check: registerLogChannelId vs logChannelId
            const logChanId = config.registerLogChannelId || (config as any).logChannelId;

            if (logChanId) {
                const logChannel = guild.channels.cache.get(logChanId) as TextChannel;
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#000000') // Nors Black
                        .setAuthor({ name: 'Kayıt Yapıldı!', iconURL: guild.iconURL() || undefined })
                        .setThumbnail(targetUser.user.displayAvatarURL())
                        .setDescription(`
| **Kayıt Bilgileri**

• **Kayıt Edilen Kullanıcı:** ${targetUser}
• **Kayıt Eden Kullanıcı:** ${member?.user}
• **Verilen Roller:** ${config.memberRoleIds.map(id => `<@&${id}>`).join(', ')}
• **Yeni İsim:** \`${finalName}\`
• **Kayıt Türü :** \`Manuel\`
`)
                        .setFooter({ text: `${member?.user.username}, normal kayıt sayın: ${stats.total}`, iconURL: member?.user.displayAvatarURL() })
                        .setTimestamp();

                    logChannel.send({ embeds: [logEmbed] });
                }
            }

            // Welcome Message in Chat
            if (config.registerMessageChannelId) {
                const msgChan = guild.channels.cache.get(config.registerMessageChannelId) as TextChannel;
                if (msgChan) msgChan.send(`Aramıza hoş geldin ${targetUser}!`);
            }

        } catch (error) {
            console.error(error);
            const err = '❌ Kayıt işlemi sırasında bir hata oluştu.';
            if (isSlash && !(interaction as ChatInputCommandInteraction).replied) {
                (interaction as ChatInputCommandInteraction).reply({ content: err, ephemeral: true });
            } else if (!isSlash) {
                (interaction as Message).reply(err);
            }
        }
    }
};
