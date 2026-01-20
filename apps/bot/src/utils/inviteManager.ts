import { Client, Collection, Guild, Invite } from 'discord.js';

class InviteCache {
    // GuildID -> Code -> Usage Count
    private cache: Collection<string, Collection<string, number>> = new Collection();

    async initialize(client: Client) {
        for (const guild of client.guilds.cache.values()) {
            await this.cacheGuild(guild);
        }
    }

    async cacheGuild(guild: Guild) {
        try {
            const invites = await guild.invites.fetch();
            const guildInvites = new Collection<string, number>();
            invites.forEach((inv: Invite) => guildInvites.set(inv.code, inv.uses || 0));
            this.cache.set(guild.id, guildInvites);
        } catch (e) {
            console.warn(`[InviteManager] Failed to cache guild ${guild.id}:`, e);
        }
    }

    async findInviter(member: any): Promise<{ inviter: any | null, code: string | null, isVanity: boolean }> {
        const guild = member.guild;
        const oldInvites = this.cache.get(guild.id);

        // If no cache (e.g. restart), re-cache and return unknown (sadly) OR try to guess?
        // If we fetch now, the uses are already incremented.

        try {
            const newInvites = await guild.invites.fetch();

            // Handle Vanity
            if (guild.vanityURLCode) {
                // Fetch vanity info if possible, but API doesn't give vanity usage count in same way always.
                // Actually discord.js guild.fetchVanityData() might help.
                try {
                    const vanity = await guild.fetchVanityData();
                    // We can't easily track vanity usage diff unless we cached it specifically.
                    // For now, check standard invites.
                } catch { }
            }

            let usedInvite: any = null;

            if (oldInvites) {
                for (const [code, useCount] of newInvites) {
                    if (oldInvites.has(code)) {
                        const oldUse = oldInvites.get(code)!;
                        if ((useCount || 0) > oldUse) {
                            usedInvite = newInvites.get(code);
                            break;
                        }
                    } else {
                        // New invite created just now? usage is 1?
                        if ((useCount || 0) === 1) {
                            usedInvite = newInvites.get(code);
                            break;
                        }
                    }
                }
            }

            // Update Cache
            const guildInvites = new Collection<string, number>();
            newInvites.forEach((inv: Invite) => guildInvites.set(inv.code, inv.uses || 0));
            this.cache.set(guild.id, guildInvites);

            if (usedInvite) {
                return { inviter: usedInvite.inviter, code: usedInvite.code, isVanity: false };
            }

            // If no match found, maybe Vanity?
            // Heuristic: If join happened but no invite incremented, it's likely Vanity URL or Bot Invite.
            // Check if user is bot? Handled by caller.
            // Assume Vanity if available.
            if (guild.vanityURLCode) {
                return { inviter: null, code: guild.vanityURLCode, isVanity: true };
            }

        } catch (e) {
            console.error('Find Inviter Error:', e);
        }

        return { inviter: null, code: null, isVanity: false };
    }
}

export const inviteManager = new InviteCache();
