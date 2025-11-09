// commands/type_remove.js
// Code Nexus => https://discord.gg/wBTyCap8

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

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

const loadFreshSettings = () => {
    try {
        const settingsPath = path.join(__dirname, '..', 'setting.json');
        const settingsFile = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(settingsFile);
    } catch (error) {
        console.error('❌ Failed to load setting.json:', error.message);
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
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            const settings = loadFreshSettings();
            const typeToRemove = interaction.options.getString('type').trim().toUpperCase();
            
            if (!settings.commands.subscribe) {
                return await interaction.editReply({
                    content: '❌ Subscribe command not found in settings.',
                    ephemeral: true
                });
            }

            if (!Array.isArray(settings.commands.subscribe.type) || settings.commands.subscribe.type.length === 0) {
                return await interaction.editReply({
                    content: '❌ No service types available to remove.',
                    ephemeral: true
                });
            }

            console.log('Current types:', settings.commands.subscribe.type);
            console.log('Looking for type:', typeToRemove);

            const foundType = settings.commands.subscribe.type.find(
                type => type.toLowerCase() === typeToRemove.toLowerCase()
            );

            if (!foundType) {
                return await interaction.editReply({
                    content: `❌ Service type **${typeToRemove}** not found. Available types: ${settings.commands.subscribe.type.join(', ')}`,
                    ephemeral: true
                });
            }

            if (settings.commands.subscribe.type.length <= 1) {
                return await interaction.editReply({
                    content: '❌ Cannot remove the last service type. At least one type must remain.',
                    ephemeral: true
                });
            }

            const confirmEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('⚠️ Confirm Removal')
                .setDescription('Are you sure you want to remove this service type?')
                .addFields(
                    {
                        name: '📋 Type to Remove',
                        value: foundType,
                        inline: true
                    },
                    {
                        name: '📊 Remaining Types',
                        value: `${settings.commands.subscribe.type.length - 1} types`,
                        inline: true
                    },
                    {
                        name: '🔧 Current Types',
                        value: settings.commands.subscribe.type.join(', '),
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'This action cannot be undone' 
                });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_remove')
                        .setLabel('✅ Confirm Remove')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('cancel_remove')
                        .setLabel('❌ Cancel')
                        .setStyle(ButtonStyle.Secondary)
                );

            const message = await interaction.editReply({
                embeds: [confirmEmbed],
                components: [row],
                ephemeral: false
            });

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 30000 // 30 seconds
            });

            collector.on('collect', async (i) => {
                try {
                    if (i.customId === 'confirm_remove') {
                        const currentSettings = loadFreshSettings();
                        
                        currentSettings.commands.subscribe.type = currentSettings.commands.subscribe.type.filter(
                            type => type !== foundType
                        );

                        try {
                            const settingsPath = path.join(__dirname, '..', 'setting.json');
                            fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 4), 'utf8');
                            
                            console.log(`✅ Service type removed: ${foundType} by ${interaction.user.tag}`);
                        } catch (error) {
                            console.error('❌ Failed to save settings:', error);
                            await i.update({
                                content: '❌ Failed to save settings to file.',
                                components: [],
                                embeds: []
                            });
                            return;
                        }

                        const successEmbed = new EmbedBuilder()
                            .setColor(0x00FF00)
                            .setTitle('✅ Service Type Removed')
                            .setDescription('Successfully removed service type from subscribe command')
                            .addFields(
                                {
                                    name: '📋 Removed Type',
                                    value: foundType,
                                    inline: true
                                },
                                {
                                    name: '👮‍♂️ Removed By',
                                    value: `<@${interaction.user.id}>`,
                                    inline: true
                                },
                                {
                                    name: '📊 Remaining Types',
                                    value: `${currentSettings.commands.subscribe.type.length}/25`,
                                    inline: true
                                },
                                {
                                    name: '🔧 Available Types',
                                    value: currentSettings.commands.subscribe.type.join(', ') || 'None',
                                    inline: false
                                }
                            )
                            .setTimestamp();

                        await i.update({
                            embeds: [successEmbed],
                            components: []
                        });

                    } else if (i.customId === 'cancel_remove') {
                        await i.update({
                            content: '❌ Removal cancelled.',
                            components: [],
                            embeds: []
                        });
                    }
                } catch (error) {
                    console.error('❌ Error handling confirmation:', error);
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    try {
                        await message.edit({
                            content: '⏰ Removal request timed out.',
                            components: [],
                            embeds: []
                        });
                    } catch (error) {
                        console.error('❌ Error updating timed out message:', error);
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error executing type_remove command:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while removing service type.',
                ephemeral: false
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
