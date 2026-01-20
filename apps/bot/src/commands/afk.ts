
import { SlashCommandBuilder, ChatInputCommandInteraction, Message, EmbedBuilder } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';

interface AfkData {
    [guildId: string]: {
        [userId: string]: {
            reason: string | null;
            timestamp: number;
        }
    }
}

export const afkDb = new JsonDb<AfkData>('afkData.json', {});

export default {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('AFK (Bilgisayar Başında Değil) moduna geçer.')
        .addStringOption(o => o.setName('sebep').setDescription('AFK olma sebebiniz').setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction | Message, args?: string[]) {
        const isSlash = interaction instanceof ChatInputCommandInteraction;
        const guild = interaction.guild;
        const member = isSlash ? (interaction as ChatInputCommandInteraction).member : (interaction as Message).member;
        const user = isSlash ? (interaction as ChatInputCommandInteraction).user : (interaction as Message).author;

        if (!guild || !member) return;

        // Parse Reason
        let reason: string | null = null;
        if (isSlash) {
            reason = (interaction as ChatInputCommandInteraction).options.getString('sebep');
        } else {
            if (args && args.length > 0) {
                reason = args.join(' ');
            }
        }

        // Save to DB
        afkDb.update(data => {
            if (!data[guild.id]) data[guild.id] = {};
            data[guild.id][user.id] = {
                reason: reason,
                timestamp: Date.now()
            };
        });

        // Basic clean message
        // If nickname permission exists, maybe change name? (Nors request didn't specify, but professional bots often do [AFK] Name. I'll stick to message for now unless asked).

        const content = `**${user.username}**, seni AFK moduna geçirdim.`;
        const extra = reason ? `\nSebep: **${reason}**` : '\nSebep belirtilmedi.';

        if (isSlash) {
            await (interaction as ChatInputCommandInteraction).reply({ content: `${content}${extra}`, ephemeral: true }); // Ephemeral so it doesn't spam chat? Or public? Usually public so others see. Nors style -> Public probably. Let's make it public but concise.
            // Actually, usually AFK command response is visible to confirm to public.
            // Wait, replying ephemeral means others don't see I went AFK right then.
            // I'll make it NOT ephemeral.
            ((interaction as ChatInputCommandInteraction).replied ?
                (interaction as ChatInputCommandInteraction).followUp({ content: `${content}${extra}` }) :
                (interaction as ChatInputCommandInteraction).reply({ content: `${content}${extra}` }));
        } else {
            await (interaction as Message).reply(`${content}${extra}`);
        }
    }
};
