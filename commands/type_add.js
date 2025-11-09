// commands/type_add.js
// Code Nexus => https://discord.gg/wBTyCap8

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const loadSettings = () => {
    let settings;
    try {
        const settingsPath = path.join(__dirname, '..', 'setting.json');
        const settingsFile = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(settingsFile);
    } catch (error) {
        console.error('❌ Failed to load setting.json:', error.message);
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
        console.error('❌ Failed to load config.json:', error.message);
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
        console.error('❌ Failed to save settings:', error);
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
        const config = loadConfig();

        if (!config.OWNER.includes(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            const newType = interaction.options.getString('type').trim().toUpperCase();
            const currentSettings = loadSettings();

            if (!currentSettings.commands.subscribe) {
                return await interaction.editReply({
                    content: '❌ Subscribe command not found in settings.',
                    ephemeral: true
                });
            }

            if (!Array.isArray(currentSettings.commands.subscribe.type)) {
                currentSettings.commands.subscribe.type = [];
            }

            if (currentSettings.commands.subscribe.type.includes(newType)) {
                return await interaction.editReply({
                    content: `❌ Service type **${newType}** already exists.`,
                    ephemeral: true
                });
            }

            if (currentSettings.commands.subscribe.type.length >= 25) {
                return await interaction.editReply({
                    content: '❌ Maximum limit of 25 service types reached. Please remove some types first.',
                    ephemeral: true
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
                    content: '❌ Failed to save settings to file.',
                    ephemeral: true
                });
            }

            console.log(`✅ Service type added: ${newType} by ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Service Type Added')
                .setDescription('Successfully added new service type to subscribe command')
                .addFields(
                    {
                        name: '📋 New Type',
                        value: newType,
                        inline: true
                    },
                    {
                        name: '👮‍♂️ Added By',
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: '📊 Total Types',
                        value: `${updatedSettings.commands.subscribe.type.length}/25`,
                        inline: true
                    },
                    {
                        name: '🔧 Available Types',
                        value: updatedSettings.commands.subscribe.type.join(', ') || 'None',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Service Types Management • Changes take effect immediately' 
                });

            await interaction.editReply({
                embeds: [embed],
                ephemeral: false
            });

        } catch (error) {
            console.error('❌ Error executing type_add command:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while adding service type.',
                ephemeral: true
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
