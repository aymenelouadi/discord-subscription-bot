// Code Nexus => https://discord.gg/wBTyCap8

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
            info: {
                enable: true,
                name: "info",
                description: "View subscription info"
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
        .setName(settings.commands.info?.name)
        .setDescription(settings.commands.info?.description)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to view subscriptions (admins only)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Filter subscriptions by status')
                .addChoices(
                    { name: '🟢 Active', value: 'active' },
                    { name: '🔴 Expired', value: 'expired' },
                    { name: '⚫ Cancelled', value: 'cancelled' },
                    { name: '🟡 Paused', value: 'paused' }
                )
                .setRequired(false))
        .addStringOption(option =>
            option.setName('search')
                .setDescription('Search by email or custom ID')
                .setRequired(false)),

    async execute(client, interaction) {
        if (!settings.commands.info?.enable) {
            return await interaction.reply({
                content: '❌ This command is currently disabled.',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });
            const targetUserOption = interaction.options.getUser('user');
            const statusFilter = interaction.options.getString('status');
            const searchQuery = interaction.options.getString('search');
            const isOwner = config.OWNER.includes(interaction.user.id);
            
            let targetUserId;
            let targetUser;

            if (targetUserOption) {
                if (!isOwner) {
                    return await interaction.editReply({
                        content: '❌ You do not have permission to view other users subscriptions.',
                        ephemeral: true
                    });
                }
                targetUserId = targetUserOption.id;
                targetUser = targetUserOption;
            } else {
                targetUserId = interaction.user.id;
                targetUser = interaction.user;
            }

            let query = { userId: targetUserId };

            if (statusFilter) {
                query.status = statusFilter;
            }

            if (searchQuery) {
                if (!isOwner) {
                    return await interaction.editReply({
                        content: '❌ Search functionality is available for administrators only.',
                        ephemeral: true
                    });
                }

                query.$or = [
                    { customId: { $regex: searchQuery, $options: 'i' } },
                    { email: { $regex: searchQuery, $options: 'i' } }
                ];
            }

            const subscriptions = await client.Subscription.find(query).sort({ startDate: -1 });

            if (subscriptions.length === 0) {
                let noResultsMessage = targetUserOption ? 
                    `📭 No subscriptions found for user <@${targetUserId}>` :
                    '📭 You have no active subscriptions.';

                if (statusFilter) {
                    noResultsMessage += `\n📋 Filter: ${statusFilter}`;
                }
                if (searchQuery) {
                    noResultsMessage += `\n🔍 Search: ${searchQuery}`;
                }

                return await interaction.editReply({
                    content: noResultsMessage,
                    ephemeral: false
                });
            }

            const itemsPerPage = 5;
            const totalPages = Math.ceil(subscriptions.length / itemsPerPage);
            let currentPage = 1;

            const statusColor = {
                active: 0x00FF00,
                expired: 0xFF0000,
                cancelled: 0x808080,
                paused: 0xFFFF00
            };

            const statusEmoji = {
                active: '🟢',
                expired: '🔴',
                cancelled: '⚫',
                paused: '🟡'
            };

            const statusText = {
                active: 'Active',
                expired: 'Expired',
                cancelled: 'Cancelled',
                paused: 'Paused'
            };

            const createEmbed = (page) => {
                const startIndex = (page - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const pageSubscriptions = subscriptions.slice(startIndex, endIndex);

                const mainColor = statusColor[pageSubscriptions[0]?.status] || 0x0099FF;

                const embed = new EmbedBuilder()
                    .setColor(mainColor)
                    .setTimestamp();

                let title = '📊 Subscription Information';
                let description = '';

                if (targetUserOption) {
                    description += `Subscriptions for <@${targetUserId}>\n`;
                } else {
                    description += 'Your current subscriptions\n';
                }

                if (statusFilter) {
                    description += `📋 Filter: **${statusText[statusFilter] || statusFilter}**\n`;
                }

                if (searchQuery) {
                    description += `🔍 Search: **${searchQuery}**\n`;
                }

                description += `📊 Total: **${subscriptions.length}** subscriptions`;

                embed.setTitle(title);
                embed.setDescription(description);

                pageSubscriptions.forEach((subscription, index) => {
                    const now = new Date();
                    const endDate = new Date(subscription.endDate);
                    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                    const daysText = daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired';

                    let fieldValue = `**Plan:** ${subscription.planName}\n`;
                    fieldValue += `**Type:** ${subscription.serviceType}\n`;
                    fieldValue += `**Status:** ${statusEmoji[subscription.status]} ${statusText[subscription.status] || subscription.status}\n`;
                    fieldValue += `**Time Remaining:** ${daysText}\n`;
                    fieldValue += `**End Date:** <t:${Math.floor(endDate.getTime() / 1000)}:F>\n`;
                    
                    if (isOwner) {
                        fieldValue += `\n**🆔 Custom ID:** ${subscription.customId}\n`;
                        fieldValue += `**📧 Email:** ${subscription.email}\n`;
                        fieldValue += `**📅 Start Date:** <t:${Math.floor(subscription.startDate.getTime() / 1000)}:F>\n`;
                        
                        if (subscription.note) {
                            fieldValue += `**📝 Notes:** ${subscription.note}\n`;
                        }
                    }

                    embed.addFields({
                        name: `${statusEmoji[subscription.status]} ${subscription.planName} - ${subscription.serviceType}`,
                        value: fieldValue,
                        inline: false
                    });
                });

                if (isOwner && page === 1 && subscriptions.length > 0) {
                    const activeSubs = subscriptions.filter(sub => sub.status === 'active').length;
                    const expiredSubs = subscriptions.filter(sub => sub.status === 'expired').length;
                    const cancelledSubs = subscriptions.filter(sub => sub.status === 'cancelled').length;
                    const pausedSubs = subscriptions.filter(sub => sub.status === 'paused').length;
                    
                    embed.addFields({
                        name: '📈 Statistics',
                        value: `🟢 Active: ${activeSubs}\n🔴 Expired: ${expiredSubs}\n⚫ Cancelled: ${cancelledSubs}\n🟡 Paused: ${pausedSubs}\n📊 Total: ${subscriptions.length}`,
                        inline: true
                    });
                }

                if (totalPages > 1) {
                    embed.setFooter({ 
                        text: `Page ${page} of ${totalPages} • ${subscriptions.length} total subscriptions` 
                    });
                } else {
                    embed.setFooter({ 
                        text: `${subscriptions.length} subscription(s) found` 
                    });
                }

                return embed;
            };

            const createButtons = (page) => {
                const row = new ActionRowBuilder();

                if (page > 1) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('info_prev')
                            .setLabel('⬅️ Previous')
                            .setStyle(ButtonStyle.Primary)
                    );
                }

                if (page < totalPages) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId('info_next')
                            .setLabel('Next ➡️')
                            .setStyle(ButtonStyle.Primary)
                    );
                }

                return row;
            };

            const message = await interaction.editReply({
                embeds: [createEmbed(currentPage)],
                components: totalPages > 1 ? [createButtons(currentPage)] : []
            });

            if (totalPages <= 1) return;

            // إنشاء مجمع تفاعلات
            const collector = message.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 300000 // 5 دقائق
            });

            collector.on('collect', async (i) => {
                try {
                    if (i.customId === 'info_prev' && currentPage > 1) {
                        currentPage--;
                    } else if (i.customId === 'info_next' && currentPage < totalPages) {
                        currentPage++;
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
            console.error('❌ Error executing info command:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while fetching subscription information.',
                ephemeral: false
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
