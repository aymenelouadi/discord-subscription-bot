// Code Nexus => https://discord.gg/wBTyCap8

const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

let settings;
try {
    const settingsPath = path.join(__dirname, '..', 'setting.json');
    const settingsFile = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(settingsFile);
} catch (error) {
    console.error(`${settings?.emojie?.error ?? "❌"} Failed to load setting.json:`, error.message);
    settings = {
        commands: {
            info: {
                enable: true,
                name: "info",
                description: "View subscription info"
            }
        }
    };
}

let config;
try {
    const configPath = path.join(__dirname, '..', 'config.json');
    const configFile = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configFile);
} catch (error) {
    console.error(`${settings?.emojie?.error ?? "❌"} Failed to load config.json:`, error.message);
    config = {
        OWNER: []
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(settings.commands.info?.name)
        .setDescription(settings.commands.info?.description)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view subscriptions (admins only)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Filter subscriptions by status')
                .addChoices(
                    { name: `${settings.emojie.success} Active`, value: 'active' },
                    { name: `${settings?.emojie?.error ?? "❌"} Expired`, value: 'expired' },
                    { name: `${settings?.emojie?.error ?? "❌"} Cancelled`, value: 'cancelled' }
                )
                .setRequired(false))
        .addStringOption(option =>
            option.setName('search')
                .setDescription('Search by email or custom ID')
                .setRequired(false)),

    async execute(client, interaction) {
        if (!settings.commands.info?.enable) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} This command is currently disabled.`))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });
            const targetUserOption = interaction.options.getUser('user');
            const statusFilter = interaction.options.getString('status');
            const searchQuery = interaction.options.getString('search');
            const isOwner = config.OWNER.includes(interaction.user.id);

            let targetUserId;
            let targetUser;

            if (targetUserOption) {
                if (!isOwner) {
                    return await interaction.editReply({
                        components: [
                            new ContainerBuilder()
                                .setAccentColor(0xF23F43)
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} You do not have permission to view other users\' subscriptions.`))
                        ],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
                targetUserId = targetUserOption.id;
                targetUser = targetUserOption;
            } else {
                targetUserId = interaction.user.id;
                targetUser = interaction.user;
            }

            let query = { userId: targetUserId };
            if (statusFilter) query.status = statusFilter;

            if (searchQuery) {
                if (!isOwner) {
                    return await interaction.editReply({
                        components: [
                            new ContainerBuilder()
                                .setAccentColor(0xF23F43)
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Search functionality is available for administrators only.`))
                        ],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
                query.$or = [
                    { customId: { $regex: searchQuery, $options: 'i' } },
                    { email: { $regex: searchQuery, $options: 'i' } }
                ];
            }

            const subscriptions = await client.Subscription.find(query).sort({ startDate: -1 });

            if (subscriptions.length === 0) {
                let msg = targetUserOption
                    ? `${settings.emojie.mail} No subscriptions found for <@${targetUserId}>`
                    : `${settings.emojie.mail} You have no subscriptions.`;
                if (statusFilter) msg += `\n**Filter** · ${statusFilter}`;
                if (searchQuery) msg += `\n**Search** · ${searchQuery}`;

                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x5865F2)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(msg))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const itemsPerPage = 5;
            const totalPages = Math.ceil(subscriptions.length / itemsPerPage);
            let currentPage = 1;

            const statusEmoji = { active: `${settings.emojie.success}`, expired: `${settings?.emojie?.error ?? "❌"}`, cancelled: `${settings?.emojie?.error ?? "❌"}` };
            const statusLabel = { active: 'Active', expired: 'Expired', cancelled: 'Cancelled' };
            const accentColor = { active: 0x23C55E, expired: 0xF23F43, cancelled: 0x747F8D };

            const createPage = (page) => {
                const start = (page - 1) * itemsPerPage;
                const pageSubs = subscriptions.slice(start, start + itemsPerPage);
                const now = new Date();
                const firstStatus = pageSubs[0]?.status;
                const color = accentColor[firstStatus] || 0x5865F2;

                let header = targetUserOption
                    ? `## ${settings.emojie.info} Subscriptions — <@${targetUserId}>`
                    : `## ${settings.emojie.info} My Subscriptions`;
                if (statusFilter) header += ` · ${statusLabel[statusFilter] || statusFilter}`;
                if (searchQuery) header += ` · "${searchQuery}"`;

                const lines = pageSubs.map(sub => {
                    const emoji = statusEmoji[sub.status] || `${settings.emojie.warning}`;
                    const label = statusLabel[sub.status] || sub.status;
                    const endTs = Math.floor(sub.endDate.getTime() / 1000);
                    const daysLeft = Math.ceil((sub.endDate - now) / (1000 * 60 * 60 * 24));
                    const timeText = daysLeft > 0 ? `${daysLeft}d remaining` : 'Expired';

                    let line =
                        `${emoji} **${sub.planName}** · ${sub.serviceType} · ${label}\n` +
                        `> **Ends** <t:${endTs}:D> · ${timeText}`;

                    if (isOwner) {
                        line +=
                            `\n> **ID** \`${sub.customId}\`  **Email** ${sub.email}` +
                            (sub.ip ? `  **IP** \`${sub.ip}\`` : '') +
                            `\n> **Started** <t:${Math.floor(sub.startDate.getTime() / 1000)}:D>` +
                            (sub.note ? `\n> **Note** ${sub.note}` : '');
                    }

                    return line;
                }).join('\n\n');

                const builder = new ContainerBuilder()
                    .setAccentColor(color)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(header))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines));

                if (isOwner && page === 1) {
                    const active = subscriptions.filter(s => s.status === 'active').length;
                    const expired = subscriptions.filter(s => s.status === 'expired').length;
                    const cancelled = subscriptions.filter(s => s.status === 'cancelled').length;

                    builder
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `**Stats** · ${settings.emojie.success} ${active} active  ${settings?.emojie?.error ?? "❌"} ${expired} expired  ${settings?.emojie?.error ?? "❌"} ${cancelled} cancelled`
                        ));
                }

                builder
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `-# Page ${page}/${totalPages} · ${subscriptions.length} subscription${subscriptions.length !== 1 ? 's' : ''}`
                    ));

                return builder;
            };

            const createButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('info_prev')
                        .setEmoji(settings.emojie.arrow_left)
                        .setLabel('Prev')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page <= 1),
                    new ButtonBuilder()
                        .setCustomId('info_next')
                        .setEmoji(settings.emojie.arrow_right)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages)
                );
            };

            const msgOptions = {
                components: totalPages > 1
                    ? [createPage(currentPage), createButtons(currentPage)]
                    : [createPage(currentPage)],
                flags: MessageFlags.IsComponentsV2
            };

            const message = await interaction.editReply(msgOptions);

            if (totalPages <= 1) return;

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 300000
            });

            collector.on('collect', async (i) => {
                try {
                    if (i.customId === 'info_prev' && currentPage > 1) currentPage--;
                    else if (i.customId === 'info_next' && currentPage < totalPages) currentPage++;

                    await i.update({
                        components: [createPage(currentPage), createButtons(currentPage)],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (error) {
                    console.error(`${settings?.emojie?.error ?? "❌"} Error handling interaction:`, error);
                }
            });

            collector.on('end', async () => {
                try {
                    await message.edit({
                        components: [createPage(currentPage)],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (error) {
                    console.error(`${settings?.emojie?.error ?? "❌"} Error ending collector:`, error);
                }
            });

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? "❌"} Error executing info command:`, error);

            await interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} An error occurred while fetching subscription information.`))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
