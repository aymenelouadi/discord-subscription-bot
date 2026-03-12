// Code Nexus => https://discord.gg/wBTyCap8
const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
            help: {
                enable: true,
                name: "help",
                description: "View all available commands"
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
        .setName(settings.commands.help?.name || 'help')
        .setDescription(settings.commands.help?.description)
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Search for a specific command')
                .setRequired(false)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const commands = Object.entries(settings.commands)
            .filter(([name, config]) => config.enable)
            .map(([name, config]) => ({ name: `/${config.name}`, value: config.name }))
            .filter(command => 
                command.name.toLowerCase().includes(focusedValue) || 
                command.value.toLowerCase().includes(focusedValue)
            )
            .slice(0, 25);

        await interaction.respond(commands);
    },

    async execute(client, interaction) {
        if (!settings.commands.help?.enable) {
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
            await interaction.deferReply({ ephemeral: false });

            const isOwner = config.OWNER.includes(interaction.user.id);
            const commandSearch = interaction.options.getString('command');

            const permLabel = (cmd) => cmd.options === 'admin' ? `${settings.emojie.key} Admin` : `${settings.emojie.help} Public`;

            if (commandSearch) {
                const commandConfig = Object.values(settings.commands).find(
                    cmd => cmd.name === commandSearch && cmd.enable
                );

                if (!commandConfig) {
                    return await interaction.editReply({
                        components: [
                            new ContainerBuilder()
                                .setAccentColor(0xF23F43)
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Command \`/${commandSearch}\` not found or is disabled.`))
                        ],
                        flags: MessageFlags.IsComponentsV2
                    });
                }

                let detail =
                    `**Command** Â· \`/${commandConfig.name}\`\n` +
                    `**Description** Â· ${commandConfig.description}\n` +
                    `**Permission** Â· ${permLabel(commandConfig)}\n` +
                    `**Status** Â· ${commandConfig.enable ? '${settings.emojie.success} Enabled' : '${settings?.emojie?.error ?? "❌"} Disabled'}`;

                if (commandConfig.type?.length) detail += `\n\n**Types**\n${commandConfig.type.map(t => `> \`${t}\``).join('\n')}`;
                if (commandConfig.plan?.length) detail += `\n\n**Plans**\n${commandConfig.plan.map(p => `> \`${p}\``).join('\n')}`;

                if (commandConfig.options === 'admin' && !isOwner) {
                    detail += `\n\n> ${settings.emojie.warning} This command requires administrator permissions.`;
                }

                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(commandConfig.options === 'admin' ? 0xF0B232 : 0x5865F2)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${(settings.emojie[commandSearch] || settings.emojie.search)} Command: /${commandConfig.name}`))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(detail))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# Use /help to see all available commands'))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const publicCommands = [];
            const adminCommands = [];

            Object.entries(settings.commands).forEach(([commandName, cmd]) => {
                if (cmd.enable && commandName !== 'help') {
                    if (cmd.options === 'admin') adminCommands.push(cmd);
                    else if (cmd.options === 'public') publicCommands.push(cmd);
                }
            });

            const allCommands = [...publicCommands, ...adminCommands];
            const itemsPerPage = 6;
            const totalPages = Math.ceil(allCommands.length / itemsPerPage);
            let currentPage = 1;

            const createPage = (page) => {
                const start = (page - 1) * itemsPerPage;
                const pageCmds = allCommands.slice(start, start + itemsPerPage);

                const lines = pageCmds.map(cmd => {
                    const perm = permLabel(cmd);
                    return `**\`/${cmd.name}\`**  ${perm}\n> ${cmd.description}`;
                }).join('\n\n');

                return new ContainerBuilder()
                    .setAccentColor(0x5865F2)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.help} Available Commands`))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `-# Page ${page}/${totalPages} Â· ${allCommands.length} commands total Â· Use /help <command> for details`
                    ));
            };

            const createButtons = (page) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_prev')
                        .setEmoji(settings.emojie.arrow_left)
                        .setLabel('Prev')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page <= 1),
                    new ButtonBuilder()
                        .setCustomId('help_home')
                        .setEmoji(settings.emojie.home)
                        .setLabel('Home')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 1),
                    new ButtonBuilder()
                        .setCustomId('help_next')
                        .setEmoji(settings.emojie.arrow_right)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages)
                );
            };

            const message = await interaction.editReply({
                components: totalPages > 1
                    ? [createPage(currentPage), createButtons(currentPage)]
                    : [createPage(currentPage)],
                flags: MessageFlags.IsComponentsV2
            });

            if (totalPages <= 1) return;

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 300000
            });

            collector.on('collect', async (i) => {
                try {
                    if (i.customId === 'help_prev' && currentPage > 1) currentPage--;
                    else if (i.customId === 'help_next' && currentPage < totalPages) currentPage++;
                    else if (i.customId === 'help_home') currentPage = 1;

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
            console.error(`${settings?.emojie?.error ?? "❌"} Error executing help command:`, error);

            await interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} An error occurred while fetching command list.`))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
