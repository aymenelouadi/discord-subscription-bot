// Code Nexus => https://discord.gg/wBTyCap8
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
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
        commands: {}
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
        .setName('enable')
        .setDescription('Enable or disable commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Select command to modify')
                .setRequired(true)
                .addChoices(
                    ...Object.entries(settings.commands || {}).map(([key, cmd]) => ({
                        name: `/${cmd.name} - ${cmd.enable ? '${settings.emojie.success} Enabled' : '${settings?.emojie?.error ?? "❌"} Disabled'}`,
                        value: cmd.name
                    }))
                ))
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Enable or disable the command')
                .setRequired(true)
                .addChoices(
                    { name: `${settings.emojie.success} Enable`, value: 'true' },
                    { name: `${settings?.emojie?.error ?? "❌"} Disable`, value: 'false' }
                )),

    async execute(client, interaction) {
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

            const commandName = interaction.options.getString('command');
            const status = interaction.options.getString('status') === 'true';

            const commandKey = Object.keys(settings.commands).find(
                key => settings.commands[key].name === commandName
            );

            if (!commandKey) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Command \`/${commandName}\` not found in settings.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const currentStatus = settings.commands[commandKey].enable;

            if (currentStatus === status) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF0B232)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${settings.emojie.info} Command \`/${commandName}\` is already ${status ? 'enabled' : 'disabled'}.`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            settings.commands[commandKey].enable = status;

            try {
                const settingsPath = path.join(__dirname, '..', 'setting.json');
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf8');
                console.log(`${settings.emojie.success} Command ${commandName} ${status ? 'enabled' : 'disabled'} by ${interaction.user.tag}`);
            } catch (error) {
                console.error(`${settings?.emojie?.error ?? "❌"} Failed to save settings:`, error);
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Failed to save settings to file.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const container = new ContainerBuilder()
                .setAccentColor(status ? 0x23C55E : 0xF23F43)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    status ? `## ${settings.emojie.enable} Command Enabled` : `## ${settings.emojie.enable} Command Disabled`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Command** Â· \`/${commandName}\`\n` +
                    `**Description** Â· ${settings.commands[commandKey].description}\n` +
                    `**Permission** Â· ${settings.commands[commandKey].options === 'admin' ? `${settings.emojie.key} Admin Only` : `${settings.emojie.help} Public`}\n` +
                    `**Before** Â· ${currentStatus ? `${settings.emojie.success} Enabled` : `${settings?.emojie?.error ?? "❌"} Disabled`}  **After** Â· ${status ? `${settings.emojie.success} Enabled` : `${settings?.emojie?.error ?? "❌"} Disabled`}\n` +
                    `**Modified By** Â· <@${interaction.user.id}>`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# ${settings.emojie.wrench} Command Status Manager Â· Changes take effect immediately`
                ));

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? "❌"} Error executing enable command:`, error);

            await interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} An error occurred while modifying command settings.`))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8