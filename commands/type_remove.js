// commands/type_remove.js
// Code Nexus => https://discord.gg/wBTyCap8

const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

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

const loadFreshSettings = () => {
    try {
        const settingsPath = path.join(__dirname, '..', 'setting.json');
        const settingsFile = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(settingsFile);
    } catch (error) {
        console.error(`${settings?.emojie?.error ?? "❌"} Failed to load setting.json:`, error.message);
        return { commands: {} };
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('type_remove')
        .setDescription('Remove a service type from subscribe command')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Service type to remove')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(50)),

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

            const settings = loadFreshSettings();
            const typeToRemove = interaction.options.getString('type').trim().toUpperCase();

            if (!settings.commands.subscribe) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Subscribe command not found in settings.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (!Array.isArray(settings.commands.subscribe.type) || settings.commands.subscribe.type.length === 0) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} No service types available to remove.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const foundType = settings.commands.subscribe.type.find(
                type => type.toLowerCase() === typeToRemove.toLowerCase()
            );

            if (!foundType) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${settings?.emojie?.error ?? "❌"} Service type \`${typeToRemove}\` not found.\n\n**Available types**\n${settings.commands.subscribe.type.map(t => `> \`${t}\``).join('\n')}`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (settings.commands.subscribe.type.length <= 1) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Cannot remove the last service type. At least one type must remain.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const confirmContainer = new ContainerBuilder()
                .setAccentColor(0xF0B232)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.type_remove} Confirm Removal`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Type to Remove** Â· \`${foundType}\`\n` +
                    `**Remaining Types** Â· ${settings.commands.subscribe.type.length - 1} types\n\n` +
                    `**Current Types**\n${settings.commands.subscribe.type.map(t => `> \`${t}\``).join('\n')}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${settings.emojie.warning} This action cannot be undone`));

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_remove')
                        .setLabel('Confirm Remove')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_remove')
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            const message = await interaction.editReply({
                components: [confirmContainer, row],
                flags: MessageFlags.IsComponentsV2
            });

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 30000
            });

            collector.on('collect', async (i) => {
                try {
                    if (i.customId === 'confirm_remove') {
                        const currentSettings = loadFreshSettings();

                        currentSettings.commands.subscribe.type = currentSettings.commands.subscribe.type.filter(
                            type => type !== foundType
                        );

                        try {
                            const settingsPath = require('path').join(__dirname, '..', 'setting.json');
                            require('fs').writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 4), 'utf8');
                            console.log(`${settings.emojie.success} Service type removed: ${foundType} by ${interaction.user.tag}`);
                        } catch (error) {
                            console.error(`${settings?.emojie?.error ?? "❌"} Failed to save settings:`, error);
                            await i.update({
                                components: [
                                    new ContainerBuilder()
                                        .setAccentColor(0xF23F43)
                                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Failed to save settings to file.`))
                                ],
                                flags: MessageFlags.IsComponentsV2
                            });
                            return;
                        }

                        const successContainer = new ContainerBuilder()
                            .setAccentColor(0x23C55E)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.type_remove} Service Type Removed`))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `**Removed Type** Â· \`${foundType}\`\n` +
                                `**Removed By** Â· <@${interaction.user.id}>\n` +
                                `**Remaining** Â· ${currentSettings.commands.subscribe.type.length}/25\n\n` +
                                `**Available Types**\n${currentSettings.commands.subscribe.type.length > 0 ? currentSettings.commands.subscribe.type.map(t => `> \`${t}\``).join('\n') : '> None'}`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${settings.emojie.wrench} Service Types Â· Changes take effect immediately`));

                        await i.update({
                            components: [successContainer],
                            flags: MessageFlags.IsComponentsV2
                        });

                    } else if (i.customId === 'cancel_remove') {
                        await i.update({
                            components: [
                                new ContainerBuilder()
                                    .setAccentColor(0x5865F2)
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Removal cancelled.`))
                            ],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }
                } catch (error) {
                    console.error(`${settings?.emojie?.error ?? "❌"} Error handling confirmation:`, error);
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    try {
                        await message.edit({
                            components: [
                                new ContainerBuilder()
                                    .setAccentColor(0xF0B232)
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings.emojie.clock} Removal request timed out.`))
                            ],
                            flags: MessageFlags.IsComponentsV2
                        });
                    } catch (error) {
                        console.error(`${settings?.emojie?.error ?? "❌"} Error updating timed out message:`, error);
                    }
                }
            });

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? "❌"} Error executing type_remove command:`, error);

            await interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} An error occurred while removing service type.`))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
