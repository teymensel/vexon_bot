
import { Message, PermissionFlagsBits, Role, TextChannel } from 'discord.js';
import { JsonDb } from '../utils/jsonDb';

interface RegisterConfig {
    [guildId: string]: {
        staffRoleIds: string[];
        memberRoleIds: string[];
        logChannelId?: string;
        unregisterRoleId?: string; // Optional: Role to remove
        enabled: boolean;
        tag?: string; // e.g. "★"
    };
}

const db = new JsonDb<RegisterConfig>('registerConfig.json', {});

export default {
    data: {
        name: 'kayıt-config',
    },
    // Supports both slash and prefix (for prefix mainly due to user request '+kayıt')
    async execute(message: Message, args: string[]) {
        // Restriction: Only Bot 2
        const client = message.client as any;
        if (client.botIndex !== 2) return;

        // Admin Check
        if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('⛔ Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısın!');
        }

        const guildId = message.guild!.id;
        // Adjust args for '+kayıt-config' (args[0] is the command if pure prefix handler, but usually handler strips it)
        // Assuming handler passes ["arg1", "arg2"]
        const subCommand = args[0]?.toLowerCase();

        db.update(data => {
            if (!data[guildId]) {
                data[guildId] = {
                    staffRoleIds: [],
                    memberRoleIds: [],
                    enabled: true
                };
            }
        });

        if (subCommand === 'add-staff') {
            const role = message.mentions.roles.first();
            if (!role) return message.reply('**Kullanım:** `+kayıt-config add-staff @yetkili-rolü`');

            db.update(data => {
                const roles = data[guildId].staffRoleIds || [];
                if (!roles.includes(role.id)) roles.push(role.id);
                data[guildId].staffRoleIds = roles;
            });
            return message.reply(`✅ **${role.name}** artık kayıt yapabilir.`);
        }

        if (subCommand === 'add-role') {
            const role = message.mentions.roles.first();
            if (!role) return message.reply('**Kullanım:** `+kayıt-config add-role @verilecek-rol`');

            db.update(data => {
                const roles = data[guildId].memberRoleIds || [];
                if (!roles.includes(role.id)) roles.push(role.id);
                data[guildId].memberRoleIds = roles;
            });
            return message.reply(`✅ **${role.name}** artık kayıt edilenlere verilecek.`);
        }

        if (subCommand === 'set-log') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply('**Kullanım:** `+kayıt-config set-log #kanal`');

            db.update(data => {
                data[guildId].logChannelId = channel.id;
            });
            return message.reply(`✅ Kayıt logları **${channel}** kanalına düşecek.`);
        }

        if (subCommand === 'toggle') {
            let newState = false;
            db.update(data => {
                data[guildId].enabled = !data[guildId].enabled;
                newState = data[guildId].enabled;
            });
            return message.reply(`ℹ️ Kayıt sistemi **${newState ? 'AÇIK' : 'KAPALI'}**.`);
        }

        // Default: Status
        const config = db.read()[guildId];
        const staffRoles = config.staffRoleIds.map(id => `<@&${id}>`).join(', ') || 'Yok';
        const memberRoles = config.memberRoleIds.map(id => `<@&${id}>`).join(', ') || 'Yok';

        return message.reply(`**Kayıt Sistemi Ayarları:**
        - Durum: **${config.enabled ? 'AÇIK' : 'KAPALI'}**
        - Yetkili Roller: ${staffRoles}
        - Verilecek Roller: ${memberRoles}
        - Log Kanalı: <#${config.logChannelId || 'Ayarlanmamış'}>
        
        **Komutlar:**
        - \`add-staff @rol\`, \`add-role @rol\`, \`set-log #kanal\`, \`toggle\``);
    }
};
