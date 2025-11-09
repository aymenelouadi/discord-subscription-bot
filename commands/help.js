// Code Nexus => https://discord.gg/wBTyCap8
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

let settings;
try {
    const settingsPath = path.join(__dirname, '..', 'setting.json');
    const settingsFile = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(settingsFile);
} catch (error) {
    console.error('❌ Failed to load setting.json:', error.message);
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
    console.error('❌ Failed to load config.json:', error.message);
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
                content: '❌ This command is currently disabled.',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            const isOwner = config.OWNER.includes(interaction.user.id);
            const commandSearch = interaction.options.getString('command');
            
            if (commandSearch) {
                const commandConfig = Object.values(settings.commands).find(
                    cmd => cmd.name === commandSearch && cmd.enable
                );

                if (!commandConfig) {
                    return await interaction.editReply({
                        content: `❌ Command \`/${commandSearch}\` not found or is disabled.`,
                        ephemeral: true
                    });
                }

                const embed = createCommandEmbed(commandConfig, isOwner);
                return await interaction.editReply({
                    embeds: [embed],
                    ephemeral: false
                });
            }

            const publicCommands = [];
            const adminCommands = [];

            Object.entries(settings.commands).forEach(([commandName, commandConfig]) => {
                if (commandConfig.enable && commandName !== 'help') {
                    if (commandConfig.options === 'admin') {
                        adminCommands.push(commandConfig);
                    } else if (commandConfig.options === 'public') {
                        publicCommands.push(commandConfig);
                    }
                }
            });

            const allCommands = [...publicCommands, ...adminCommands];
            const itemsPerPage = 6;
            const totalPages = Math.ceil(allCommands.length / itemsPerPage);
            let currentPage = 1;

            const createPageEmbed = (page) => {
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const pageCommands = allCommands.slice(startIndex, endIndex);

                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('🛟 Available Commands')
                    .setDescription('Here are all the commands you can use:')
                    .setTimestamp();

                // Add commands to the page
                pageCommands.forEach(cmd => {
                    const permission = cmd.options === 'admin' ? '👮‍♂️ Admin Only' : '👥 Public';
                    const description = `${cmd.description}\n**Permission:** ${permission}`;

                    embed.addFields({
                        name: `/${cmd.name}`,
                        value: description,
                        inline: false
                    });
                });

                embed.setFooter({ 
                    text: `Page ${page} of ${totalPages} • ${allCommands.length} total commands • Use /help <command> for details` 
                });

                return embed;
            };

            const createButtons = (page) => {
                const row = new ActionRowBuilder();

                if (page > 1) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('help_prev')
                            .setLabel('⬅️')
                            .setStyle(ButtonStyle.Primary)
                    );
                }

                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_home')
                        .setLabel('🔄️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 1)
                );

                if (page < totalPages) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('help_next')
                            .setLabel('➡️')
                            .setStyle(ButtonStyle.Primary)
                    );
                }

                return row;
            };

            function createCommandEmbed(commandConfig, isUserOwner) {
                const permission = commandConfig.options === 'admin' ? '👮‍♂️ Admin Only' : '👥 Public';
                const color = commandConfig.options === 'admin' ? 0xFF0000 : 0x00FF00;

                const embed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(`Command: /${commandConfig.name}`)
                    .setDescription(commandConfig.description)
                    .addFields(
                        { name: 'Permission Level', value: permission, inline: true },
                        { name: 'Status', value: commandConfig.enable ? '✅ Enabled' : '❌ Disabled', inline: true }
                    )
                    .setTimestamp();

                if (commandConfig.type || commandConfig.plan) {
                    let optionsText = '';
                    
                    if (commandConfig.type) {
                        optionsText += `**Service Types:** ${commandConfig.type.join(', ')}\n`;
                    }
                    
                    if (commandConfig.plan) {
                        optionsText += `**Plans:** ${commandConfig.plan.join(', ')}`;
                    }

                    embed.addFields({
                        name: '📋 Available Options',
                        value: optionsText,
                        inline: false
                    });
                }

                if (commandConfig.options === 'admin' && !isUserOwner) {
                    embed.addFields({
                        name: '⚠️ Access Restricted',
                        value: 'This command requires administrator permissions.',
                        inline: false
                    });
                }

                embed.setFooter({ 
                    text: 'Use /help to see all available commands' 
                });

                return embed;
            }

            const message = await interaction.editReply({
                embeds: [createPageEmbed(currentPage)],
                components: totalPages > 1 ? [createButtons(currentPage)] : []
            });

            if (totalPages <= 1) return;

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (i) => {
                try {
                    if (i.customId === 'help_prev' && currentPage > 1) {
                        currentPage--;
                    } else if (i.customId === 'help_next' && currentPage < totalPages) {
                        currentPage++;
                    } else if (i.customId === 'help_home') {
                        currentPage = 1;
                    }

                    await i.update({
                        embeds: [createPageEmbed(currentPage)],
                        components: [createButtons(currentPage)]
                    });
                } catch (error) {
                    console.error('❌ Error handling interaction:', error);
                }
            });

            collector.on('end', async () => {
                try {
                    await message.edit({
                        components: []
                    });
                } catch (error) {
                    console.error('❌ Error ending collector:', error);
                }
            });

        } catch (error) {
            console.error('❌ Error executing help command:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while fetching command list.',
                ephemeral: false
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8