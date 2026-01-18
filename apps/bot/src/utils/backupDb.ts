
import { JsonDb } from './jsonDb';

interface BackupData {
    timestamp: number;
    authorId: string;
    roles: { name: string, color: string, permissions: string }[];
    channels: { name: string, type: number }[];
}

interface BackupSchema {
    [guildId: string]: BackupData[];
}

class BackupDbClass extends JsonDb<BackupSchema> {
    constructor() {
        super('backups.json', {});
    }

    addBackup(guildId: string, backup: BackupData) {
        this.update(data => {
            if (!data[guildId]) data[guildId] = [];
            data[guildId].push(backup);
            // Keep last 5
            if (data[guildId].length > 5) data[guildId].shift();
        });
    }

    getBackups(guildId: string) {
        return this.read()[guildId] || [];
    }
}

export const backupDb = new BackupDbClass();
