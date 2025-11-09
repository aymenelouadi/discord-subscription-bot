// Code Nexus => https://discord.gg/wBTyCap8
const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
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
        console.error('❌ Failed to load config.json:', error.message);
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
                content: '❌ This command is currently disabled.',
                ephemeral: true
            });
        }

        if (!config.OWNER.includes(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            const subscriptions = await client.Subscription.find().sort({ startDate: -1 });
            
            if (subscriptions.length === 0) {
                return await interaction.editReply({
                    content: '📭 No subscriptions registered at the moment.',
                    ephemeral: false
                });
            }

            const itemsPerPage = 10;
            const totalPages = Math.ceil(subscriptions.length / itemsPerPage);
            let currentPage = 1;

            const createEmbed = (page) => {
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const pageSubscriptions = subscriptions.slice(startIndex, endIndex);

                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('📋 Subscriptions List')
                    .setDescription(`Total subscriptions: **${subscriptions.length}**`)
                    .setFooter({ 
                        text: `Page ${page} of ${totalPages} • ${new Date().toLocaleDateString('en-US')}` 
                    })
                    .setTimestamp();

                pageSubscriptions.forEach((sub, index) => {
                    const statusColors = {
                        'active': '🟢',
                        'expired': '🔴', 
                        'cancelled': '⚫',
                        'paused': '🟡'
                    };

                    const statusText = {
                        'active': 'Active',
                        'expired': 'Expired',
                        'cancelled': 'Cancelled',
                        'paused': 'Paused'
                    };

                    const statusEmoji = statusColors[sub.status] || '⚪';
                    const statusName = statusText[sub.status] || sub.status;
                    const now = new Date();
                    const daysRemaining = Math.ceil((sub.endDate - now) / (1000 * 60 * 60 * 24));
                    const daysText = daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired';

                    embed.addFields({
                        name: `${statusEmoji} ${sub.customId} - ${sub.planName}`,
                        value: `👤 <@${sub.userId}>\n📧 ${sub.email}\n📋 ${sub.serviceType}\n⏰ ${daysText}\n📅 Ends <t:${Math.floor(sub.endDate.getTime() / 1000)}:R>\n🔰 ${statusName}`,
                        inline: true
                    });

                    if ((index + 1) % 2 === 0 && index < pageSubscriptions.length - 1) {
                        embed.addFields({ name: '\u200b', value: '\u200b', inline: false });
                    }
                });

                return embed;
            };

            const createButtons = (page) => {
                const row = new ActionRowBuilder();

                if (page > 1) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('subscriptions_prev')
                            .setLabel('⬅️')
                            .setStyle(ButtonStyle.Primary)
                    );
                }

                if (page < totalPages) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('subscriptions_next')
                            .setLabel('➡️')
                            .setStyle(ButtonStyle.Primary)
                    );
                }

                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('subscriptions_refresh')
                        .setLabel('🔄')
                        .setStyle(ButtonStyle.Success)
                );

                return row;
            };

            const message = await interaction.editReply({
                embeds: [createEmbed(currentPage)],
                components: totalPages > 1 ? [createButtons(currentPage)] : []
            });

            if (totalPages <= 1) return;

            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async (i) => {
                try {
                    const currentConfig = loadConfig();
                    
                    if (!currentConfig.OWNER.includes(i.user.id)) {
                        return await i.reply({
                            content: '❌ You no longer have permission to use this command.',
                            ephemeral: true
                        });
                    }

                    if (i.customId === 'subscriptions_prev' && currentPage > 1) {
                        currentPage--;
                    } else if (i.customId === 'subscriptions_next' && currentPage < totalPages) {
                        currentPage++;
                    } else if (i.customId === 'subscriptions_refresh') {
                        const updatedSubscriptions = await client.Subscription.find().sort({ startDate: -1 });
                        subscriptions.length = 0;
                        subscriptions.push(...updatedSubscriptions);
                        
                        totalPages = Math.ceil(subscriptions.length / itemsPerPage);
                        currentPage = Math.min(currentPage, totalPages);
                    }

                    await i.update({
                        embeds: [createEmbed(currentPage)],
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
            console.error('❌ Error executing subscriptions command:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while fetching subscriptions list.',
                ephemeral: true
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
