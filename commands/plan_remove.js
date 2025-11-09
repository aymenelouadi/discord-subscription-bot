// commands/plan_remove.js
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
        .setName('plan_remove')
        .setDescription('Remove a plan from subscribe command')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('plan')
                .setDescription('Plan to remove')
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
            const planToRemove = interaction.options.getString('plan').trim();
            
            if (!settings.commands.subscribe) {
                return await interaction.editReply({
                    content: '❌ Subscribe command not found in settings.',
                    ephemeral: true
                });
            }

            if (!Array.isArray(settings.commands.subscribe.plan) || settings.commands.subscribe.plan.length === 0) {
                return await interaction.editReply({
                    content: '❌ No plans available to remove.',
                    ephemeral: true
                });
            }

            console.log('Current plans:', settings.commands.subscribe.plan);
            console.log('Looking for plan:', planToRemove);

            const foundPlan = settings.commands.subscribe.plan.find(
                plan => plan.toLowerCase() === planToRemove.toLowerCase()
            );

            if (!foundPlan) {
                return await interaction.editReply({
                    content: `❌ Plan **${planToRemove}** not found. Available plans: ${settings.commands.subscribe.plan.join(', ')}`,
                    ephemeral: true
                });
            }

            if (settings.commands.subscribe.plan.length <= 1) {
                return await interaction.editReply({
                    content: '❌ Cannot remove the last plan. At least one plan must remain.',
                    ephemeral: true
                });
            }

            const confirmEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('⚠️ Confirm Removal')
                .setDescription('Are you sure you want to remove this plan?')
                .addFields(
                    {
                        name: '📊 Plan to Remove',
                        value: foundPlan,
                        inline: true
                    },
                    {
                        name: '📈 Remaining Plans',
                        value: `${settings.commands.subscribe.plan.length - 1} plans`,
                        inline: true
                    },
                    {
                        name: '🔧 Current Plans',
                        value: settings.commands.subscribe.plan.join(', '),
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
                        
                        currentSettings.commands.subscribe.plan = currentSettings.commands.subscribe.plan.filter(
                            plan => plan !== foundPlan
                        );

                        try {
                            const settingsPath = path.join(__dirname, '..', 'setting.json');
                            fs.writeFileSync(settingsPath, JSON.stringify(currentSettings, null, 4), 'utf8');
                            
                            console.log(`✅ Plan removed: ${foundPlan} by ${interaction.user.tag}`);
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
                            .setTitle('✅ Plan Removed')
                            .setDescription('Successfully removed plan from subscribe command')
                            .addFields(
                                {
                                    name: '📊 Removed Plan',
                                    value: foundPlan,
                                    inline: true
                                },
                                {
                                    name: '👮‍♂️ Removed By',
                                    value: `<@${interaction.user.id}>`,
                                    inline: true
                                },
                                {
                                    name: '📈 Remaining Plans',
                                    value: `${currentSettings.commands.subscribe.plan.length}/25`,
                                    inline: true
                                },
                                {
                                    name: '🔧 Available Plans',
                                    value: currentSettings.commands.subscribe.plan.join(', ') || 'None',
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
            console.error('❌ Error executing plan_remove command:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while removing plan.',
                ephemeral: true
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
