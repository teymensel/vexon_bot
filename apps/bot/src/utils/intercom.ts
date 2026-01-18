import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    EndBehaviorType,
    StreamType,
    VoiceConnection,
    VoiceConnectionStatus
} from '@discordjs/voice';
import { User, CommandInteraction } from 'discord.js';
import * as prism from 'prism-media';
import { pipeline } from 'stream';

interface IntercomSession {
    user: User;
    connection: VoiceConnection;
    interaction: CommandInteraction;
    player: AudioPlayer;
}

export class IntercomManager {
    private static instance: IntercomManager;
    private waitingUser: IntercomSession | null = null;
    private activePairs: Map<string, IntercomSession> = new Map(); // Key: UserId, Value: Partner Session

    private constructor() { }

    static getInstance(): IntercomManager {
        if (!IntercomManager.instance) {
            IntercomManager.instance = new IntercomManager();
        }
        return IntercomManager.instance;
    }

    async handleJoin(user: User, connection: VoiceConnection, interaction: CommandInteraction) {
        // Check if already in a call
        if (this.activePairs.has(user.id)) {
            await interaction.reply({ content: 'Zaten bir görüşmedesiniz! Çıkmak için ses kanalından ayrılın.', ephemeral: true });
            return;
        }

        const player = createAudioPlayer();
        connection.subscribe(player);

        const currentSession: IntercomSession = { user, connection, interaction, player };

        if (this.waitingUser) {
            // Pair found!
            const partner = this.waitingUser;

            if (partner.user.id === user.id) {
                await interaction.reply({ content: 'Zaten bekleme listesindesiniz.', ephemeral: true });
                return;
            }

            this.waitingUser = null; // Clear waiting

            // Register pairs
            this.activePairs.set(user.id, partner);
            this.activePairs.set(partner.user.id, currentSession);

            await interaction.reply({ content: `📞 **${partner.user.username}** ile eşleştiniz! Konuşabilirsiniz.` });
            await partner.interaction.followUp({ content: `📞 **${user.username}** ile eşleştiniz! Konuşabilirsiniz.` });

            this.bridgeAudio(currentSession, partner);
            this.bridgeAudio(partner, currentSession);

            // Cleanup on disconnect
            this.setupDisconnectHandler(currentSession, partner);
            this.setupDisconnectHandler(partner, currentSession);

        } else {
            // No one waiting, add to pool
            this.waitingUser = currentSession;
            await interaction.reply({ content: '⏳ Bekleme listesine alındınız. Biri bağlandığında görüşme başlayacak...' });

            // Handle disconnect while waiting
            connection.on(VoiceConnectionStatus.Disconnected, () => {
                if (this.waitingUser?.user.id === user.id) {
                    this.waitingUser = null;
                }
            });
        }
    }

    private bridgeAudio(source: IntercomSession, target: IntercomSession) {
        // Listen to source user speaking
        // Note: receiver.subscribe returns an Opus stream

        const receiver = source.connection.receiver;

        // When data comes from Source, we create resource and play on Target.

        receiver.speaking.on('start', (userId) => {
            if (userId === source.user.id) {
                // If target is already playing something (e.g. system sound), this might interrupt.
                // But for intercom that's fine.

                const stream = receiver.subscribe(userId, {
                    end: {
                        behavior: EndBehaviorType.AfterSilence,
                        duration: 1000,
                    },
                });

                const resource = createAudioResource(stream, { inputType: StreamType.Opus });
                target.player.play(resource);
            }
        });
    }

    private setupDisconnectHandler(session: IntercomSession, partner: IntercomSession) {
        session.connection.on(VoiceConnectionStatus.Disconnected, async () => {
            if (this.activePairs.has(session.user.id)) {
                this.activePairs.delete(session.user.id);
                this.activePairs.delete(partner.user.id);

                // Notify partner
                try {
                    // This might fail if partner also disconnected
                    await partner.interaction.followUp('📴 Karşı taraf görüşmeyi sonlandırdı.');
                    // Optional: Disconnect partner or keep them?
                    // Let's keep them in channel but sound effect maybe?
                    partner.player.stop();
                } catch (e) {
                    // ignore 
                }
            }
        });
    }
}
