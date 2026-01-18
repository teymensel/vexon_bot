import { SlashCommandBuilder, CommandInteraction, GuildMember } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import { IntercomManager } from '../utils/intercom';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('telesekreter')
        .setDescription('Başka bir sunucudaki rastgele bir kullanıcıyla sesli görüşme başlatır.'),
    async execute(interaction: CommandInteraction) {
        if (!interaction.guildId) return;

        const member = interaction.member as GuildMember;
        if (!member.voice.channel) {
            await interaction.reply({ content: 'Önce bir ses kanalına katılmalısın!', ephemeral: true });
            return;
        }

        const voiceChannel = member.voice.channel;

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild!.voiceAdapterCreator as any,
                selfDeaf: false,
            });

            await IntercomManager.getInstance().handleJoin(interaction.user, connection, interaction);

        } catch (error) {
            console.error(error);
            // safe reply check
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Bağlantı hatası oluştu.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Bağlantı hatası oluştu.', ephemeral: true });
            }
        }
    },
};
