import { AutoModerationActionExecution, AutoModerationRuleTriggerType, EmbedBuilder, TextChannel } from 'discord.js';

export async function handleAutoModExecution(execution: AutoModerationActionExecution) {
    // Only interest in BlockMessage action or FlagToChannel, but usually BlockMessage is what "hides" the message.
    // triggerType 3 is KEYWORD_PRESET (Profanity, etc.)
    // triggerType 4 is SPAM (Likely Spammer)
    // triggerType 5 is MENTION_SPAM

    // We specifically want to target "Likely Spammer" (Type 4) or maybe generically any blockage if the user wants strict isolation.
    // The user showed "Spam yaptığı düşünülen...", which is Type 4 (SPAM).

    // const guild = execution.guild; // AutoModerationActionExecution has guild property
    const { guild, userId, ruleTriggerType } = execution;
    if (!guild) return;

    // We primarily target RuleTriggerType.Spam (4) for "Likely Spammer"
    // But we can also handle others if needed.
    // Let's focus on Spam for now as requested.

    if (ruleTriggerType === AutoModerationRuleTriggerType.Spam) {
        try {
            const member = await guild.members.fetch(userId);
            if (member && member.moderatable) {
                // Isolate: Timeout for 1 hour
                await member.timeout(60 * 60 * 1000, 'AutoMod: Discord tarafından Spam olarak işaretlendi (Likely Spammer)');

                // Optional: Send feedback to a log channel or the channel where it happened (execution.channel)
                if (execution.channel && 'send' in execution.channel) {
                    // Check permissions or type
                    const channel = execution.channel as TextChannel;
                    await channel.send({
                        content: `🛡️ **Otomatik Koruma**\n<@${userId}> Discord tarafından spam şüphelisi olarak işaretlendi ve 1 saatliğine izole edildi.`
                    });
                }
            }
        } catch (error) {
            console.error('Failed to isolate AutoMod user:', error);
        }
    }
}
