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
            commands: {
                subscribe: {
                    enable: true,
                    name: "subscribe",
                    description: "Subscribe to monthly role",
                    type: [],
                    plan: []
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
            OWNER: [],
            LOG_SUB: []
        };
    }
    return config;
};

const createCommandData = () => {
    const settings = loadSettings();
    
    return new SlashCommandBuilder()
        .setName(settings.commands.subscribe.name)
        .setDescription(settings.commands.subscribe.description)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to subscribe')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('custom_id')
                .setDescription('Custom subscription ID (must be unique)')
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(50))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Service type')
                .setRequired(true)
                .addChoices(
                    ...(settings.commands.subscribe.type || [])
                        .slice(0, 25) // Maximum 25 choices
                        .map(type => ({ name: type, value: type }))
                ))
        .addStringOption(option =>
            option.setName('plan')
                .setDescription('Subscription plan')
                .setRequired(true)
                .addChoices(
                    ...(settings.commands.subscribe.plan || [])
                        .slice(0, 25) // Maximum 25 choices
                        .map(plan => ({ name: plan, value: plan }))
                ))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Subscription duration in days')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(365))
        .addStringOption(option =>
            option.setName('email')
                .setDescription('Email address')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Password')
                .setRequired(true)
                .setMinLength(2))
        .addStringOption(option =>
            option.setName('note')
                .setDescription('Additional notes')
                .setRequired(false));
};

module.exports = {
    data: createCommandData(),

    async execute(client, interaction) {
        const settings = loadSettings();
        const config = loadConfig();

        if (!settings.commands.subscribe.enable) {
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

            const targetUser = interaction.options.getUser('user');
            const customId = interaction.options.getString('custom_id').trim();
            const serviceType = interaction.options.getString('type');
            const planName = interaction.options.getString('plan');
            const duration = interaction.options.getInteger('duration');
            const email = interaction.options.getString('email').toLowerCase().trim();
            const password = interaction.options.getString('password');
            const note = interaction.options.getString('note') || '';

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return await interaction.editReply({
                    content: '❌ Please enter a valid email address.',
                    ephemeral: true
                });
            }

            const existingSubscriptionByEmail = await client.Subscription.findOne({ email });
            if (existingSubscriptionByEmail) {
                return await interaction.editReply({
                    content: `❌ This email is already registered for user <@${existingSubscriptionByEmail.userId}>`,
                    ephemeral: true
                });
            }

            const existingSubscriptionById = await client.Subscription.findOne({ customId });
            if (existingSubscriptionById) {
                return await interaction.editReply({
                    content: `❌ This custom ID (${customId}) is already registered for user <@${existingSubscriptionById.userId}>`,
                    ephemeral: true
                });
            }

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + duration);

            const newSubscription = new client.Subscription({
                userId: targetUser.id,
                customId: customId,
                email: email,
                password: password,
                planName: planName,
                serviceType: serviceType,
                startDate: startDate,
                endDate: endDate,
                status: 'active',
                lastNotified: null,
                note: note
            });

            await newSubscription.save();

            let dmSuccess = false;
            try {
                const userEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle('🎉 Your Subscription Has Been Activated')
                    .setFields([
                        { name: '🆔 Custom ID', value: customId, inline: true },
                        { name: '📋 Service Type', value: serviceType, inline: true },
                        { name: '📊 Plan', value: planName, inline: true },
                        { name: '⏰ Duration', value: `${duration} days`, inline: true },
                        { name: '📧 Email', value: email, inline: true },
                        { name: '🔑 Password', value: password, inline: true },
                        { name: '📅 Start Date', value: `<t:${Math.floor(startDate.getTime() / 1000)}:F>`, inline: true },
                        { name: '📅 End Date', value: `<t:${Math.floor(endDate.getTime() / 1000)}:F>`, inline: true }
                    ])
                    .setTimestamp()
                    .setFooter({ text: 'Thank you for your trust! 🚀' });

                await targetUser.send({ embeds: [userEmbed] });
                dmSuccess = true;
                console.log(`✅ Sent subscription details to user ${targetUser.id}`);
            } catch (dmError) {
                console.error(`❌ Failed to send message to user ${targetUser.id}:`, dmError.message);
                dmSuccess = false;
            }

            await interaction.editReply({
                content: `✅ Created **${planName}** subscription for <@${targetUser.id}>\n🆔 Custom ID: ${customId}\n📋 Type: ${serviceType}\n📧 Email: ${email}\n⏰ Duration: ${duration} days\n📅 Ends at: <t:${Math.floor(endDate.getTime() / 1000)}:F>\n${dmSuccess ? '✅ Data sent to user' : '⚠️ Data not sent to user (DMs closed)'}`,
                ephemeral: false
            });

            if (config.LOG_SUB && config.LOG_SUB.length > 0) {
                const logChannelId = config.LOG_SUB[0];
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
                
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(dmSuccess ? 0x00ff00 : 0xffa500)
                        .setTitle(dmSuccess ? '📝 New Subscription' : '⚠️ New Subscription - Data Not Sent')
                        .setFields([
                            { name: '🆔 Custom ID', value: customId, inline: true },
                            { name: '👤 User', value: `<@${targetUser.id}> (${targetUser.id})`, inline: true },
                            { name: '📋 Type', value: serviceType, inline: true },
                            { name: '📊 Plan', value: planName, inline: true },
                            { name: '📧 Email', value: email, inline: true },
                            { name: '⏰ Duration', value: `${duration} days`, inline: true },
                            { name: '📅 Start Date', value: `<t:${Math.floor(startDate.getTime() / 1000)}:F>`, inline: true },
                            { name: '📅 End Date', value: `<t:${Math.floor(endDate.getTime() / 1000)}:F>`, inline: true },
                            { name: '👮‍♂️ Admin', value: `<@${interaction.user.id}>`, inline: true },
                            { name: '📨 Delivery Status', value: dmSuccess ? '✅ Sent' : '❌ Failed', inline: true }
                        ])
                        .setTimestamp();

                    if (note) {
                        logEmbed.addFields({ name: '📝 Notes', value: note, inline: false });
                    }

                    await logChannel.send({ embeds: [logEmbed] });
                }
            }

            if (!dmSuccess) {
                for (const ownerId of config.OWNER) {
                    try {
                        const owner = await client.users.fetch(ownerId);
                        await owner.send({
                            content: `⚠️ **Warning**: Failed to send subscription data to user <@${targetUser.id}>\n\n**Subscription Details:**\n- Custom ID: ${customId}\n- Type: ${serviceType}\n- Plan: ${planName}\n- Email: ${email}\n- Duration: ${duration} days\n\nPlease contact the user manually.`
                        });
                    } catch (ownerError) {
                        console.error(`❌ Failed to send warning to owner ${ownerId}:`, ownerError.message);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Error executing subscribe command:', error);
            
            let errorMessage = '❌ An error occurred while processing the subscription request.';
            if (error.code === 11000) {
                if (error.keyPattern && error.keyPattern.customId) {
                    errorMessage = '❌ This custom ID is already registered.';
                } else if (error.keyPattern && error.keyPattern.email) {
                    errorMessage = '❌ This email is already registered.';
                }
            }

            await interaction.editReply({
                content: errorMessage,
                ephemeral: false
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8