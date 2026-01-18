
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { guardianDb, defaultGuildConfig } from '../utils/guardianDb';

// Factory function to create similar limit commands
// Type: 'ban' | 'kick' | 'channelCreate' ...
const createLimitCommand = (
    name: string,
    description: string,
    key: keyof typeof defaultGuildConfig.limits,
    simpleToggle: boolean = false
) => {
    return {
        data: new SlashCommandBuilder()
            .setName(name)
            .setDescription(description)
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(opt =>
                opt.setName('durum')
                    .setDescription('Koruma durumu')
                    .setRequired(true)
                    .addChoices({ name: 'Aç', value: 'on' }, { name: 'Kapat', value: 'off' })
            )
            .addIntegerOption(opt =>
                opt.setName('limit')
                    .setDescription(`Limit sayısı (Varsayılan: 3)${simpleToggle ? ' - Bu seçenek yoksayılır' : ''}`)
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('islem')
                    .setDescription('Limit aşımında yapılacak işlem')
                    .setRequired(false)
                    .addChoices(
                        { name: 'Kullanıcıyı At (Kick)', value: 'kick' },
                        { name: 'Kullanıcıyı Yasakla (Ban)', value: 'ban' },
                        { name: 'Sadece Logla', value: 'log' }
                    )
            ),

        async execute(interaction: ChatInputCommandInteraction) {
            const client = interaction.client as any;
            if (client.botIndex !== 4) return interaction.reply({ content: '⛔ Sadece Bot 4 (Guardian).', ephemeral: true });

            const guildId = interaction.guildId!;
            const enabled = interaction.options.getString('durum') === 'on';
            const limit = interaction.options.getInteger('limit');
            const action = interaction.options.getString('islem');

            guardianDb.update(data => {
                if (!data[guildId]) {
                    // Safety init (though usually handled)
                    data[guildId] = JSON.parse(JSON.stringify(defaultGuildConfig));
                    data[guildId].enabled = true; // Auto-enable main toggle if configuring sub-module?
                }

                const moduleStr = key as string; // TS Hack if needed, but keyof should assume valid
                const mod = data[guildId].limits[key];

                mod.enabled = enabled;
                if (limit && 'limit' in mod) (mod as any).limit = limit;
                if (action) mod.action = action as any;
            });

            await interaction.reply({
                content: `🛡️ **${name}** başarıyla güncellendi!\nDurum: **${enabled ? 'AÇIK' : 'KAPALI'}**${limit ? `\nLimit: ${limit}` : ''}${action ? `\nİşlem: ${action}` : ''}`
            });
        }
    };
};

export default [
    createLimitCommand('banengel', 'Sağ tık ban koruması.', 'ban'),
    createLimitCommand('kickengel', 'Sağ tık kick koruması.', 'kick'),
    createLimitCommand('kanalengel', 'Kanal silme/oluşturma koruması.', 'channelDelete'), // Assuming channelDelete handles both or name implies deletion focus. User asked for 'kanalengel' generically. Let's map to channelDelete for now as deletion is critical. ideally merge?
    // User requested 'kanalengel'. Usually means deletion. 
    // Let's create 'kanalengel' map to 'channelDelete' primarily.

    createLimitCommand('rolengel', 'Rol silme/oluşturma koruması.', 'roleDelete'),
    createLimitCommand('webhookengel', 'Webhook açma koruması.', 'webhook', true), // Webhook usually doesn't need limit count, just on/off
    createLimitCommand('botengel', 'Bot ekleme koruması.', 'botAdd', true)
];
