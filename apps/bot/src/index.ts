import { Client, GatewayIntentBits, Collection, Interaction, EmbedBuilder, ActivityType, Partials, REST, Routes, Events } from 'discord.js';
import { joinVoiceChannel, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrefixDb } from './utils/prefixDb';
import { autoResDb } from './commands/autoResponder';
import { afkDb } from './commands/afk';
import { ChannelDb } from './utils/channelDb';

// Verify these imports exist or were created (we created PrefixDb)
import { handleAntiSpam } from './antiSpam';
import { handleAutoModExecution } from './autoModIntegration';
import { AnnouncementDb } from './utils/announcementDb';
import { VoiceManager } from './utils/voiceManager';

import { generateAIResponse } from './utils/aiService';

// Community Events
import memberAdd from './events/guildMemberAdd';
import memberRemove from './events/guildMemberRemove';
import guardianMemberAdd from './events/guardianMemberAdd';
import { handleTicketInteraction } from './events/ticketHandler';
import { handleRegisterInteraction } from './events/registerHandler';
// import { Utils } from './utils/utils'; // Removed invalid import
import { GuardianLogic } from './utils/guardianLogic';
import { inviteManager } from './utils/inviteManager'; // Added import
import { statManager } from './utils/statManager';



const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error: any) => {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.message.includes('getaddrinfo')) {
        console.warn('Network Error (Suppressed exit):', error.message);
        return;
    }
    console.error('Uncaught exception:', error);
});

// Extend Client properly in a real app, but for now we attach to client instance
class BotClient extends Client {
    commands: Collection<string, any> = new Collection();
    botName: string;
    botIndex: number;

    constructor(options: any, botName: string, botIndex: number) {
        super(options);
        this.botName = botName;
        this.botIndex = botIndex;
    }
}

// Load Commands
const foldersPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

const commands = new Collection<string, any>();
for (const file of commandFiles) {
    const filePath = path.join(foldersPath, file);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const command = require(filePath);
    const cmd = command.default || command;

    if (Array.isArray(cmd)) {
        cmd.forEach(c => {
            if ('data' in c && 'execute' in c) {
                commands.set(c.data.name, c);
            }
        });
    } else if ('data' in cmd && 'execute' in cmd) {
        commands.set(cmd.data.name, cmd);
    }
}

async function createBot(token: string, botName: string, botIndex: number) {
    const client = new BotClient({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.AutoModerationExecution,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildInvites, // Required for invite events
        ],
        partials: [Partials.GuildMember, Partials.User, Partials.Channel], // Required for some events
    }, botName, botIndex);

    client.commands = commands;

    client.once('ready', async () => {
        console.log(`[${botName}] Logged in as ${client.user?.tag}!`);

        // Initialize Invite Cache
        await inviteManager.initialize(client);

        // --- SLASH COMMAND REGISTRATION ---
        const slashCommands: any[] = [];
        client.commands.forEach((cmd: any) => {
            if (cmd.data && typeof cmd.data.toJSON === 'function') {
                const name = cmd.data.name;

                // --- COMMAND FILTERING LOGIC ---
                // Bot 3 (Assistant): Duyuru, Ticket, Register, Custom Configs, Emoji, Utils, AFK, Server
                if (name.startsWith('duyuru') || name.startsWith('ticket') || name.startsWith('kayıt') || name === 'özelmesaj' || name === 'isimyaşayarla' || name === 'otoisimayarla' || name === 'emojiekle' || name === 'say' || name === 'selamsistemi' || name === 'afk' || name === 'sunucu' || name === 'prefixler' || name === 'kontrol' || name === 'rolbuton') {
                    if (botIndex !== 3) return;
                }

                // Bot 4 (Guardian): Security
                if (['bot-kanal', 'ai-kanal', 'logkur', 'bot-whitelist'].includes(name)) {
                    if (botIndex !== 4) return;
                }

                slashCommands.push(cmd.data.toJSON());
            }
        });

        if (slashCommands.length > 0) {
            const rest = new REST({ version: '10' }).setToken(token);
            try {
                if (client.user) {
                    const guilds = client.guilds.cache.map(guild => guild.id);
                    for (const guildId of guilds) {
                        try {
                            await rest.put(
                                Routes.applicationGuildCommands(client.user.id, guildId),
                                { body: slashCommands },
                            );
                            console.log(`[${botName}] Registered commands to Guild: ${guildId}`);
                        } catch (e) {
                            console.error(`[${botName}] Failed to register for guild ${guildId}:`, e);
                        }
                    }

                    client.user.setPresence({
                        activities: [{ name: 'Made by 🖤 Teymensel', type: ActivityType.Playing }],
                        status: 'online'
                    });
                }
            } catch (error) {
                console.error(`[${botName}] Failed to register slash commands:`, error);
            }
        }

        // --- ANNOUNCEMENT SCHEDULER (Bot 2 Only) ---
        if (botIndex === 2) {
            console.log('[Scheduler] Duyuru zamanlayıcısı başlatıldı.');
            setInterval(async () => {
                const now = Date.now();
                const allData = AnnouncementDb.getAllScheduled();

                allData.forEach(async (guildData: any) => {
                    const guildId = guildData.guildId;
                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) return;

                    for (const task of guildData.tasks) {
                        if (task.executeAt <= now) {
                            const channel = guild.channels.cache.get(task.channelId);
                            if (channel && channel.isTextBased()) {
                                try {
                                    await (channel as any).send(task.content);
                                    console.log(`[Scheduler] Executed task ${task.id} in ${guild.name}`);
                                } catch (e) {
                                    console.error(`[Scheduler] Failed task ${task.id}`, e);
                                }
                            }
                            AnnouncementDb.removeSchedule(guildId, task.id);
                        }
                    }
                });
            }, 60000);
        }

        // Auto-join voice channel if saved
        const savedChannel = VoiceManager.getChannel(client.user?.id || '');
        if (savedChannel) {
            const guild = client.guilds.cache.get(savedChannel.guildId);
            if (guild) {
                const channel = guild.channels.cache.get(savedChannel.channelId);
                if (channel && channel.isVoiceBased()) {
                    try {
                        const connection = joinVoiceChannel({
                            channelId: channel.id,
                            guildId: guild.id,
                            adapterCreator: guild.voiceAdapterCreator as any,
                            selfDeaf: false,
                        });

                        connection.on('error', (error) => {
                            console.warn(`[${botName}] Voice Connection Error (Handled):`, error.message);
                            // Optional: connection.destroy(); 
                        });

                        console.log(`[${botName}] Automatically reconnected to voice channel: ${channel.name}`);
                    } catch (error) {
                        console.error(`[${botName}] Failed to rejoin voice channel:`, error);
                    }
                }
            }
        }
    });

    client.on('interactionCreate', async (interaction: Interaction) => {
        // Handle Ticket Buttons
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('register')) {
                await handleRegisterInteraction(interaction);
                return;
            }

            // Handle Role Button
            if (interaction.customId.startsWith('give_role_')) {
                const roleId = interaction.customId.replace('give_role_', '');
                const role = interaction.guild?.roles.cache.get(roleId);
                const member = interaction.member as any;

                if (!role) {
                    await interaction.reply({ content: '❌ Rol bulunamadı.', ephemeral: true });
                    return;
                }

                if (member.roles.cache.has(roleId)) {
                    try {
                        await member.roles.remove(role);
                        await interaction.reply({ content: `➖ **${role.name}** rolü üzerinizden alındı.`, ephemeral: true });
                    } catch (error) {
                        await interaction.reply({ content: '❌ Rol alınamadı (Yetki sorunu).', ephemeral: true });
                    }
                } else {
                    try {
                        await member.roles.add(role);
                        await interaction.reply({ content: `✅ **${role.name}** rolü size verildi.`, ephemeral: true });
                    } catch (error) {
                        await interaction.reply({ content: '❌ Rol verilemedi.', ephemeral: true });
                    }
                }
                return;
            }

            try {
                await handleTicketInteraction(interaction);
            } catch (e) {
                console.error('Ticket Error:', e);
            }
            return;
        }




        // Handle Modals
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('register')) {
                await handleRegisterInteraction(interaction);
                return;
            }
        }

        if (!interaction.isChatInputCommand()) return;

        const command = (interaction.client as BotClient).commands.get(interaction.commandName);

        if (!command) {
            console.error(`[${botName}] No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    });

    // AutoMod Event
    client.on('autoModerationActionExecution', handleAutoModExecution);

    // Welcome / Goodbye Events
    client.on('guildMemberAdd', (member) => memberAdd.execute(member as any));
    client.on('guildMemberRemove', (member) => memberRemove.execute(member as any));

    // Bot Guardian (Bot 2 Only) -> MOVED TO BOT 4
    // client.on('guildMemberAdd', (member) => guardianMemberAdd.execute(member as any));

    // Guardian Logic Hooks (Bot 4)
    if (botIndex === 4) {
        client.on('messageCreate', async (message) => {
            // New Guardian Logic (Chat Protection)
            await GuardianLogic.checkMessage(message as any);
        });

        client.on('guildMemberAdd', async (member) => {
            await GuardianLogic.checkMemberJoin(member as any);
        });

        // Anti-Nuke Events
        client.on('channelCreate', async (channel) => {
            if (channel.guild) await GuardianLogic.checkChannelMonitor(channel, 'create');
        });
        client.on('channelDelete', async (channel) => {
            if (channel instanceof require('discord.js').GuildChannel || (channel as any).guild) await GuardianLogic.checkChannelMonitor(channel, 'delete');
        });

        client.on('roleCreate', async (role) => {
            await GuardianLogic.checkRoleMonitor(role, 'create');
        });
        client.on('roleDelete', async (role) => {
            await GuardianLogic.checkRoleMonitor(role, 'delete');
        });

        client.on('guildBanAdd', async (ban) => {
            await GuardianLogic.checkBanMonitor(ban);
        });

        client.on('guildMemberRemove', async (member) => {
            await GuardianLogic.checkKickMonitor(member);
        });
    }

    // Prefix Command Handler
    client.on('messageCreate', async (message) => {
        // Run Anti-Spam check first (Legacy) -> Can potentially remove if GuardianLogic covers it, keeping for now
        await handleAntiSpam(message);

        if (message.author.bot) return;

        // Dynamic Prefix
        const botIndex = (client as BotClient).botIndex || 1;
        const prefix = PrefixDb.getPrefix(message.guild?.id || '', botIndex);



        // --- AI Mention Handler ---
        if (message.mentions.everyone) return; // Ignore @everyone and @here

        if (message.mentions.has(client.user!)) {
            // Check if it's a direct mention to THIS bot (and not just a mass mention that includes it)
            // Logic: content contains <@CLIENT_ID>
            const mentionStr = `<@${client.user!.id}>`;

            // AI CHANNEL BLACKLIST CHECK
            if (message.guild && !ChannelDb.isAiAllowed(message.guild.id, message.channel.id)) {
                // AI is disabled in this channel. Ignore.
                // return; // Don't return yet, check Auto Responder first? 
                // Actually, user wants "selamsistemi mesaj kısmından...". 
                // Usually AutoResponder works EVERYWHERE or specific channels? 
                // Let's assume it works everywhere unless constrained. 
                // But the AI check `return` blocks AI. 
                // I will add the AutoResponder check BEFORE this restriction if it should be global, OR inside if it respects AI channel (but "sa" is general).
                // Let's place it BEFORE the AiAllowed check so "sa" works even if AI is off.
            }

            // --- LEGACY PREFIX COMMANDS FOR BOT 3 ---
            if (message.guild && !message.author.bot && botIndex === 3) {
                const prefix = PrefixDb.getPrefix(message.guild.id, 3) || 'va!';
                if (message.content.startsWith(prefix)) {
                    const args = message.content.slice(prefix.length).trim().split(/ +/);
                    const command = args.shift()?.toLowerCase();

                    console.log(`[Prefix Command] Prefix: ${prefix}, Command: ${command}`); // Debug

                    if (command === 'sunucubilgi') {
                        const guild = message.guild;
                        const owner = await guild.fetchOwner().catch(() => null);
                        const totalMembers = guild.memberCount;
                        const humans = guild.members.cache.filter(m => !m.user.bot).size;
                        const bots = totalMembers - humans;
                        const createdDate = `<t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`;

                        const embed = new EmbedBuilder()
                            .setColor('#000000')
                            .setAuthor({ name: `${guild.name} - Sunucu Bilgileri`, iconURL: guild.iconURL() || undefined })
                            .setThumbnail(guild.iconURL() || null)
                            .addFields(
                                { name: '👑 Sunucu Sahibi', value: owner ? `${owner.user.tag} (<@${owner.id}>)` : 'Bilinmiyor', inline: true },
                                { name: '📅 Kuruluş Tarihi', value: createdDate, inline: true },
                                { name: '🆔 Sunucu ID', value: guild.id, inline: true },
                                { name: '👥 Üyeler', value: `Toplam: **${totalMembers}**\nİnsan: **${humans}**\nBot: **${bots}**`, inline: true },
                                { name: '📊 Boost D.', value: `Sayısı: **${guild.premiumSubscriptionCount || 0}**\nSeviye: **${guild.premiumTier}**`, inline: true }
                            )
                            .setFooter({ text: `Valorica Asistan • ${new Date().toLocaleDateString('tr-TR')}` });

                        message.reply({ embeds: [embed] }).catch(() => { });
                        return;
                    }

                    if (command === 'owner') {
                        const owner = await message.guild.fetchOwner().catch(() => null);
                        const embed = new EmbedBuilder()
                            .setColor('#000000')
                            .setTitle('👑 Sunucu Sahibi')
                            .setDescription(owner ? `Bu sunucunun sahibi: **${owner.user.tag}** (<@${owner.id}>)` : 'Sahip bilgisi çekilemedi.')
                            .setThumbnail(owner?.user.displayAvatarURL() || null);

                        message.reply({ embeds: [embed] }).catch(() => { });
                        return;
                    }

                    if (command === 'help' || command === 'yardım') {
                        const embed = new EmbedBuilder()
                            .setColor('#000000')
                            .setTitle('Valorica Asistan - Yardım')
                            .setDescription(`Bot komutlarına erişmek için **/help** menüsünü kullanmanız önerilir.\n\n**Prefix Komutları (${prefix}):**\n\`${prefix}sunucubilgi\` - Sunucu istatistikleri\n\`${prefix}owner\` - Sunucu sahibi\n\`${prefix}yardım\` - Bu menü`)
                            .setFooter({ text: 'Daha fazla özellik için Slash Commands (/) kullanın.' });

                        message.reply({ embeds: [embed] }).catch(() => { });
                        return;
                    }
                }
            }

            // --- AUTO RESPONDER (Selam Sistemi) ---
            if (message.guild && !message.author.bot) {
                const autoConfig = autoResDb.read()[message.guild.id];
                if (autoConfig && autoConfig.enabled && autoConfig.responses) {
                    const content = message.content.trim().toLowerCase();
                    const match = autoConfig.responses.find(r => r.input === content);
                    if (match) {
                        message.reply(match.output).catch(() => { });
                        return; // Stop processing (Don't do AI or Commands if matched)
                    }
                }
            }

            if (message.guild && !ChannelDb.isAiAllowed(message.guild.id, message.channel.id)) {
                return;
            }

            // RELAXED CHECK: If mentioned (via ping or text) OR replied to (if pinged), process it.
            // We removed the strict `message.content.includes(mentionStr)` check because replies usually
            // put the mention in metadata, not in the content string.

            // Extract clean text (removing the mention if it exists in text)
            const cleanText = message.content.replace(new RegExp(`<@!?${client.user!.id}>`, 'g'), '').trim();

            // If empty (e.g. just a ping), or if it's a reply with content, accept it.
            // Note: If cleanText is empty (user just pinged), we ask "Efendim?".
            // If it's a reply, cleanText will be the reply content.

            if (!cleanText && !message.attachments.size) {
                await message.reply(`Efendim? Ben ${botName}, nasıl yardımcı olabilirim? 🤖`);
                return;
            }

            // AI Rate Limit
            const now = Date.now();
            const cooldownAmount = 5000; // 5 seconds
            const lastChat = (client as any).aiCooldowns?.get(message.author.id);

            if (lastChat && (now - lastChat < cooldownAmount)) {
                // Silent ignore or react? Silent is better for spam.
                // Or maybe react with ⏳ once.
                return;
            }

            if (!(client as any).aiCooldowns) (client as any).aiCooldowns = new Map();
            (client as any).aiCooldowns.set(message.author.id, now);

            try {
                // Send typing indicator
                await message.channel.sendTyping();

                // --- GATHER SERVER CONTEXT ---
                const guild = message.guild!;
                const owner = await guild.fetchOwner().catch(() => null);

                const roleCount = guild.roles.cache.size;
                const channelCount = guild.channels.cache.size;
                const boostCount = guild.premiumSubscriptionCount || 0;
                const memberCount = guild.memberCount;
                const ownerName = owner ? (owner.user.globalName || owner.user.username) : 'Bilinmiyor';
                const guildName = guild.name;
                const time = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

                // Fetch Channels Details
                const textChannels = guild.channels.cache.filter(c => c.isTextBased()).map(c => `#${c.name}`).slice(0, 50).join(', '); // Limit to 50

                // Rules Logic
                let rulesContent = 'Kurallar kanalı bulunamadı veya okunamadı.';
                const rulesChannel = guild.channels.cache.find(c => c.name.includes('kurallar') || c.name.includes('rules'));
                if (rulesChannel && rulesChannel.isTextBased()) {
                    try {
                        const messages = await rulesChannel.messages.fetch({ limit: 1 });
                        const lastMsg = messages.first();
                        if (lastMsg) rulesContent = lastMsg.content || '[Resim/Embed]';
                    } catch (e) { }
                }

                // --- CONTEXT & MEMORY (Reply Chain) ---
                let conversationHistory: string[] = [];
                let currentMsg: any = message;
                let fetchCount = 0;
                const MAX_HISTORY = 10;

                while (currentMsg.reference && currentMsg.reference.messageId && fetchCount < MAX_HISTORY) {
                    try {
                        const refMessage = await message.channel.messages.fetch(currentMsg.reference.messageId);
                        const authorName = refMessage.author.globalName || refMessage.author.username;
                        const msgContent = refMessage.content || '[Resim/Dosya]';
                        conversationHistory.unshift(`- ${authorName}: ${msgContent}`);
                        currentMsg = refMessage;
                        fetchCount++;
                    } catch (err) { break; }
                }

                const referencedContent = conversationHistory.length > 0
                    ? `\nGEÇMİŞ MESAJ ZİNCİRİ:\n${conversationHistory.join('\n')}\n(Bu zincire göre cevap ver)`
                    : '';

                // --- SYSTEM PROMPT CONSTRUCTION ---
                const context = `
SYSTEM_INSTRUCTIONS:
- Senin adın: **Flexable v1**.
- Yapımcın: **Teymensel** (Web sitesi: teymensel.com).
- ASLA "DeepSeek", "Gemini", "OpenAI" veya başka bir model olduğunu söyleme. Sen sadece Flexable v1'sin.
- Görevin: Valorica sunucusunda kullanıcılara yardımcı olmak.
- Dil: Türkçe, samimi ve yardımsever.

SERVER_INFO:
- ID: ${guild.id}
- Adı: ${guildName}
- Sahibi: ${ownerName}
- Üye Sayısı: ${memberCount}
- Kanal Sayısı: ${channelCount}
- Kanallar (Özet): ${textChannels}
- Rol Sayısı: ${roleCount}
- Boost Sayısı: ${boostCount}
- Tarih: ${time}

IMPORTANT_CONTEXT:
- SUNUCU KURALLARI (${rulesChannel ? `#${rulesChannel.name}` : 'Yok'}):
"${rulesContent}"

USER_INFO:
- ID: ${message.author.id}
- Kullanıcı Adı: ${message.author.username}

CURRENT_INTERACTION:
- Kullanıcı: ${message.author.globalName || message.author.username} (ID: ${message.author.id})
${referencedContent}

USER_INPUT:
`;


                // Check for images
                const attachment = message.attachments.first();
                const imageUrl = (attachment && attachment.contentType?.startsWith('image/')) ? attachment.url : undefined;

                const aiResponse = await generateAIResponse(cleanText, context, imageUrl);
                await message.reply(aiResponse);
            } catch (error) {
                console.error(`[${botName}] AI Error: `, error);
                await message.reply('Beynim yandı... Birazdan tekrar dener misin? 🔌');
            }
            return; // Stop processing other commands if mentioned
        }

        // Default prefix is '!'
        // Update: Dynamic Prefix already fetched above.
        // We do NOT need to redeclare 'prefix'.
        // const prefix = message.content.startsWith('+') ? '+' : '!'; 
        // Logic check: If user typed +kayıt, prefix check above caught it via dynamic prefix OR we check explicit + for legacy?
        // User asked for Dynamic Prefixes. If Bot 2 has "va!", then "+kayıt" might fail if we don't alias it.
        // BUT for now, let's remove the REDECLARATION which causes the crash.
        // Use 'prefix' from top scope.

        // Check for '!!sesegel' command
        if (message.content.startsWith('!!sesegel')) {
            const hasMentions = message.mentions.users.size > 0;
            const isMentioned = client.user && message.mentions.users.has(client.user.id);

            if (hasMentions && !isMentioned) {
                return; // Mentions exist but this bot is NOT one of them.
            }

            if (message.member?.voice.channel) {
                const voiceChannel = message.member.voice.channel;

                try {
                    // JITTER ALGORITHM: Random delay between 500ms and 2500ms to prevent API spike
                    const jitter = Math.floor(Math.random() * 2000) + 500;
                    await sleep(jitter);

                    const connection = joinVoiceChannel({
                        channelId: voiceChannel.id,
                        guildId: message.guild!.id,
                        adapterCreator: message.guild!.voiceAdapterCreator as any,
                        selfDeaf: false,
                    });

                    // Wait for the connection to be ready
                    try {
                        // Increased timeout to 20s for better reliability on bad connections
                        await entersState(connection, VoiceConnectionStatus.Ready, 20000);

                        // Save the channel
                        if (client.user) {
                            VoiceManager.saveChannel(client.user.id, message.guild!.id, voiceChannel.id);
                        }

                        console.log(`[${botName}] Successfully connected to: ${voiceChannel.name} (${voiceChannel.id})`);
                        await message.reply(`[${botName}] ✅ ** ${voiceChannel.name}** kanalına başarıyla bağlandım!`);
                    } catch (error) {
                        connection.destroy();
                        console.error(`[${botName}] Connection Timeout / Error for ${voiceChannel.name}: `, error);
                        throw new Error('Bağlantı zaman aşımına uğradı (20sn) - Olası UDP/Firewall sorunu.');
                    }

                } catch (error) {
                    console.error(`[${botName}] Voice Connection Error: `, error);
                    let errorMsg = 'Bilinmeyen hata';
                    if (error instanceof Error) errorMsg = error.message;
                    await message.reply(`[${botName}]HATA: Ses kanalına katılamadım.Sebep: \`${errorMsg}\``);
                }
            } else {
                await message.reply(`[${botName}] Önce bir ses kanalına katılmalısın!`);
            }
            return;
        }

        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();




        // Dynamic Command Handling
        if (commandName) {
            // CHANNEL WHITELIST CHECK
            if (message.guild && !ChannelDb.isCommandAllowed(message.guild.id, message.channel.id)) {
                // If not allowed, ignore command silently or via reaction? 
                // Silently is cleaner for "hidden" restrictions.
                // But admin might want to know.
                // Admin bypass? Yes, usually admins bypass. But for now strict channel check.
                // Let's allow Admins to bypass.
                const isAdmin = message.member?.permissions.has('Administrator');
                if (!isAdmin) return;
            }

            const command = (client as BotClient).commands.get(commandName);
            if (command) {
                try {
                    await command.execute(message, args);
                } catch (error) {
                    console.error(error);
                    await message.reply('Komut çalıştırılırken bir hata oluştu.');
                }
            }
        }

        if (commandName === 'ping') {
            await message.reply(`[${botName}] Pong! (Prefix command)`);
        }


    });

    // --- INVITE TRACKING ---
    client.on(Events.InviteCreate, async (invite) => {
        if (invite.guild) await inviteManager.cacheGuild(invite.guild as any);
    });

    client.on(Events.InviteDelete, async (invite) => {
        if (invite.guild) await inviteManager.cacheGuild(invite.guild as any);
    });

    // --- STAT SYSTEM (Bot 3 Only) ---
    if (botIndex === 3) {
        client.on('voiceStateUpdate', (oldState, newState) => {
            statManager.handleVoiceState(oldState as any, newState as any);
        });

        client.on('messageCreate', (message) => {
            statManager.handleMessage(message as any);
        });
    }

    try {
        // PROFESSIONAL STARTUP: Stagger login to prevent 429 Ratelimits
        // If we launch multiple bots, delay each by (Index * 2 seconds)
        // Check if we are launching ALL or just ONE.
        const headerArgs = process.argv.slice(2);
        const isTargetingSpecific = headerArgs.some(arg => arg.startsWith('--bot=') && !arg.includes('=all'));

        const bootDelay = isTargetingSpecific ? 0 : (botIndex - 1) * 2000;

        if (bootDelay > 0) {
            console.log(`[${botName}] Waiting ${bootDelay}ms before login to optimize traffic...`);
            await sleep(bootDelay);
        }

        await client.login(token);
    } catch (error) {
        console.error(`[${botName}] Failed to login:`, error);
    }
}

// --- BOOTSTRAP LOGIC ---

// Helper to get token by number
function getToken(num: number): string | undefined {
    if (num === 1) return process.env.DISCORD_TOKEN;
    if (num === 2) return process.env.DISCORD_TOKEN_2;
    return process.env[`DISCORD_TOKEN_${num}`];
}

async function main() {
    // Parse arguments: --bot=1, --bot=2, or --bot=all (default)
    const args = process.argv.slice(2);
    let targetBot = 'all';

    args.forEach(arg => {
        if (arg.startsWith('--bot=')) {
            targetBot = arg.split('=')[1];
        }
    });

    console.log(`Starting System... Target: ${targetBot}`);

    if (targetBot === 'all') {
        // Start Bot 1
        if (process.env.DISCORD_TOKEN) createBot(process.env.DISCORD_TOKEN, 'Bot 1', 1);

        // Start Bot 2
        if (process.env.DISCORD_TOKEN_2) createBot(process.env.DISCORD_TOKEN_2, 'Bot 2', 2);

        // Start Bots 3-10
        for (let i = 3; i <= 10; i++) {
            const token = process.env[`DISCORD_TOKEN_${i}`];
            if (token) {
                createBot(token, `Bot ${i}`, i);
            }
        }
    } else {
        // Start Specific Bot
        const botNum = parseInt(targetBot);
        if (isNaN(botNum)) {
            console.error('Invalid bot number');
            process.exit(1);
        }

        const token = getToken(botNum);
        if (!token) {
            console.error(`Error: Token for Bot ${botNum} not found in .env`);
            process.exit(1);
        }

        createBot(token, `Bot ${botNum}`, botNum); // Fixed Index
    }
}

main();
