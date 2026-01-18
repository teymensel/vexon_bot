
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, ChannelType } from 'discord.js';
import { TicketDb } from '../utils/ticketDb';

export default {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Destek talebi (Ticket) panelini kurar (Sadece Bot 2).')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Panelin kurulacağı kanal (Boş bırakılırsa buraya kurulur)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;

        // Restriction: Only Bot 2
        if (client.botIndex !== 2) {
            return interaction.reply({ content: '⛔ Bu komut sadece **Bot 2 (Asistan)** tarafından kullanılabilir.', ephemeral: true });
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '⛔ Bu işlemi yapmak için **Yönetici** yetkisine sahip olmalısınız.', ephemeral: true });
        }

        const channel = (interaction.options.getChannel('kanal') as TextChannel) || interaction.channel;

        if (!channel || channel.type !== ChannelType.GuildText) {
            return interaction.reply({ content: '❌ Geçersiz kanal.', ephemeral: true });
        }

        TicketDb.update(interaction.guildId!, (data) => {
            data.ticketChannelId = channel.id;
        });

        const embed = new EmbedBuilder()
            .setColor('#2F3136')
            .setTitle('📨 Destek Talebi Oluştur')
            .setDescription('Bir sorununuz mu var? Destek ekibiyle iletişime geçmek için aşağıdaki butona tıklayın.')
            .setThumbnail(interaction.guild?.iconURL() || null)
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

        await interaction.reply({ content: `✅ Destek paneli ${channel} kanalına başarıyla kuruldu.`, ephemeral: true });
    }
};
