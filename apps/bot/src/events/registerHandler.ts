
import {
    Interaction, ModalBuilder, TextInputBuilder, TextInputStyle,
    ActionRowBuilder, EmbedBuilder, TextChannel, GuildMember
} from 'discord.js';
import { JsonDb } from '../utils/jsonDb';
import { RegisterConfig } from '../commands/registerConfig';
import { regDataDb } from '../commands/registerInfo';

const configDb = new JsonDb<RegisterConfig>('registerConfig.json', {});

interface RegistryStats {
    [guildId: string]: {
        [userId: string]: {
            total: number;
        }
    }
}
const statsDb = new JsonDb<RegistryStats>('registryStats.json', {});

export async function handleRegisterInteraction(interaction: Interaction) {
    const guild = interaction.guild;
    if (!guild) return;

    // 1. Handle Button Click -> Show Modal (RESTRICTED TO STAFF)
    if (interaction.isButton() && interaction.customId.startsWith('register_button')) {
        const config = configDb.read()[guild.id];
        const member = interaction.member as GuildMember;

        // Auth Check: Is Staff?
        if (config && config.staffRoleIds && config.staffRoleIds.length > 0) {
            const hasStaff = member.roles.cache.some(r => config.staffRoleIds.includes(r.id));
            if (!hasStaff && !member.permissions.has('Administrator')) {
                return interaction.reply({ content: '⛔ Bu butonu sadece kayıt yetkilileri kullanabilir.', ephemeral: true });
            }
        } else {
            if (!member.permissions.has('Administrator')) {
                return interaction.reply({ content: '⛔ Yetkili rolü ayarlanmamış, sadece yöneticiler kullanabilir.', ephemeral: true });
            }
        }

        // Extract Target ID
        const parts = interaction.customId.split('_');
        const targetId = parts.length > 2 ? parts[2] : null;

        if (!targetId) {
            return interaction.reply({ content: '⚠️ Bu buton eski bir versiyon veya hedef kullanıcı bulunamadı. Lütfen manuel kayıt (`/kayıt`) kullanın.', ephemeral: true });
        }

        // Check if Target is Already Registered
        try {
            const targetToCheck = await guild.members.fetch(targetId);
            if (config.memberRoleIds && config.memberRoleIds.length > 0) {
                const hasRole = targetToCheck.roles.cache.hasAny(...config.memberRoleIds);
                if (hasRole) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setAuthor({ name: 'HATA!', iconURL: 'https://cdn.discordapp.com/emojis/1043232675952296028.webp' })
                        .setDescription('Üye zaten kayıtlı! Üyenin üstünde kayıtlı rolü bulunduğu için kayıt işlemini gerçekleştiremiyorum.')
                        .setFooter({ text: 'Valorica Asistan' })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        } catch (e) {
            return interaction.reply({ content: '❌ Hedef kullanıcı bulunamadı.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId(`register_modal_${targetId}`)
            .setTitle('Kayıt Formu');

        const nameReq = config.nameAgeRequirement?.name ?? true;
        const ageReq = config.nameAgeRequirement?.age ?? true;

        const nameInput = new TextInputBuilder()
            .setCustomId('register_name')
            .setLabel("İsminiz")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: Ahmet')
            .setRequired(nameReq)
            .setMaxLength(32);

        const ageInput = new TextInputBuilder()
            .setCustomId('register_age')
            .setLabel("Yaşınız")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Örn: 18')
            .setRequired(ageReq)
            .setMaxLength(3);

        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput);
        const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(ageInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
        return;
    }

    // 2. Handle Modal Submit
    if (interaction.isModalSubmit() && interaction.customId.startsWith('register_modal')) {
        await interaction.deferReply({ ephemeral: true });

        const parts = interaction.customId.split('_');
        const targetId = parts.length > 2 ? parts[2] : null;

        if (!targetId) {
            return interaction.editReply('❌ Hedef kullanıcı kimliği bulunamadı.');
        }

        let targetMember: GuildMember | undefined;
        try {
            targetMember = await guild.members.fetch(targetId);
        } catch {
            return interaction.editReply('❌ Hedef kullanıcı sunucudan ayrılmış veya bulunamadı.');
        }

        const name = interaction.fields.getTextInputValue('register_name');
        const age = interaction.fields.getTextInputValue('register_age');

        const config = configDb.read()[guild.id];
        if (!config || !config.enabled) {
            return interaction.editReply('⚠️ Kayıt sistemi devre dışı veya ayarlanmamış.');
        }

        // --- NAME LOGIC ---
        // Format: [Tag] Name [Symbol/Separator] Age

        let finalName = name.replace(/\b\w/g, l => l.toUpperCase()); // Capitalize Name

        // Separator logic
        const separator = config.symbol ? ` ${config.symbol} ` : ' | ';

        if (age) {
            finalName = `${finalName}${separator}${age}`;
        }

        // Add Tag to Start
        if (config.tag) {
            finalName = `${config.tag} ${finalName}`;
        }

        const registrar = interaction.member as GuildMember;

        try {
            // Already Registered Check (Redundant safety)
            if (config.memberRoleIds && config.memberRoleIds.length > 0) {
                const hasRole = targetMember.roles.cache.hasAny(...config.memberRoleIds);
                if (hasRole) {
                    return interaction.editReply('❌ Bu üye zaten kayıtlı (İşlem iptal edildi).');
                }
            }

            // Update Name
            if (config.autoName) {
                await targetMember.setNickname(finalName.substring(0, 32)).catch(e => console.log('Nick error:', e.message));
            }

            // Add Roles
            if (config.memberRoleIds && config.memberRoleIds.length > 0) {
                await targetMember.roles.add(config.memberRoleIds);
            }

            // Remove Unregister Roles
            if (config.unregisterRoleIds && config.unregisterRoleIds.length > 0) {
                await targetMember.roles.remove(config.unregisterRoleIds).catch(e => console.warn("Failed to remove unregister role", e));
            }

            // Update Stats
            statsDb.update(data => {
                if (!data[guild.id]) data[guild.id] = {};
                if (!data[guild.id][registrar.id]) {
                    data[guild.id][registrar.id] = { total: 0 };
                }
                data[guild.id][registrar.id].total += 1;
            });

            // Update Registration Data (Target) -- HISTORY FIX HERE
            regDataDb.update(data => {
                if (!data[guild.id]) data[guild.id] = {};

                const existingNames = data[guild.id][targetMember!.id]?.previousNames || [];
                // Save the NAME part (finalName includes tag/symbol) or just the input Name? 
                // Usually history tracks the full display name used.
                existingNames.push(finalName);

                data[guild.id][targetMember!.id] = {
                    registrarId: registrar.id,
                    registeredAt: Date.now(),
                    previousNames: existingNames // Save History
                };
            });

            const totalStats = statsDb.read()[guild.id][registrar.id]?.total || 0;

            // Log
            const logChanId = config.registerLogChannelId || (config as any).logChannelId;
            if (logChanId) {
                const logChannel = guild.channels.cache.get(logChanId) as TextChannel;
                if (logChannel) {
                    // Filter roles
                    const displayedRoles = config.memberRoleIds.filter((id: string) => !config.unregisterRoleIds.includes(id));

                    const logEmbed = new EmbedBuilder()
                        .setColor('#000000')
                        .setAuthor({
                            name: 'Kayıt Yapıldı!',
                            iconURL: guild.iconURL() || undefined
                        })
                        .setThumbnail(targetMember.user.displayAvatarURL())
                        .setDescription(`
| **Kayıt Bilgileri**

• **Kayıt Edilen Kullanıcı:** ${targetMember}
• **Kayıt Eden Kullanıcı:** ${registrar}
• **Verilen Roller:** ${displayedRoles.map((id: string) => `<@&${id}>`).join(', ')}
• **Yeni İsim:** \`${config.autoName ? finalName : 'Değiştirilmedi (Oto-İsim Kapalı)'}\`
• **Kayıt Türü :** \`Normal (Buton)\`
`)
                        .setFooter({
                            text: `${registrar.user.username}, normal kayıt sayın: ${totalStats}`,
                            iconURL: registrar.user.displayAvatarURL()
                        })
                        .setTimestamp();

                    logChannel.send({ embeds: [logEmbed] });
                }
            }

            // Chat Message
            if (config.registerMessageChannelId) {
                const msgChan = guild.channels.cache.get(config.registerMessageChannelId) as TextChannel;
                if (msgChan) {
                    if (config.customWelcomeEnabled && config.customWelcomeContent) {
                        let content = config.customWelcomeContent
                            .replace(/{kullanıcı}/g, targetMember.toString())
                            .replace(/{sunucu}/g, guild.name)
                            .replace(/{üyesayısı}/g, guild.memberCount.toString());
                        msgChan.send(content);
                    } else {
                        msgChan.send(`Aramıza hoş geldin ${targetMember}!`);
                    }
                }
            }

            // Response
            await interaction.editReply(`✅ **${targetMember.user.username}** başarıyla kayıt edildi.`);

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ İşlem sırasında bir hata oluştu.');
        }
    }
}
