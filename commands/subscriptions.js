// Code Nexus => https://discord.gg/wBTyCap8
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const loadSettings = () => {
    let settings;
    try {
        const settingsPath = path.join(__dirname, '..', 'setting.json');
        const settingsFile = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(settingsFile);
    } catch (error) {
        console.error(`${settings?.emojie?.error ?? "❌"} Failed to load setting.json:`, error.message);
        settings = {
            commands: {
                subscriptions: {
                    enable: true,
                    name: "subscriptions",
                    description: "View all subscriptions"
                }
            }
        };
    }
    return settings;
};

const loadConfig = () => {
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
    return config;
};

const createCommandData = () => {
    const settings = loadSettings();
    
    return new SlashCommandBuilder()
        .setName(settings.commands.subscriptions?.name)
        .setDescription(settings.commands.subscriptions?.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
};

module.exports = {
    data: createCommandData(),

    async execute(client, interaction) {
        const settings = loadSettings();
        const config = loadConfig();

        if (!settings.commands.subscriptions?.enable) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} This command is currently disabled.`))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (!config.OWNER.includes(interaction.user.id)) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} You do not have permission to use this command.`))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            const subscriptions = await client.Subscription.find().sort({ startDate: -1 });

            if (subscriptions.length === 0) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0x5865F2)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.subscriptions} No Subscriptions`))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# No subscriptions registered at the moment.'))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const itemsPerPage = 10;
            let totalPages = Math.ceil(subscriptions.length / itemsPerPage);
            let currentPage = 1;

            const statusEmoji = { active: `${settings.emojie.success}`, expired: `${settings?.emojie?.error ?? "❌"}`, cancelled: `${settings?.emojie?.error ?? "❌"}`, paused: `${settings.emojie.warning}` };

            const createPage = (page) => {
                const start = (page - 1) * itemsPerPage;
                const pageSubs = subscriptions.slice(start, start + itemsPerPage);
                const now = new Date();

                const lines = pageSubs.map(sub => {
                    const emoji = statusEmoji[sub.status] || `${settings.emojie.warning}`;
                    const daysLeft = Math.ceil((sub.endDate - now) / (1000 * 60 * 60 * 24));
                    const expiry = daysLeft > 0 ? `${daysLeft}d left` : 'Expired';
                    return (
                        `${emoji} **\`${sub.customId}\`** Â· ${sub.planName} Â· ${sub.serviceType}\n` +
                        `> <@${sub.userId}> Â· ${sub.email} Â· ${expiry} Â· <t:${Math.floor(sub.endDate.getTime() / 1000)}:R>`
                    );
                }).join('\n\n');

                return new ContainerBuilder()
                    .setAccentColor(0x5865F2)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.subscriptions} Subscriptions`))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `-# Page ${page}/${totalPages} Â· ${subscriptions.length} total subscriptions`
                    ));
            };

            const createButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('subscriptions_prev')
                        .setEmoji(settings.emojie.arrow_left)
                        .setLabel('Prev')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page <= 1),
                    new ButtonBuilder()
                        .setCustomId('subscriptions_next')
                        .setEmoji(settings.emojie.arrow_right)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages),
                    new ButtonBuilder()
                        .setCustomId('subscriptions_refresh')
                        .setEmoji(settings.emojie.refresh)
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Success)
                );
            };

            const message = await interaction.editReply({
                components: [createPage(currentPage), createButtons(currentPage)],
                flags: MessageFlags.IsComponentsV2
            });

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 300000
            });

            collector.on('collect', async (i) => {
                try {
                    const currentConfig = loadConfig();
                    if (!currentConfig.OWNER.includes(i.user.id)) {
                        return await i.reply({
                            components: [
                                new ContainerBuilder()
                                    .setAccentColor(0xF23F43)
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} You no longer have permission.`))
                            ],
                            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                        });
                    }

                    if (i.customId === 'subscriptions_prev' && currentPage > 1) {
                        currentPage--;
                    } else if (i.customId === 'subscriptions_next' && currentPage < totalPages) {
                        currentPage++;
                    } else if (i.customId === 'subscriptions_refresh') {
                        const updated = await client.Subscription.find().sort({ startDate: -1 });
                        subscriptions.length = 0;
                        subscriptions.push(...updated);
                        totalPages = Math.ceil(subscriptions.length / itemsPerPage);
                        currentPage = Math.min(currentPage, totalPages);
                    }

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
            console.error(`${settings?.emojie?.error ?? "❌"} Error executing subscriptions command:`, error);

            await interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} An error occurred while fetching subscriptions list.`))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
