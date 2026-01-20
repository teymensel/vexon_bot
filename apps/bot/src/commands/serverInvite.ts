import { Message, EmbedBuilder, ChannelType, PermissionsBitField } from 'discord.js';

export default {
    data: {
        name: 'serverinvite',
    },
    async execute(message: Message, args: string[]) {
        // Owner Check
        const OWNER_ID = '1067135718473863228';
        if (message.author.id !== OWNER_ID) return;

        const targetGuildId = args[0];
        if (!targetGuildId) {
            return message.reply('❌ Lütfen bir Sunucu ID belirtin.');
        }

        const guild = message.client.guilds.cache.get(targetGuildId);
        if (!guild) {
            return message.reply('❌ Bot bu sunucuda bulunmuyor veya ID hatalı.');
        }

        try {
            // 1. Try to fetch existing invites
            if (guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                const invites = await guild.invites.fetch().catch(() => null);
                if (invites && invites.size > 0) {
                    const invite = invites.first();
                    return message.reply(`✅ **${guild.name}** için mevcut davet: ${invite?.url}`);
                }
            }

            // 2. Try to create a new invite
            // Find a channel where bot can create invites
            const channel = guild.channels.cache.find(c =>
                c.type === ChannelType.GuildText &&
                c.permissionsFor(guild.members.me!)?.has(PermissionsBitField.Flags.CreateInstantInvite)
            );

            if (channel) {
                const invite = await (channel as any).createInvite({ maxAge: 0, maxUses: 1 });
                return message.reply(`✅ **${guild.name}** için yeni davet oluşturuldu: ${invite.url}`);
            } else {
                return message.reply('❌ Bu sunucuda davet oluşturma yetkim yok veya uygun kanal bulunamadı.');
            }

        } catch (error) {
            console.error(error);
            return message.reply('❌ Davet alınırken bir hata oluştu.');
        }
    }
};
