import { JsonDb } from './jsonDb';

interface InviteConfig {
    [guildId: string]: {
        enabled: boolean;
        channelId: string | null;
        // Map member ID to Inviter ID for leave logs
        inviterMap: { [memberId: string]: { inviterId: string | null, code: string | null } };
    };
}

const defaultInviteConfig: InviteConfig = {};
export const InviteDb = new JsonDb<InviteConfig>('inviteConfig.json', defaultInviteConfig);
