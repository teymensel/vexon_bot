
import { JsonDb } from './jsonDb';

interface PrefixConfig {
    [guildId: string]: {
        [botIndex: number]: string;
    };
}

const db = new JsonDb<PrefixConfig>('prefixes.json', {});

export class PrefixDb {
    static getPrefix(guildId: string, botIndex: number): string {
        const data = db.read();
        const guildData = data[guildId];

        if (guildData && guildData[botIndex]) {
            return guildData[botIndex];
        }

        // Defaults
        switch (botIndex) {
            case 1: return 'v!';
            case 2: return 'vf!';
            case 3: return 'va!';
            case 4: return 'vs!';
            default: return '!';
        }
    }

    static setPrefix(guildId: string, botIndex: number, newPrefix: string) {
        db.update(data => {
            if (!data[guildId]) data[guildId] = {};
            data[guildId][botIndex] = newPrefix;
        });
    }
}
