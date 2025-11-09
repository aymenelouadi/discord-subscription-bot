// Code Nexus => https://discord.gg/wBTyCap8
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
            unsubscribe: {
                enable: true,
                name: "unsubscribe",
                description: "Cancel subscription"
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
        OWNER: [],
        LOG_SUB: []
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(settings.commands.unsubscribe.name || 'unsubscribe')
        .setDescription(settings.commands.unsubscribe.description || 'Cancel subscription')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('custom_id')
                .setDescription('Custom ID of the subscription to cancel')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(50)),

    async execute(client, interaction) {
        if (!settings.commands.unsubscribe.enable) {
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

            const customId = interaction.options.getString('custom_id').trim();
            const subscription = await client.Subscription.findOne({ customId });
            
            if (!subscription) {
                return await interaction.editReply({
                    content: `❌ No subscription found with custom ID: **${customId}**`,
                    ephemeral: true
                });
            }

            if (subscription.status === 'cancelled') {
                return await interaction.editReply({
                    content: `ℹ️ Subscription **${customId}** is already cancelled.`,
                    ephemeral: true
                });
            }

            if (subscription.status === 'expired') {
                return await interaction.editReply({
                    content: `ℹ️ Subscription **${customId}** is already expired.`,
                    ephemeral: true
                });
            }

            subscription.status = 'cancelled';
            subscription.note = subscription.note ? 
                `${subscription.note} | Cancelled by ${interaction.user.tag} on ${new Date().toLocaleDateString()}` :
                `Cancelled by ${interaction.user.tag} on ${new Date().toLocaleDateString()}`;
            
            await subscription.save();

            let dmSuccess = false;
            try {
                const targetUser = await client.users.fetch(subscription.userId);
                const userEmbed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('🚫 Your Subscription Has Been Cancelled')
                    .setFields([
                        { name: '🆔 Custom ID', value: subscription.customId, inline: true },
                        { name: '📋 Service Type', value: subscription.serviceType, inline: true },
                        { name: '📊 Plan', value: subscription.planName, inline: true },
                        { name: '📧 Email', value: subscription.email, inline: true },
                        { name: '📅 Start Date', value: `<t:${Math.floor(subscription.startDate.getTime() / 1000)}:F>`, inline: true },
                        { name: '📅 End Date', value: `<t:${Math.floor(subscription.endDate.getTime() / 1000)}:F>`, inline: true },
                        { name: '👮‍♂️ Admin', value: `<@${interaction.user.id}>`, inline: true }
                    ])
                    .setTimestamp()
                    .setFooter({ text: 'We hope to see you again! 💙' });

                await targetUser.send({ embeds: [userEmbed] });
                dmSuccess = true;
                console.log(`✅ Sent cancellation notification to user ${subscription.userId}`);
            } catch (dmError) {
                console.error(`❌ Failed to send message to user ${subscription.userId}:`, dmError.message);
                dmSuccess = false;
            }

            await interaction.editReply({
                content: `✅ Successfully cancelled subscription **${customId}**\n👤 User: <@${subscription.userId}>\n📋 Type: ${subscription.serviceType}\n📊 Plan: ${subscription.planName}\n${dmSuccess ? '✅ Notification sent to user' : '⚠️ Notification not sent to user (DMs closed)'}`,
                ephemeral: false
            });

            if (config.LOG_SUB && config.LOG_SUB.length > 0) {
                const logChannelId = config.LOG_SUB[0];
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle('🚫 Subscription Cancelled')
                        .setFields([
                            { name: '🆔 Custom ID', value: subscription.customId, inline: true },
                            { name: '👤 User', value: `<@${subscription.userId}> (${subscription.userId})`, inline: true },
                            { name: '📋 Type', value: subscription.serviceType, inline: true },
                            { name: '📊 Plan', value: subscription.planName, inline: true },
                            { name: '📧 Email', value: subscription.email, inline: true },
                            { name: '📅 Start Date', value: `<t:${Math.floor(subscription.startDate.getTime() / 1000)}:F>`, inline: true },
                            { name: '📅 End Date', value: `<t:${Math.floor(subscription.endDate.getTime() / 1000)}:F>`, inline: true },
                            { name: '👮‍♂️ Admin', value: `<@${interaction.user.id}>`, inline: true },
                            { name: '📨 Delivery Status', value: dmSuccess ? '✅ Sent' : '❌ Failed', inline: true }
                        ])
                        .setTimestamp();

                    if (subscription.note) {
                        logEmbed.addFields({ name: '📝 Notes', value: subscription.note, inline: false });
                    }

                    await logChannel.send({ embeds: [logEmbed] });
                }
            }

            if (!dmSuccess) {
                for (const ownerId of config.OWNER) {
                    try {
                        const owner = await client.users.fetch(ownerId);
                        await owner.send({
                            content: `⚠️ **Warning**: Failed to send cancellation notification to user <@${subscription.userId}>\n\n**Cancelled Subscription Details:**\n- Custom ID: ${subscription.customId}\n- Type: ${subscription.serviceType}\n- Plan: ${subscription.planName}\n- Email: ${subscription.email}\n\nPlease contact the user manually.`
                        });
                    } catch (ownerError) {
                        console.error(`❌ Failed to send warning to owner ${ownerId}:`, ownerError.message);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Error executing unsubscribe command:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while processing the cancellation request.',
                ephemeral: false
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
