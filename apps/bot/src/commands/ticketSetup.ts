
import { Message, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from 'discord.js';
import { TicketDb } from '../utils/ticketDb';

export default {
    data: {
        name: 'ticket-setup',
    },
    async execute(message: Message, args: string[]) {
        const client = message.client as any;
        if (client.botIndex !== 2) return; // Only Bot 2

        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('⛔ Bu komut için Yönetici yetkisi gerekli.');
        }

        const channel = message.mentions.channels.first() as TextChannel || message.channel;

        TicketDb.update(message.guild!.id, (data) => {
            data.ticketChannelId = channel.id;
        });

        const embed = new EmbedBuilder()
            .setColor('#2F3136')
            .setTitle('📨 Destek Talebi Oluştur')
            .setDescription('Bir sorununuz mu var? Destek ekibiyle iletişime geçmek için aşağıdaki butona tıklayın.')
            .setThumbnail(message.guild?.iconURL() || null)
            .setFooter({ text: 'Valorica Destek Sistemi' });

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('Destek Oluştur')
                    .setEmoji('📩')
                    .setStyle(ButtonStyle.Primary)
            );

        await channel.send({ embeds: [embed], components: [row] });
        if (channel.id !== message.channel.id) {
            await message.reply(`✅ Destek paneli ${channel} kanalına kuruldu.`);
        }
    }
};
