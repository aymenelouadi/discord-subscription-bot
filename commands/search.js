// Code Nexus => https://discord.gg/wBTyCap8
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

module.exports = {
    data: (() => {
        let settings;
        try {
            settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
        } catch {
            settings = { commands: { search: { enable: true, name: 'search', description: 'Search subscriptions by ID, email, user, or plan' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.search?.name || 'search')
            .setDescription(settings.commands.search?.description || 'Search subscriptions by ID, email, user, or plan')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(opt =>
                opt.setName('query')
                    .setDescription('customId, email, userId, or planName to search for')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(100))
            .addStringOption(opt =>
                opt.setName('field')
                    .setDescription('Limit search to a specific field (default: all fields)')
                    .setRequired(false)
                    .addChoices(
                        { name: 'Custom ID',    value: 'customId'    },
                        { name: 'Email',        value: 'email'       },
                        { name: 'User ID',      value: 'userId'      },
                        { name: 'Plan Name',    value: 'planName'    },
                        { name: 'Service Type', value: 'serviceType' }
                    ));
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8')); }
            catch { return { commands: { search: { enable: true } }, emojie: {} }; }
        })();
        const config = (() => {
            try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8')); }
            catch { return { OWNER: [] }; }
        })();
        const em = settings.emojie ?? {};

        if (!settings.commands.search?.enable) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder().setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            (em.error ?? '❌') + ' This command is currently disabled.'
                        ))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (!config.OWNER.includes(interaction.user.id)) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder().setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            (em.error ?? '❌') + ' You do not have permission to use this command.'
                        ))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            const raw   = interaction.options.getString('query').trim();
            const field = interaction.options.getString('field');

            // ── Build MongoDB query ───────────────────────────────────
            let mongoQuery;
            const reInsensitive = { $regex: raw, $options: 'i' };

            if (field) {
                // Exact match for IDs, regex for text fields
                if (field === 'customId' || field === 'userId') {
                    mongoQuery = { [field]: raw };
                } else {
                    mongoQuery = { [field]: reInsensitive };
                }
            } else {
                // Search across all fields
                mongoQuery = {
                    $or: [
                        { customId:    raw            },   // exact
                        { userId:      raw            },   // exact
                        { email:       reInsensitive  },
                        { planName:    reInsensitive  },
                        { serviceType: reInsensitive  }
                    ]
                };
            }

            const results = await client.Subscription.find(mongoQuery).sort({ startDate: -1 }).limit(20);

            // ── No results ────────────────────────────────────────────
            if (results.length === 0) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder().setAccentColor(0xF0B232)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '## ' + (em.search ?? '🔍') + ' No Results Found'
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                'No subscriptions matched **' + raw + '**' +
                                (field ? ' in field `' + field + '`' : ' across all fields') + '.'
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '-# ' + (em.clipboard ?? '📋') + ' Try a different query or field filter.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // ── Build results ─────────────────────────────────────────
            const now = new Date();
            const statusEmoji = {
                active:    em.success  ?? '✅',
                expired:   em.error    ?? '❌',
                cancelled: em.warning  ?? '⚠️'
            };

            const lines = results.map(sub => {
                const emoji    = statusEmoji[sub.status] ?? (em.warning ?? '⚠️');
                const daysLeft = Math.ceil((new Date(sub.endDate) - now) / 86400000);
                const expiry   = daysLeft > 0
                    ? daysLeft + 'd · <t:' + Math.floor(new Date(sub.endDate).getTime() / 1000) + ':R>'
                    : 'Expired <t:' + Math.floor(new Date(sub.endDate).getTime() / 1000) + ':R>';
                return (
                    emoji + ' **`' + sub.customId + '`** · ' + sub.planName + ' · ' + sub.serviceType + '\n' +
                    '> <@' + sub.userId + '> · `' + sub.email + '` · ' + expiry
                );
            }).join('\n\n');

            const fieldLabel = field ? ' — field: `' + field + '`' : ' — all fields';
            const limitNote  = results.length === 20 ? ' *(first 20 shown)*' : '';

            const container = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '## ' + (em.search ?? '🔍') + ' Search Results'
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '-# ' + (em.clipboard ?? '📋') +
                    ' **' + results.length + '** result' + (results.length !== 1 ? 's' : '') +
                    ' for **' + raw + '**' + fieldLabel + limitNote
                ));

            await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error((settings.emojie?.error ?? '❌') + ' Error in /search:', error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder().setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                (settings.emojie?.error ?? '❌') + ' An error occurred while searching.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
