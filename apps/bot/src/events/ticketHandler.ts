
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
        await interaction.deferReply({ ephemeral: true });
        const config = TicketDb.get(guild.id);

        // Prevent spam? (Check if user already has a ticket?) 
        // For simplicity, we create new.

        const ticketId = TicketDb.nextTicketId(guild.id);
        const channelName = `ticket-${ticketId}`;

        // Permission Logic
        const overwrites: any[] = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
        ];

        // Support Role
        if (config.supportRoleId) {
            overwrites.push({
                id: config.supportRoleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            });
        }

        // Add roles with "Manage Guild" (Sunucuyu Yönet) permission
        guild.roles.cache.forEach(role => {
            if (role.name !== '@everyone' && role.permissions.has(PermissionFlagsBits.ManageGuild)) {
                // Avoid duplicates if support role is same
                if (config.supportRoleId === role.id) return;
                overwrites.push({
                    id: role.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                });
            }
        });

        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: config.category,
            permissionOverwrites: overwrites,
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

        await interaction.editReply({ content: `✅ Biletiniz oluşturuldu: ${channel}` });
    }

    if (customId === 'close_ticket') {
        const channel = interaction.channel as TextChannel;
        await interaction.reply('🔒 Kanal 5 saniye içinde silinecek...');
        setTimeout(() => channel.delete().catch(() => { }), 5000);
    }
}
