import { Client, GatewayIntentBits, Collection, Interaction, EmbedBuilder, ActivityType, Partials, REST, Routes } from 'discord.js';
import { joinVoiceChannel, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrefixDb } from './utils/prefixDb';
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
import { GuardianLogic } from './utils/guardianLogic';

// Community Commands (Manual Import for Prefix handling if needed, or dynamic)
// Actually we load them dynamically below, but for events we need manual registration

// @ts-ignore
// import { prisma } from '@marpelinamk/database';
const prisma = null;

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
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
        ],
    }, botName, botIndex);

    client.commands = commands;

    client.once('ready', async () => {
        console.log(`[${botName}] Logged in as ${client.user?.tag}!`);

        // --- SLASH COMMAND REGISTRATION ---
        const slashCommands: any[] = [];
        client.commands.forEach((cmd: any) => {
            if (cmd.data && typeof cmd.data.toJSON === 'function') {
                const name = cmd.data.name;

                // --- COMMAND FILTERING LOGIC ---
                // Bot 3 (Assistant): Duyuru, Ticket
                if (name.startsWith('duyuru') || name.startsWith('ticket')) {
                    if (botIndex !== 3) return;
                }

                // Bot 4 (Guardian): Security
                if (['bot-kanal', 'ai-kanal', 'logkur', 'bot-whitelist'].includes(name)) {
                    if (botIndex !== 4) return;
                }

                // Exclude above from others (implied by checks above)

                slashCommands.push(cmd.data.toJSON());
            }
        });

        if (slashCommands.length > 0) {
            const rest = new REST({ version: '10' }).setToken(token);
            try {
                if (client.user) {
                    // Register to ALL Guilds for Instant Update (Dev Mode friendly)
                    const guilds = client.guilds.cache.map(guild => guild.id);
                    for (const guildId of guilds) {
                        await rest.put(
                            Routes.applicationGuildCommands(client.user.id, guildId),
                            { body: slashCommands },
                        );
                        console.log(`[${botName}] Registered commands to Guild: ${guildId}`);
                    }

                    // Also Global (for future users)
                    /* await rest.put(
                         Routes.applicationCommands(client.user.id),
                         { body: slashCommands },
                    ); */

                    console.log(`[${botName}] Successfully registered ${slashCommands.length} slash commands to ${guilds.length} guilds.`);

                    // Set Status
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

                allData.forEach(async (guildData) => {
                    const guildId = guildData.guildId;
                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) return;

                    for (const task of guildData.tasks) {
                        if (task.executeAt <= now) {
                            // Execute
                            const channel = guild.channels.cache.get(task.channelId);
                            if (channel && channel.isTextBased()) {
                                try {
                                    await channel.send(task.content);
                                    console.log(`[Scheduler] Executed task ${task.id} in ${guild.name}`);
                                } catch (e) {
                                    console.error(`[Scheduler] Failed task ${task.id}`, e);
                                }
                            }
                            // Remove
                            AnnouncementDb.removeSchedule(guildId, task.id);
                        }
                    }
                });
            }, 60000); // Check every minute
        }

        // Auto-join voice channel if saved
        const savedChannel = VoiceManager.getChannel(client.user?.id || '');
        if (savedChannel) {
            const guild = client.guilds.cache.get(savedChannel.guildId);
            if (guild) {
                const channel = guild.channels.cache.get(savedChannel.channelId);
                if (channel && channel.isVoiceBased()) {
                    try {
                        joinVoiceChannel({
                            channelId: channel.id,
                            guildId: guild.id,
                            adapterCreator: guild.voiceAdapterCreator as any,
                            selfDeaf: false,
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
            try {
                await handleTicketInteraction(interaction);
            } catch (e) {
                console.error('Ticket Error:', e);
            }
            return;
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
        if (message.mentions.has(client.user!)) {
            // Check if it's a direct mention to THIS bot (and not just a mass mention that includes it)
            // Logic: content contains <@CLIENT_ID>
            const mentionStr = `<@${client.user!.id}>`;

            // AI CHANNEL BLACKLIST CHECK
            if (message.guild && !ChannelDb.isAiAllowed(message.guild.id, message.channel.id)) {
                // AI is disabled in this channel. Ignore.
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

            try { // Logic block entry (kept indentation structure)
                // Send typing indicator
                await message.channel.sendTyping();

                // --- CONTEXT & MEMORY (Recursive Reply Chain) ---
                let conversationHistory: string[] = [];
                let currentMsg: any = message; // Cast to any to avoid strict type issues with fetched messages
                let fetchCount = 0;
                const MAX_HISTORY = 10; // Remember last 10 replies for deep context

                while (currentMsg.reference && currentMsg.reference.messageId && fetchCount < MAX_HISTORY) {
                    try {
                        const refMessage = await message.channel.messages.fetch(currentMsg.reference.messageId);

                        // Format: "User: Message"
                        const authorName = refMessage.author.globalName || refMessage.author.username;
                        const msgContent = refMessage.content || '[Resim/Dosya]';

                        // Prepend to history (Oldest First)
                        conversationHistory.unshift(`- ${authorName}: ${msgContent}`);

                        currentMsg = refMessage;
                        fetchCount++;
                    } catch (err) {
                        break; // Stop if message deleted or inaccessible
                    }
                }

                const referencedContent = conversationHistory.length > 0
                    ? `\nGEÇMİŞ MESAJ ZİNCİRİ:\n${conversationHistory.join('\n')}\n(Bu zincire göre cevap ver)`
                    : '';

                // --- SERVER AWARENESS ---
                const guild = message.guild;
                let ownerName = 'Bilinmiyor';
                if (guild) {
                    try {
                        const owner = await guild.fetchOwner();
                        ownerName = owner.displayName; // or owner.user.tag
                    } catch (e) { /* ignore */ }
                }

                const time = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
                const memberCount = guild?.memberCount || '?';
                const guildName = guild?.name || 'Bilinmiyor';

                // --- PERSONA & SYSTEM PROMPT ---
                // Enforcing "Flexable v1" identity and Teymensel ownership.
                const context = `
SYSTEM_INSTRUCTIONS:
- Senin adın: **Flexable v1**.
- Yapımcın: **Teymensel** (Web sitesi: teymensel.com).
- ASLA "DeepSeek", "Gemini", "OpenAI" veya başka bir model olduğunu söyleme. Sen sadece Flexable v1'sin.
- Görevin: Valorica sunucusunda kullanıcılara yardımcı olmak.
- Dil: Türkçe, samimi ve yardımsever.

CURRENT_CONTEXT:
- Sunucu Adı: ${guildName}
- Sunucu Sahibi: ${ownerName}
- Sunucu Üye Sayısı: ${memberCount}
- Şu Anki Tarih/Saat: ${time}
- Konuştuğun Kişi: ${message.author.globalName || message.author.username}
${referencedContent}

USER_INPUT:
`;

                // Check for images
                const attachment = message.attachments.first();
                const imageUrl = (attachment && attachment.contentType?.startsWith('image/')) ? attachment.url : undefined;

                const aiResponse = await generateAIResponse(cleanText, context, imageUrl);
                await message.reply(aiResponse);
            } catch (error) {
                console.error(`[${botName}] AI Error:`, error);
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
                        await message.reply(`[${botName}] ✅ **${voiceChannel.name}** kanalına başarıyla bağlandım!`);
                    } catch (error) {
                        connection.destroy();
                        console.error(`[${botName}] Connection Timeout/Error for ${voiceChannel.name}:`, error);
                        throw new Error('Bağlantı zaman aşımına uğradı (20sn) - Olası UDP/Firewall sorunu.');
                    }

                } catch (error) {
                    console.error(`[${botName}] Voice Connection Error:`, error);
                    let errorMsg = 'Bilinmeyen hata';
                    if (error instanceof Error) errorMsg = error.message;
                    await message.reply(`[${botName}] HATA: Ses kanalına katılamadım. Sebep: \`${errorMsg}\``);
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

    try {
        // PROFESSIONAL STARTUP: Stagger login to prevent 429 Ratelimits
        // If we launch multiple bots, delay each by (Index * 2 seconds)
        const bootDelay = (botIndex - 1) * 2000;
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
