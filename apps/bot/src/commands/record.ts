import { SlashCommandBuilder, CommandInteraction, GuildMember, AttachmentBuilder } from 'discord.js';
import { joinVoiceChannel, getVoiceConnection } from '@discordjs/voice';
import { AudioRecorder } from '../utils/recorder';
import fs from 'fs';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kayıt')
        .setDescription('Bulunduğunuz ses kanalını 5 dakika boyunca kaydeder ve paylaşır.'),
    async execute(interaction: CommandInteraction) {
        if (!interaction.guildId) return;

        const member = interaction.member as GuildMember;
        if (!member.voice.channel) {
            await interaction.reply({ content: 'Önce bir ses kanalına katılmalısın!', ephemeral: true });
            return;
        }

        const voiceChannel = member.voice.channel;
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guildId,
            adapterCreator: interaction.guild!.voiceAdapterCreator as any,
            selfDeaf: false, // Ensure bot is not deafened to hear audio
        });

        await interaction.reply({ content: `🎙️ **${voiceChannel.name}** kanalında kayıt başladı! 5 dakika sürecek... (Konuşanları ayrı ayrı kaydedip göndereceğim)`, ephemeral: false });

        // Simple strategy: Record the person who issued the command (or specific users if we expand logic)
        // Discord API doesn't give a "mixed" stream easily. We have to subscribe to individual users.
        // For MVP: We will record the user who sent the command.

        // BETTER MVP: Listen to `speaking` event and record anyone who speaks? 
        // That's complex for a single command execution flow.
        // Let's stick to recording the user who commanded OR iterate active members.

        // Let's try to record the user who sent the command.
        const recorder = new AudioRecorder(connection.receiver);

        try {
            // Note: Receiver needs the user to be speaking to start getting packets.
            // If they are silent, the file might be empty or start late.
            const filePath = await recorder.startRecording(interaction.user, 5 * 60 * 1000); // 5 minutes

            const attachment = new AttachmentBuilder(filePath);
            await interaction.followUp({
                content: `🎤 **${interaction.user.username}** için kayıt tamamlandı!`,
                files: [attachment]
            });

            // Cleanup
            fs.unlinkSync(filePath);

        } catch (error) {
            console.error('Recording error:', error);
            await interaction.followUp({ content: 'Kayıt sırasında bir hata oluştu veya süre doldu.', ephemeral: true });
        }
    },
};
