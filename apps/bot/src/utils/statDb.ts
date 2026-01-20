import { JsonDb } from './jsonDb';

export interface ChannelStat {
    voiceMs: number;
    messages: number;
}

export interface UserStat {
    totalVoiceMs: number;
    totalMessages: number;
    channelStats: { [channelId: string]: ChannelStat };
    lastVoiceJoin?: number; // Runtime only, but maybe persistant if crash?
}

export interface GuildStat {
    [userId: string]: UserStat;
}

export interface StatConfig {
    [guildId: string]: GuildStat;
}

const defaultStatConfig: StatConfig = {};
export const StatDb = new JsonDb<StatConfig>('statConfig.json', defaultStatConfig);
