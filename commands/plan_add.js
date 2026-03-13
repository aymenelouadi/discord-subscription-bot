// commands/plan_add.js
// Code Nexus => https://discord.gg/wBTyCap8

const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
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
            commands: {}
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

const saveSettings = (newSettings) => {
    try {
        const settingsPath = path.join(__dirname, '..', 'setting.json');
        fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 4), 'utf8');
        return true;
    } catch (error) {
        console.error(`${settings?.emojie?.error ?? "❌"} Failed to save settings:`, error);
        return false;
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plan_add')
        .setDescription('Add a new plan to subscribe command')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('plan')
                .setDescription('New plan name to add')
                .setRequired(true)
                .setMaxLength(50)),

    async execute(client, interaction) {
        const settings = loadSettings();
        const config = loadConfig();

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

            const newPlan = interaction.options.getString('plan').trim();
            const currentSettings = loadSettings();

            if (!currentSettings.commands.subscribe) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Subscribe command not found in settings.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (!Array.isArray(currentSettings.commands.subscribe.plan)) {
                currentSettings.commands.subscribe.plan = [];
            }

            if (currentSettings.commands.subscribe.plan.includes(newPlan)) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Plan **${newPlan}** already exists.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (currentSettings.commands.subscribe.plan.length >= 25) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Maximum limit of 25 plans reached. Please remove some plans first.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const updatedSettings = {
                ...currentSettings,
                commands: {
                    ...currentSettings.commands,
                    subscribe: {
                        ...currentSettings.commands.subscribe,
                        plan: [...currentSettings.commands.subscribe.plan, newPlan]
                    }
                }
            };

            const saveSuccess = saveSettings(updatedSettings);

            if (!saveSuccess) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Failed to save settings to file.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            console.log(`${settings.emojie.success} Plan added: ${newPlan} by ${interaction.user.tag}`);

            const allPlans = updatedSettings.commands.subscribe.plan;
            const container = new ContainerBuilder()
                .setAccentColor(0x23C55E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.plan_add} Plan Added`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**New Plan** \u00b7 \`${newPlan}\`\n` +
                    `**Added By** \u00b7 <@${interaction.user.id}>\n` +
                    `**Total Plans** \u00b7 ${allPlans.length}/25`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**All Available Plans**\n${allPlans.map(p => `> \`${p}\``).join('\n')}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# ${settings.emojie.chart} Plans Management \u00b7 Changes take effect immediately`
                ));

            await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? "❌"} Error executing plan_add command:`, error);
            await interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} An error occurred while adding plan.`))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
