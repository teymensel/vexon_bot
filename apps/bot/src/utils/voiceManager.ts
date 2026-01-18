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
    private static loadData(): VoiceData {
        if (!fs.existsSync(DATA_FILE)) {
            return {};
        }
        try {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        } catch (error) {
            console.error('Error loading voice data:', error);
            return {};
        }
    }

    private static saveData(data: VoiceData) {
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
