import fs from 'fs';
import path from 'path';

const DATA_FILE = path.resolve(__dirname, '../../voice-channels.json');

interface VoiceData {
    [botId: string]: {
        guildId: string;
        channelId: string;
    };
}

export class VoiceManager {
    private static _cache: VoiceData | null = null;

    private static loadData(): VoiceData {
        if (this._cache) return this._cache;

        if (!fs.existsSync(DATA_FILE)) {
            this._cache = {};
            return this._cache;
        }
        try {
            this._cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
            return this._cache!;
        } catch (error) {
            console.error('Error loading voice data:', error);
            this._cache = {};
            return this._cache;
        }
    }

    private static saveData(data: VoiceData) {
        this._cache = data;
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving voice data:', error);
        }
    }

    static saveChannel(botId: string, guildId: string, channelId: string) {
        const data = this.loadData();
        data[botId] = { guildId, channelId };
        this.saveData(data);
    }

    static getChannel(botId: string): { guildId: string; channelId: string } | null {
        const data = this.loadData();
        return data[botId] || null;
    }
}
