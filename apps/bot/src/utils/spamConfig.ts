import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(__dirname, '../../spam-config.json');

interface GuildSpamConfig {
    enabled: boolean;
    exemptChannels: string[];
    exemptRoles: string[];
}

interface SpamConfigData {
    [guildId: string]: GuildSpamConfig;
}

let configCache: SpamConfigData = {};

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
            configCache = JSON.parse(data);
        }
    } catch (e) {
        console.error('Failed to load spam config', e);
        configCache = {};
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(configCache, null, 2));
    } catch (e) {
        console.error('Failed to save spam config', e);
    }
}

// Ensure load on start
loadConfig();

function getGuildConfig(guildId: string): GuildSpamConfig {
    if (!configCache[guildId]) {
        configCache[guildId] = { enabled: true, exemptChannels: [], exemptRoles: [] };
    }
    return configCache[guildId];
}

export const SpamConfig = {
    isEnabled(guildId: string): boolean {
        return getGuildConfig(guildId).enabled;
    },

    setEnabled(guildId: string, enabled: boolean) {
        const conf = getGuildConfig(guildId);
        conf.enabled = enabled;
        saveConfig();
    },

    addExempt(guildId: string, type: 'channel' | 'role', id: string) {
        const conf = getGuildConfig(guildId);
        if (type === 'channel') {
            if (!conf.exemptChannels.includes(id)) conf.exemptChannels.push(id);
        } else {
            if (!conf.exemptRoles.includes(id)) conf.exemptRoles.push(id);
        }
        saveConfig();
    },

    isExempt(guildId: string, channelId: string, roleIds: string[]): boolean {
        const conf = getGuildConfig(guildId);
        if (conf.exemptChannels.includes(channelId)) return true;
        if (roleIds.some(r => conf.exemptRoles.includes(r))) return true;
        return false;
    },

    getConfig(guildId: string) {
        return getGuildConfig(guildId);
    }
};
