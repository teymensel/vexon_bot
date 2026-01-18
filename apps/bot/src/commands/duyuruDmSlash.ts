
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('duyurudm')
        .setDescription('Özel mesaj yoluyla duyuru gönderir.')
        .addSubcommand(sub =>
            sub.setName('rol')
                .setDescription('Belirli bir roldeki herkese DM atar.')
                .addRoleOption(opt => opt.setName('rol').setDescription('Hedef rol').setRequired(true))
                .addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('tek')
                .setDescription('Belirli bir kullanıcıya DM atar.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Hedef kullanıcı').setRequired(true))
                .addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('herkes')
                .setDescription('Sunucudaki HERKESE DM atar. (Dikkatli kullanın!)')
                .addStringOption(opt => opt.setName('baslik').setDescription('Mesaj Başlığı').setRequired(true))
                .addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as any;
        // Verify Bot 3 (Assistant)
        if (client.botIndex !== 3) {
            return interaction.reply({ content: '⛔ Sadece Bot 3 (Asistan).', ephemeral: true });
        }

        // Defer immediately
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const guildName = interaction.guild?.name || 'Sunucu';

        // --- SUBCOMMAND: TEK ---
        if (subcommand === 'tek') {
            const user = interaction.options.getUser('kullanici');
            const message = interaction.options.getString('mesaj') || '';

            if (!user) return interaction.editReply({ content: '❌ Kullanıcı bulunamadı.' });
            if (user.bot) return interaction.editReply({ content: '❌ Botlara mesaj atılamaz.' });

            try {
                await user.send(`📢 **${guildName} Duyuru:**\n\n${message}`);
                await interaction.editReply({ content: `✅ ${user} kullanıcısına mesaj gönderildi.` });
            } catch (error) {
                await interaction.editReply({ content: `❌ ${user} kullanıcısına mesaj atılamadı (DM Kapalı olabilir).` });
            }
        }

        // --- SUBCOMMAND: ROL & HERKES ---
        else {
            let targetMembers: any;
            let messageContent = '';

            if (subcommand === 'rol') {
                const role = interaction.options.getRole('rol');
                const msg = interaction.options.getString('mesaj') || '';

                if (!role) return interaction.editReply({ content: '❌ Rol bulunamadı.' });

                messageContent = `📢 **${guildName} Duyuru:**\n\n${msg}`;

                await interaction.guild?.members.fetch();
                targetMembers = interaction.guild?.members.cache.filter(m => m.roles.cache.has(role.id) && !m.user.bot);
            }
            else if (subcommand === 'herkes') {
                const title = interaction.options.getString('baslik') || 'Duyuru';
                const msg = interaction.options.getString('mesaj') || '';

                messageContent = `📢 **${guildName} - ${title}**\n\n${msg}`;

                await interaction.guild?.members.fetch();
                targetMembers = interaction.guild?.members.cache.filter(m => !m.user.bot);
            }

            if (!targetMembers || targetMembers.size === 0) {
                return interaction.editReply({ content: '⚠️ Gönderilecek üye bulunamadı.' });
            }

            await interaction.editReply({ content: `📨 ${targetMembers.size} kişiye DM gönderiliyor... Bu işlem biraz zaman alabilir.` });

            let success = 0;
            let fail = 0;

            for (const [id, member] of targetMembers) {
                try {
                    await member.send(messageContent);
                    success++;
                    // Jitter delay (500ms - 1500ms)
                    const delay = Math.floor(Math.random() * 1000) + 500;
                    await new Promise(r => setTimeout(r, delay));
                } catch {
                    fail++;
                }
            }

            await interaction.followUp({ content: `✅ **${subcommand.toUpperCase()}** Gönderimi Tamamlandı.\n📤 Başarılı: ${success}\n❌ Başarısız: ${fail}`, ephemeral: true });
        }
    }
};
