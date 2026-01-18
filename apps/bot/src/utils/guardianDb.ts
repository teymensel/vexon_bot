
import { JsonDb } from './jsonDb';

export interface GuardianLimit {
    enabled: boolean;
    limit: number;
    action: 'kick' | 'ban' | 'log';
}

export interface GuardianConfig {
    [guildId: string]: {
        whitelistIds: string[];
        logChannelId?: string;
        enabled: boolean; // Master toggle
        highProtection: boolean; // Admins subject to limits if true

        // Anti-Nuke / Limits
        limits: {
            ban: GuardianLimit;
            kick: GuardianLimit;
            channelCreate: GuardianLimit;
            channelDelete: GuardianLimit;
            roleCreate: GuardianLimit;
            roleDelete: GuardianLimit;
            webhook: { enabled: boolean; action: 'kick' | 'ban' | 'log' };
            botAdd: { enabled: boolean; action: 'kick' | 'ban' | 'log' };
        };

        // Chat Protection
        chat: {
            spam: { enabled: boolean; limit: number };
            caps: { enabled: boolean; percentage: number };
            link: { enabled: boolean; allowWhiteList: boolean };
            invite: { enabled: boolean };
            emoji: { enabled: boolean; limit: number };
            mention: { enabled: boolean; limit: number };
            badWords: { enabled: boolean; words: string[] };
            scam: { enabled: boolean };
        };

        // Raid Protection
        raid: {
            enabled: boolean;
            minAccountAge: number; // days
            quarantine: { enabled: boolean; roleId?: string };
            autoSlowmode: { enabled: boolean; threshold: number };
        };
    };
}

const defaultLimit: GuardianLimit = { enabled: false, limit: 3, action: 'log' };

export const defaultGuildConfig = {
    whitelistIds: [],
    enabled: false,
    highProtection: false,
    limits: {
        ban: { ...defaultLimit },
        kick: { ...defaultLimit },
        channelCreate: { ...defaultLimit },
        channelDelete: { ...defaultLimit },
        roleCreate: { ...defaultLimit },
        roleDelete: { ...defaultLimit },
        webhook: { enabled: false, action: 'log' },
        botAdd: { enabled: false, action: 'kick' }
    },
    chat: {
        spam: { enabled: false, limit: 5 },
        caps: { enabled: false, percentage: 70 },
        link: { enabled: false, allowWhiteList: true },
        invite: { enabled: false },
        emoji: { enabled: false, limit: 10 },
        mention: { enabled: false, limit: 5 },
        badWords: { enabled: false, words: [] },
        scam: { enabled: true }
    },
    raid: {
        enabled: false,
        minAccountAge: 7,
        quarantine: { enabled: false },
        autoSlowmode: { enabled: false, threshold: 10 }
    }
};

class GuardianDbClass extends JsonDb<GuardianConfig> {
    constructor() {
        super('guardianConfig.json', {});
    }

    get(guildId: string) {
        const data = this.read();
        if (!data[guildId]) {
            // Deep clone default to avoid reference issues
            data[guildId] = JSON.parse(JSON.stringify(defaultGuildConfig));
            this.write(data);
        }
        return data[guildId];
    }

    // Helper to ensure structure exists if loaded from old DB
    ensureStructure(guildId: string) {
        let data = this.read();
        const current = data[guildId] || JSON.parse(JSON.stringify(defaultGuildConfig));

        // Quick merging of missing properties
        const merged = { ...JSON.parse(JSON.stringify(defaultGuildConfig)), ...current };

        // Ensure sub-objects exist
        if (!merged.limits) merged.limits = JSON.parse(JSON.stringify(defaultGuildConfig.limits));
        if (!merged.chat) merged.chat = JSON.parse(JSON.stringify(defaultGuildConfig.chat));
        if (!merged.raid) merged.raid = JSON.parse(JSON.stringify(defaultGuildConfig.raid));

        data[guildId] = merged;
        this.write(data);
        return merged;
    }
}

export const guardianDb = new GuardianDbClass();
