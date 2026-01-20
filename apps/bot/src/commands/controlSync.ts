import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, Role } from 'discord.js';
import { RegisterConfig } from './registerConfig'; // Type only
import { JsonDb } from '../utils/jsonDb';

const db = new JsonDb<RegisterConfig>('registerConfig.json', {});

export default {
    data: new SlashCommandBuilder()
        .setName('kontrol')
        .setDescription('Sunucudaki rolü eksik üyeleri tarar ve kayıtsız rolü verir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        await interaction.deferReply();

        const config = db.read()[interaction.guild.id];
        if (!config || !config.enabled) {
            return interaction.editReply('Kayıt sistemi bu sunucuda aktif değil veya ayarlanmamış.');
        }

        const unregRoleIds = config.unregisterRoleIds || [];
        const memberRoleIds = config.memberRoleIds || [];

        if (unregRoleIds.length === 0) {
            return interaction.editReply('Kayıtsız rolü ayarlanmamış. Lütfen önce kayıt sistemini kurun.');
        }

        const unregRole = interaction.guild.roles.cache.get(unregRoleIds[0]);
        if (!unregRole) {
            return interaction.editReply('Ayarlanan kayıtsız rolü sunucuda bulunamadı.');
        }

        // Fetch all members (ensure cache is full)
        const members = await interaction.guild.members.fetch();
        let fixedCount = 0;
        let alreadyOkCount = 0;
        let failCount = 0;

        for (const [id, member] of members) {
            if (member.user.bot) continue;

            const hasMemberRole = member.roles.cache.some((role: Role) => memberRoleIds.includes(role.id));
            const hasUnregRole = member.roles.cache.some((role: Role) => unregRoleIds.includes(role.id));

            // If user has NEITHER member role NOR unregister role -> Give Unregister
            if (!hasMemberRole && !hasUnregRole) {
                try {
                    await member.roles.add(unregRole);
                    fixedCount++;
                } catch (e) {
                    console.error(`Failed to add role to ${member.user.tag}:`, e);
                    failCount++;
                }
            } else {
                alreadyOkCount++;
            }
        }

        await interaction.editReply(`✅ **Kontrol Tamamlandı!**
- **${fixedCount}** kişiye kayıtsız rolü (${unregRole.name}) verildi.
- **${alreadyOkCount}** kişinin durumu zaten düzgündü.
- **${failCount}** işlemde hata oluştu.`);
    }
};
