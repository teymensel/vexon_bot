import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, Role } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rolbuton')
        .setDescription('Kullanıcıların butona basarak rol almasını sağlayan bir mesaj oluşturur.')
        .addStringOption(option =>
            option.setName('baslik')
                .setDescription('Embed mesajının başlığı')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('mesaj')
                .setDescription('Embed mesajının içeriği')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('rol')
                .setDescription('Butona basılınca verilecek rol')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('buton_yazisi')
                .setDescription('Butonun üzerinde yazacak metin')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('resim')
                .setDescription('Embed içine eklenecek görsel URL\'si (Opsiyonel)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Mesajın gönderileceği kanal (Seçilmezse bu kanala atar)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const title = interaction.options.getString('baslik') || '';
        const message = interaction.options.getString('mesaj') || '';
        const role = interaction.options.getRole('rol') as Role;
        const btnLabel = interaction.options.getString('buton_yazisi') || 'Rol Al';
        const imageUrl = interaction.options.getString('resim');
        const targetChannel = (interaction.options.getChannel('kanal') as TextChannel) || interaction.channel;

        if (!targetChannel || !targetChannel.isTextBased()) {
            return interaction.reply({ content: '❌ Geçersiz kanal.', ephemeral: true });
        }

        // Check if role is valid and manageable
        if (!role) {
            return interaction.reply({ content: '❌ Rol bulunamadı.', ephemeral: true });
        }

        // Basic check: if possible, checking if bot can manage the role would be good, 
        // but often requires fetching the guild member (me) etc. We'll assume it works or fail at runtime.

        const embed = new EmbedBuilder()
            .setColor(role.color || '#0099ff')
            .setTitle(title)
            .setDescription(message)
            .setFooter({ text: 'Rol Sistemi', iconURL: interaction.guild?.iconURL() || undefined });

        if (imageUrl) {
            try {
                new URL(imageUrl); // Validate URL
                embed.setImage(imageUrl);
            } catch (e) {
                return interaction.reply({ content: '❌ Geçersiz resim URL\'si.', ephemeral: true });
            }
        }

        // Validate customId length (max 100 char).Role ID is ~18-19 chars.
        // Prefix "give_role_" is 10 chars. Safe.
        const customId = `give_role_${role.id}`;

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(customId)
                    .setLabel(btnLabel)
                    .setStyle(ButtonStyle.Primary) // Blue button
                    .setEmoji('✨')
            );

        try {
            await targetChannel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `✅ Rol butonu başarıyla ${targetChannel} kanalına gönderildi.`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Mesaj gönderilirken bir hata oluştu. Botun kanalda yetkisi olduğundan emin olun.', ephemeral: true });
        }
    }
};
