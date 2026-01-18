
import { JsonDb } from './jsonDb';

interface TicketConfig {
    [guildId: string]: {
        ticketChannelId?: string; // Where the setup embed is
        supportRoleId?: string;   // Who can see tickets
        category?: string;        // Where tickets spawn
        counter: number;
    }
}

const db = new JsonDb<TicketConfig>('ticketConfig.json', {});

export class TicketDb {
    static get(guildId: string) {
        return db.read()[guildId] || { counter: 0 };
    }

    static update(guildId: string, updateFn: (data: any) => void) {
        db.update(data => {
            if (!data[guildId]) data[guildId] = { counter: 0 };
            updateFn(data[guildId]);
        });
    }

    static nextTicketId(guildId: string): number {
        let id = 1;
        db.update(data => {
            if (!data[guildId]) data[guildId] = { counter: 0 };
            data[guildId].counter += 1;
            id = data[guildId].counter;
        });
        return id;
    }
}
