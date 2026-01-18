
import { JsonDb } from './jsonDb';

interface ChannelConfig {
    [guildId: string]: {
        allowedChannels: string[]; // Whitelist for COMMANDS (if empty, all allowed)
        aiDisabledChannels: string[]; // Blacklist for AI CHAT
    };
}

const db = new JsonDb<ChannelConfig>('channelConfig.json', {});

export class ChannelDb {
    static get(guildId: string) {
        return db.read()[guildId] || { allowedChannels: [], aiDisabledChannels: [] };
    }

    static addAllowedChannel(guildId: string, channelId: string) {
        db.update(data => {
            if (!data[guildId]) data[guildId] = { allowedChannels: [], aiDisabledChannels: [] };
            if (!data[guildId].allowedChannels.includes(channelId)) {
                data[guildId].allowedChannels.push(channelId);
            }
        });
    }

    static removeAllowedChannel(guildId: string, channelId: string) {
        db.update(data => {
            if (!data[guildId]) return;
            data[guildId].allowedChannels = data[guildId].allowedChannels.filter(id => id !== channelId);
        });
    }

    static addAiDisabledChannel(guildId: string, channelId: string) {
        db.update(data => {
            if (!data[guildId]) data[guildId] = { allowedChannels: [], aiDisabledChannels: [] };
            if (!data[guildId].aiDisabledChannels.includes(channelId)) {
                data[guildId].aiDisabledChannels.push(channelId);
            }
        });
    }

    static removeAiDisabledChannel(guildId: string, channelId: string) {
        db.update(data => {
            if (!data[guildId]) return;
            data[guildId].aiDisabledChannels = data[guildId].aiDisabledChannels.filter(id => id !== channelId);
        });
    }

    static isCommandAllowed(guildId: string, channelId: string): boolean {
        const config = this.get(guildId);
        if (config.allowedChannels.length === 0) return true; // Empty wl = all allowed
        return config.allowedChannels.includes(channelId);
    }

    static isAiAllowed(guildId: string, channelId: string): boolean {
        const config = this.get(guildId);
        return !config.aiDisabledChannels.includes(channelId);
    }
}
