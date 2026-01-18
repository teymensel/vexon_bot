
import { JsonDb } from './jsonDb';

interface ScheduledTask {
    id: string;
    channelId: string;
    content: string;
    executeAt: number; // Timestamp
}

interface AnnouncementConfig {
    defaultChannelId?: string;
    templates: { [name: string]: { content: string; embed?: any } };
    scheduled: ScheduledTask[];
}

interface GuildAnnouncements {
    [guildId: string]: AnnouncementConfig;
}

const db = new JsonDb<GuildAnnouncements>('announcements.json', {});

export class AnnouncementDb {
    static get(guildId: string): AnnouncementConfig {
        const data = db.read();
        return data[guildId] || { templates: {}, scheduled: [] };
    }

    static setChannel(guildId: string, channelId: string) {
        db.update(data => {
            if (!data[guildId]) data[guildId] = { templates: {}, scheduled: [] };
            data[guildId].defaultChannelId = channelId;
        });
    }

    static addTemplate(guildId: string, name: string, content: string, embed?: any) {
        db.update(data => {
            if (!data[guildId]) data[guildId] = { templates: {}, scheduled: [] };
            data[guildId].templates[name] = { content, embed };
        });
    }

    static removeTemplate(guildId: string, name: string) {
        db.update(data => {
            if (data[guildId] && data[guildId].templates) {
                delete data[guildId].templates[name];
            }
        });
    }

    static addSchedule(guildId: string, task: ScheduledTask) {
        db.update(data => {
            if (!data[guildId]) data[guildId] = { templates: {}, scheduled: [] };
            // Initialize array if missing (migration)
            if (!data[guildId].scheduled) data[guildId].scheduled = [];

            data[guildId].scheduled.push(task);
        });
    }

    static removeSchedule(guildId: string, taskId: string) {
        db.update(data => {
            if (data[guildId] && data[guildId].scheduled) {
                data[guildId].scheduled = data[guildId].scheduled.filter(t => t.id !== taskId);
            }
        });
    }

    static getAllScheduled(): { guildId: string, tasks: ScheduledTask[] }[] {
        const data = db.read();
        return Object.keys(data).map(guildId => ({
            guildId,
            tasks: data[guildId].scheduled || []
        }));
    }
}
