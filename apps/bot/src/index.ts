import { Client, GatewayIntentBits, Collection, Interaction } from 'discord.js';
import { joinVoiceChannel, entersState, VoiceConnectionStatus } from '@discordjs/voice';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { handleAntiSpam } from './antiSpam';
import { handleAutoModExecution } from './autoModIntegration';
import { VoiceManager } from './utils/voiceManager';
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

    constructor(options: any, botName: string) {
        super(options);
        this.botName = botName;
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
    if ('data' in cmd && 'execute' in cmd) {
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
    }, botName);

    client.commands = commands;

    client.once('ready', async () => {
        console.log(`[${botName}] Logged in as ${client.user?.tag}!`);
        // Verify DB connection
        // @ts-ignore
        if (prisma) {
            console.log(`[${botName}] Database client initialized.`);
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

    // Prefix Command Handler
    client.on('messageCreate', async (message) => {
        // Run Anti-Spam check first
        await handleAntiSpam(message);

        if (message.author.bot) return;

        // Default prefix is '!'
        const prefix = '!';

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

        if (commandName === 'ping') {
            await message.reply(`[${botName}] Pong! (Prefix command)`);
        }

        if (commandName === 'help') {
            await message.reply('**Komutlar:**\n`/ping` - Gecikme süresi\n`/help` - Yardım menüsü\n`!ping` - Test komutu\n`!!sesegel` - Sese çağır ve kaydet');
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

        createBot(token, `Bot ${botNum}`, 1); // Index 1 so it starts immediately
    }
}

main();
