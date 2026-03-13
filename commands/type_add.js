// commands/type_add.js
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
        .setName('type_add')
        .setDescription('Add a new service type to subscribe command')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('New service type to add')
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

            const newType = interaction.options.getString('type').trim().toUpperCase();
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

            if (!Array.isArray(currentSettings.commands.subscribe.type)) {
                currentSettings.commands.subscribe.type = [];
            }

            if (currentSettings.commands.subscribe.type.includes(newType)) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Service type **${newType}** already exists.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (currentSettings.commands.subscribe.type.length >= 25) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Maximum limit of 25 service types reached. Please remove some types first.`))
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
                        type: [...currentSettings.commands.subscribe.type, newType]
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

            console.log(`${settings.emojie.success} Service type added: ${newType} by ${interaction.user.tag}`);

            const allTypes = updatedSettings.commands.subscribe.type;
            const container = new ContainerBuilder()
                .setAccentColor(0x23C55E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.type_add} Service Type Added`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**New Type** \u00b7 \`${newType}\`\n` +
                    `**Added By** \u00b7 <@${interaction.user.id}>\n` +
                    `**Total Types** \u00b7 ${allTypes.length}/25`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**All Available Types**\n${allTypes.map(t => `> \`${t}\``).join('\n')}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# ${settings.emojie.wrench} Service Types \u00b7 Changes take effect immediately`
                ));

            await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? "❌"} Error executing type_add command:`, error);
            await interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} An error occurred while adding service type.`))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
