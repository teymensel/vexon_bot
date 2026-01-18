
import { Interaction, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import { TicketDb } from '../utils/ticketDb';

export async function handleTicketInteraction(interaction: Interaction) {
    if (!interaction.isButton()) return;

    // Check Bot Index (Assuming passed or accessible)
    const client = interaction.client as any;
    if (client.botIndex !== 2) return;

    const { customId, guild, user } = interaction;
    if (!guild) return;

    if (customId === 'create_ticket') {
        const config = TicketDb.get(guild.id);

        // Prevent spam? (Check if user already has a ticket?) 
        // For simplicity, we create new.

        const ticketId = TicketDb.nextTicketId(guild.id);
        const channelName = `ticket-${ticketId}`;

        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: config.category, // Optional
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
                // Add Support Role permissions if configured
                ...(config.supportRoleId ? [{
                    id: config.supportRoleId,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                }] : [])
            ],
            topic: `Ticket ID: ${ticketId} | Sahibi: <@${user.id}>`
        });

        const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle(`Ticket #${ticketId}`)
            .setDescription(`Merhaba <@${user.id}>, yetkililer kısa süre içinde sizinle ilgilenecektir.\n\nTalebi kapatmak için aşağıdaki butonu kullanabilirsiniz.`)
            .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Talebi Kapat')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({ content: `${user} | <@&${config.supportRoleId || guild.roles.everyone.id}>`, embeds: [embed], components: [row] });

        await interaction.reply({ content: `✅ Biletiniz oluşturuldu: ${channel}`, ephemeral: true });
    }

    if (customId === 'close_ticket') {
        const channel = interaction.channel as TextChannel;
        await interaction.reply('🔒 Kanal 5 saniye içinde silinecek...');
        setTimeout(() => channel.delete().catch(() => { }), 5000);
    }
}
