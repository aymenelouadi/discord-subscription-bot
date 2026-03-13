// Code Nexus => https://discord.gg/wBTyCap8
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    MessageFlags
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

const loadSettings = () => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
    } catch {
        return { commands: { subscriptions: { enable: true, name: 'subscriptions', description: 'View all subscriptions' } }, emojie: {} };
    }
};

const loadConfig = () => {
    try {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
    } catch {
        return { OWNER: [] };
    }
};

const ITEMS_PER_PAGE = 8;

// ── Build the subscriptions page container ────────────────────────────────────
function buildPage(subs, allSubs, page, totalPages, filter, em) {
    const now   = new Date();
    const start = (page - 1) * ITEMS_PER_PAGE;
    const slice = subs.slice(start, start + ITEMS_PER_PAGE);

    const statusEmoji = {
        active:    em.success  ?? '✅',
        expired:   em.error    ?? '❌',
        cancelled: em.warning  ?? '⚠️',
    };

    const activeCount    = allSubs.filter(s => s.status === 'active').length;
    const expiredCount   = allSubs.filter(s => s.status === 'expired').length;
    const cancelledCount = allSubs.filter(s => s.status === 'cancelled').length;

    const headerStats =
        (em.success  ?? '✅') + ' ' + activeCount    + '  ' +
        (em.error    ?? '❌') + ' ' + expiredCount   + '  ' +
        (em.warning  ?? '⚠️') + ' ' + cancelledCount;

    const filterLabel = filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1);

    const lines = slice.map(sub => {
        const emoji    = statusEmoji[sub.status] ?? (em.warning ?? '⚠️');
        const daysLeft = Math.ceil((new Date(sub.endDate) - now) / 86400000);
        const expiry   = daysLeft > 0
            ? daysLeft + 'd left · <t:' + Math.floor(new Date(sub.endDate).getTime() / 1000) + ':R>'
            : 'Expired · <t:' + Math.floor(new Date(sub.endDate).getTime() / 1000) + ':R>';
        return (
            emoji + ' **`' + sub.customId + '`** · ' + sub.planName + ' · ' + sub.serviceType + '\n' +
            '> <@' + sub.userId + '> · `' + sub.email + '` · ' + expiry
        );
    }).join('\n\n');

    return new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            '## ' + (em.subscriptions ?? '📋') + ' Subscriptions · ' + filterLabel + '\n' +
            headerStats
        ))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            slice.length > 0 ? lines : '*No subscriptions match this filter.*'
        ))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            '-# ' + (em.clipboard ?? '📋') +
            ' Page ' + page + '/' + totalPages +
            ' · Showing ' + (start + 1) + '–' + Math.min(start + ITEMS_PER_PAGE, subs.length) +
            ' of ' + subs.length + ' results'
        ));
}

// ── Build navigation buttons ──────────────────────────────────────────────────
function buildButtons(page, totalPages, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('subs_first')
            .setEmoji({ name: '⏮' })
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page <= 1),
        new ButtonBuilder()
            .setCustomId('subs_prev')
            .setLabel('Prev')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || page <= 1),
        new ButtonBuilder()
            .setCustomId('subs_refresh')
            .setLabel('Refresh')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('subs_next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || page >= totalPages),
        new ButtonBuilder()
            .setCustomId('subs_last')
            .setEmoji({ name: '⏭' })
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page >= totalPages)
    );
}

// ── Build filter select menu ──────────────────────────────────────────────────
function buildFilterMenu(current, em, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('subs_filter')
            .setPlaceholder('Filter by status…')
            .setDisabled(disabled)
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('All')
                    .setValue('all')
                    .setEmoji({ name: '📋' })
                    .setDefault(current === 'all'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Active')
                    .setValue('active')
                    .setEmoji({ name: '✅' })
                    .setDefault(current === 'active'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Expired')
                    .setValue('expired')
                    .setEmoji({ name: '❌' })
                    .setDefault(current === 'expired'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Cancelled')
                    .setValue('cancelled')
                    .setEmoji({ name: '⚠️' })
                    .setDefault(current === 'cancelled')
            )
    );
}

module.exports = {
    data: (() => {
        const settings = loadSettings();
        return new SlashCommandBuilder()
            .setName(settings.commands.subscriptions?.name || 'subscriptions')
            .setDescription(settings.commands.subscriptions?.description || 'View all subscriptions')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
    })(),

    async execute(client, interaction) {
        const settings = loadSettings();
        const config   = loadConfig();
        const em       = settings.emojie ?? {};

        if (!settings.commands.subscriptions?.enable) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
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
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            (em.error ?? '❌') + ' You do not have permission to use this command.'
                        ))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            // ── Initial data load ─────────────────────────────────────
            let allSubs = await client.Subscription.find().sort({ startDate: -1 });

            if (allSubs.length === 0) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x5865F2)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '## ' + (em.subscriptions ?? '📋') + ' Subscriptions'
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '-# No subscriptions registered at the moment.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // ── State ────────────────────────────────────────────────
            let currentPage   = 1;
            let currentFilter = 'all';

            const getFiltered = () =>
                currentFilter === 'all'
                    ? allSubs
                    : allSubs.filter(s => s.status === currentFilter);

            let filtered    = getFiltered();
            let totalPages  = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

            // ── Initial reply ────────────────────────────────────────
            const message = await interaction.editReply({
                components: [
                    buildPage(filtered, allSubs, currentPage, totalPages, currentFilter, em),
                    buildFilterMenu(currentFilter, em),
                    buildButtons(currentPage, totalPages)
                ],
                flags: MessageFlags.IsComponentsV2
            });

            // ── Collector (5 min, auto-disable on end) ───────────────
            const collector = message.createMessageComponentCollector({
                filter: i => config.OWNER.includes(i.user.id),
                time:   5 * 60 * 1000
            });

            collector.on('collect', async i => {
                try {
                    // Refresh config on each interaction
                    const freshConfig = loadConfig();
                    if (!freshConfig.OWNER.includes(i.user.id)) {
                        return await i.reply({
                            components: [
                                new ContainerBuilder()
                                    .setAccentColor(0xF23F43)
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                        (em.error ?? '❌') + ' You no longer have permission.'
                                    ))
                            ],
                            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                        });
                    }

                    // ── Handle filter change ──────────────────────────
                    if (i.customId === 'subs_filter') {
                        currentFilter = i.values[0];
                        currentPage   = 1;
                    }

                    // ── Handle navigation ─────────────────────────────
                    else if (i.customId === 'subs_first') {
                        currentPage = 1;
                    } else if (i.customId === 'subs_prev' && currentPage > 1) {
                        currentPage--;
                    } else if (i.customId === 'subs_next' && currentPage < totalPages) {
                        currentPage++;
                    } else if (i.customId === 'subs_last') {
                        currentPage = totalPages;
                    }

                    // ── Handle refresh ────────────────────────────────
                    else if (i.customId === 'subs_refresh') {
                        allSubs = await client.Subscription.find().sort({ startDate: -1 });
                    }

                    // ── Recompute filtered list & pages ───────────────
                    filtered   = getFiltered();
                    totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
                    currentPage = Math.min(currentPage, totalPages);

                    await i.update({
                        components: [
                            buildPage(filtered, allSubs, currentPage, totalPages, currentFilter, em),
                            buildFilterMenu(currentFilter, em),
                            buildButtons(currentPage, totalPages)
                        ],
                        flags: MessageFlags.IsComponentsV2
                    });

                } catch (err) {
                    console.error((em.error ?? '❌') + ' Error in subscriptions collector:', err);
                }
            });

            // ── Disable all controls when session expires ─────────────
            collector.on('end', async () => {
                try {
                    await message.edit({
                        components: [
                            buildPage(filtered, allSubs, currentPage, totalPages, currentFilter, em),
                            buildFilterMenu(currentFilter, em, true),
                            buildButtons(currentPage, totalPages, true)
                        ],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch {}
            });

        } catch (error) {
            console.error((settings.emojie?.error ?? '❌') + ' Error in /subscriptions:', error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                (settings.emojie?.error ?? '❌') + ' An error occurred while fetching the subscriptions list.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
