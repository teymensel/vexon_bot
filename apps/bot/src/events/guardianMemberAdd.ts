
import { Events, GuildMember, TextChannel, EmbedBuilder, AuditLogEvent } from 'discord.js';
import { guardianDb } from '../utils/guardianDb';

export default {
    name: 'guildMemberAddGuardian', // Custom name internally, but bound to guildMemberAdd
    async execute(member: GuildMember) {
        // Restriction: Only Bot 2
        const client = member.client as any;
        if (client.botIndex !== 4) return;

        // 1. Is it a bot?
        if (!member.user.bot) return;

        const config = guardianDb.read()[member.guild.id];
        // If system logic disabled or no config, skip
        if (!config || !config.enabled) return;

        // 2. Is it Whitelisted?
        if (config.whitelistIds.includes(member.id)) return;

        // 3. UNAUTHORIZED BOT DETECTED -> ACTION: KICK
        try {
            await member.kick('Bot Guardian: Unauthorized Bot Detected');

            // 4. Log It
            if (config.logChannelId) {
                const channel = member.guild.channels.cache.get(config.logChannelId) as TextChannel;
                if (channel) {

                    // Try to fetch who added it
                    // Wait a moment for Audit Log to be generated
                    // await new Promise(r => setTimeout(r, 1000)); 
                    // Actually async fetch is enough usually

                    let executor = 'Bilinmiyor';
                    try {
                        const logs = await member.guild.fetchAuditLogs({
                            type: AuditLogEvent.BotAdd,
                            limit: 1,
                        });
                        const entry = logs.entries.first();

                        // Check if the log entry target matches the kicked bot and is recent (last 10 sec)
                        if (entry && entry.target && entry.target.id === member.id) {
                            const createdTime = entry.createdTimestamp;
                            if (Date.now() - createdTime < 10000) {
                                executor = `${entry.executor} (\`${entry.executor?.id}\`)`;
                            }
                        }
                    } catch (e) {
                        console.warn('Could not fetch audit logs:', e);
                    }

                    const embed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('🛡️ İzinsiz Bot Engellendi!')
                        .setDescription(`Sunucuya izinsiz bir bot eklendi ve sistem tarafından atıldı.`)
                        .addFields(
                            { name: '🤖 Atılan Bot', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
                            { name: '👤 Ekleyen Kişi', value: executor, inline: true }
                        )
                        .setThumbnail(member.user.displayAvatarURL())
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                    // Mention the adding user to alert them? Maybe not spam.
                    await channel.send(`⚠️ <@${member.guild.ownerId}> Dikkat! İzinsiz bot girişimi.`);
                }
            }
        } catch (error) {
            console.error(`Failed to kick unauthorized bot ${member.user.tag}:`, error);
        }
    }
};
