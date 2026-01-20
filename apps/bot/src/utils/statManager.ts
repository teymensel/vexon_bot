import { Client, VoiceState, Message, Collection } from 'discord.js';
import { StatDb, UserStat, GuildStat } from './statDb';

class StatisticsManager {
    // UserId -> Join Timestamp (for currently active voice sessions)
    private voiceSessions = new Map<string, number>();

    /**
     * Handles Voice State Updates (Join, Leave, Move)
     */
    async handleVoiceState(oldState: VoiceState, newState: VoiceState) {
        const userId = newState.member?.id || oldState.member?.id;
        const guildId = newState.guild.id;
        if (!userId) return;

        const now = Date.now();
        const sessionKey = `${guildId}-${userId}`;

        // Case 1: Join (No old channel, Yes new channel)
        if (!oldState.channelId && newState.channelId) {
            if (newState.member?.user.bot) return; // Ignore bots
            this.voiceSessions.set(sessionKey, now);
        }

        // Case 2: Leave (Yes old channel, No new channel)
        else if (oldState.channelId && !newState.channelId) {
            this.processSession(guildId, userId, oldState.channelId, now);
        }

        // Case 3: Move (Yes old, Yes new, Different)
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            // End old session
            this.processSession(guildId, userId, oldState.channelId, now);
            // Start new session
            this.voiceSessions.set(sessionKey, now);
        }
    }

    /**
     * Handles Message Create
     */
    async handleMessage(message: Message) {
        if (message.author.bot || !message.guild) return;

        StatDb.update(db => {
            if (!db[message.guild!.id]) db[message.guild!.id] = {};
            const guildStats = db[message.guild!.id];

            if (!guildStats[message.author.id]) {
                guildStats[message.author.id] = this.createEmptyUserStat();
            }

            const userStat = guildStats[message.author.id];
            userStat.totalMessages += 1;

            if (!userStat.channelStats[message.channel.id]) {
                userStat.channelStats[message.channel.id] = { voiceMs: 0, messages: 0 };
            }
            userStat.channelStats[message.channel.id].messages += 1;
        });
    }

    private processSession(guildId: string, userId: string, channelId: string, endTime: number) {
        const sessionKey = `${guildId}-${userId}`;
        const startTime = this.voiceSessions.get(sessionKey);

        if (startTime) {
            const duration = endTime - startTime;
            if (duration > 0) {
                StatDb.update(db => {
                    if (!db[guildId]) db[guildId] = {};
                    const guildStats = db[guildId];

                    if (!guildStats[userId]) {
                        guildStats[userId] = this.createEmptyUserStat();
                    }

                    const userStat = guildStats[userId];
                    userStat.totalVoiceMs += duration;

                    if (!userStat.channelStats[channelId]) {
                        userStat.channelStats[channelId] = { voiceMs: 0, messages: 0 };
                    }
                    userStat.channelStats[channelId].voiceMs += duration;
                });
            }
            this.voiceSessions.delete(sessionKey);
        }
    }

    private createEmptyUserStat(): UserStat {
        return {
            totalVoiceMs: 0,
            totalMessages: 0,
            channelStats: {}
        };
    }
}

export const statManager = new StatisticsManager();
