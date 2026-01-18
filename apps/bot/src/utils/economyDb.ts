
import { JsonDb } from './jsonDb';

interface UserEconomy {
    balance: number;
    lastDaily: number;
}

interface GuildEconomy {
    [userId: string]: UserEconomy;
}

interface EconomyData {
    [guildId: string]: GuildEconomy;
}

const db = new JsonDb<EconomyData>('economy.json', {});

export class EconomyDb {
    static getBalance(guildId: string, userId: string): number {
        const data = db.read();
        return data[guildId]?.[userId]?.balance || 0;
    }

    static addBalance(guildId: string, userId: string, amount: number) {
        db.update(data => {
            if (!data[guildId]) data[guildId] = {};
            if (!data[guildId][userId]) data[guildId][userId] = { balance: 0, lastDaily: 0 };
            data[guildId][userId].balance += amount;
        });
    }

    static subtractBalance(guildId: string, userId: string, amount: number): boolean {
        const currentBalance = this.getBalance(guildId, userId);
        if (currentBalance < amount) return false;

        db.update(data => {
            if (!data[guildId]) data[guildId] = {};
            if (!data[guildId][userId]) data[guildId][userId] = { balance: 0, lastDaily: 0 };
            data[guildId][userId].balance -= amount;
        });
        return true;
    }

    static setDaily(guildId: string, userId: string) {
        db.update(data => {
            if (!data[guildId]) data[guildId] = {};
            if (!data[guildId][userId]) data[guildId][userId] = { balance: 0, lastDaily: 0 };
            data[guildId][userId].lastDaily = Date.now();
        });
    }

    static getLastDaily(guildId: string, userId: string): number {
        const data = db.read();
        return data[guildId]?.[userId]?.lastDaily || 0;
    }
}
