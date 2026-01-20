
import { Message, PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder, ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('emojiekle')
        .setDescription('Sunucuya emoji ekler.')
        .addStringOption(option => option.setName('isim').setDescription('Emoji ismi').setRequired(true))
        .addAttachmentOption(option => option.setName('resim').setDescription('Emoji resmi').setRequired(true)),

    // Support both interactions
    async execute(interaction: ChatInputCommandInteraction | Message, args?: string[]) {
        const isSlash = interaction instanceof ChatInputCommandInteraction;
        const guild = interaction.guild;
        if (!guild) return;

        // 1. Permission Check
        const member = isSlash ? (interaction.member as any) : (interaction.member);
        if (!member.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            const msg = '⛔ Bu komutu kullanmak için **Emojileri Yönet** yetkisine sahip olmalısın.';
            return isSlash ? (interaction as ChatInputCommandInteraction).reply({ content: msg, ephemeral: true }) : (interaction as Message).reply(msg);
        }

        // 2. Parse Inputs
        let emojiName = '';
        let emojiUrl = '';

        if (isSlash) {
            const cmd = interaction as ChatInputCommandInteraction;
            emojiName = cmd.options.getString('isim')!;
            const attachment = cmd.options.getAttachment('resim');
            if (attachment) emojiUrl = attachment.url;
        } else {
            // Legacy: va!emojiekle <isim> [url/attachment]
            const msg = interaction as Message;
            if (!args || args.length === 0) {
                return msg.reply('⚠️ Kullanım: `!emojiekle <isim> [resim/url]`');
            }

            // Name: First arg (strip colons if user typed :name:)
            emojiName = args[0].replace(/:/g, '');

            // Image: Attachment OR Second Arg
            if (msg.attachments.size > 0) {
                emojiUrl = msg.attachments.first()!.url;
            } else if (args.length > 1) {
                emojiUrl = args[1];
            } else {
                return msg.reply('❌ Lütfen bir resim yükleyin veya URL belirtin.');
            }
        }

        // 3. Create Emoji
        try {
            if (isSlash) await (interaction as ChatInputCommandInteraction).deferReply();

            const emoji = await guild.emojis.create({ attachment: emojiUrl, name: emojiName });
            const successMsg = `✅ Başarıyla eklendi: ${emoji} \`:${emoji.name}:\``;

            if (isSlash) {
                await (interaction as ChatInputCommandInteraction).editReply(successMsg);
            } else {
                await (interaction as Message).reply(successMsg);
            }

        } catch (error: any) {
            console.error(error);
            const errText = `❌ Emoji eklenirken hata oluştu. (Dosya boyutu çok büyük olabilir veya limit dolmuş olabilir). \nDetay: ${error.message}`;

            if (isSlash) {
                // If deferred/replied
                try { await (interaction as ChatInputCommandInteraction).editReply(errText); } catch { await (interaction as ChatInputCommandInteraction).reply({ content: errText, ephemeral: true }); }
            } else {
                await (interaction as Message).reply(errText);
            }
        }
    }
};
