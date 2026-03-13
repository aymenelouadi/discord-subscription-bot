// Code Nexus => https://discord.gg/wBTyCap8
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const loadSettings = () => {
    let settings;
    try {
        const settingsPath = path.join(__dirname, '..', 'setting.json');
        const settingsFile = fs.readFileSync(settingsPath, 'utf8');
        settings = JSON.parse(settingsFile);
    } catch (error) {
        console.error(`${settings?.emojie?.error ?? "❌"} Failed to load setting.json:`, error.message);
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
        console.error(`${settings?.emojie?.error ?? "❌"} Failed to load config.json:`, error.message);
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
            option.setName('ip')
                .setDescription('VPS IP address')
                .setRequired(true)
                .setMinLength(7)
                .setMaxLength(45))
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
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} This command is currently disabled.`))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

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

            const targetUser = interaction.options.getUser('user');
            const customId = interaction.options.getString('custom_id').trim();
            const serviceType = interaction.options.getString('type');
            const planName = interaction.options.getString('plan');
            const duration = interaction.options.getInteger('duration');
            const email = interaction.options.getString('email').toLowerCase().trim();
            const password = interaction.options.getString('password');
            const ip = interaction.options.getString('ip').trim();
            const note = interaction.options.getString('note') || '';

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Please enter a valid email address.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const existingSubscriptionByEmail = await client.Subscription.findOne({ email });
            if (existingSubscriptionByEmail) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${settings?.emojie?.error ?? "❌"} This email is already registered for user <@${existingSubscriptionByEmail.userId}>`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const existingSubscriptionById = await client.Subscription.findOne({ customId });
            if (existingSubscriptionById) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${settings?.emojie?.error ?? "❌"} This custom ID (\`${customId}\`) is already registered for user <@${existingSubscriptionById.userId}>`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
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
                ip: ip,
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
                const dmContainer = new ContainerBuilder()
                    .setAccentColor(0x23C55E)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.subscribe} Subscription Activated`))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `**ID** · \`${customId}\`\n` +
                        `**Type** · ${serviceType}  **Plan** · ${planName}\n` +
                        `**IP** · \`${ip}\`  **Password** · \`${password}\`\n` +
                        `**Email** · ${email}\n` +
                        `**Duration** · ${duration} days\n` +
                        `**Starts** · <t:${Math.floor(startDate.getTime() / 1000)}:D>  **Expires** · <t:${Math.floor(endDate.getTime() / 1000)}:D>`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${settings.emojie.rocket} Thank you for your trust!`));

                await targetUser.send({
                    components: [dmContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                dmSuccess = true;
                console.log(`${settings.emojie.success} Sent subscription details to user ${targetUser.id}`);
            } catch (dmError) {
                console.error(`${settings?.emojie?.error ?? "❌"} Failed to send message to user ${targetUser.id}:`, dmError.message);
                dmSuccess = false;
            }

            const replyContainer = new ContainerBuilder()
                .setAccentColor(0x23C55E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.subscribe} Subscription Created`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**User** · <@${targetUser.id}>\n` +
                    `**ID** · \`${customId}\`  **Type** · ${serviceType}  **Plan** · ${planName}\n` +
                    `**IP** · \`${ip}\`  **Email** · ${email}  **Duration** · ${duration} days\n` +
                    `**Starts** · <t:${Math.floor(startDate.getTime() / 1000)}:D>  **Expires** · <t:${Math.floor(endDate.getTime() / 1000)}:R>`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    dmSuccess
                        ? `-# ${settings.emojie.mail} Subscription data delivered to user`
                        : `-# ${settings.emojie.warning} DMs closed — user was not notified`
                ));

            await interaction.editReply({
                components: [replyContainer],
                flags: MessageFlags.IsComponentsV2
            });

            if (config.LOG_SUB && config.LOG_SUB.length > 0) {
                const logChannelId = config.LOG_SUB[0];
                const logChannel = await client.channels.fetch(logChannelId).catch(() => null);

                if (logChannel) {
                    const logContainer = new ContainerBuilder()
                        .setAccentColor(dmSuccess ? 0x23C55E : 0xF0B232)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            dmSuccess ? `## ${settings.emojie.subscribe} New Subscription` : `## ${settings.emojie.warning} New Subscription — Data Not Sent`
                        ))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `**ID** · \`${customId}\`\n` +
                            `**User** · <@${targetUser.id}> (\`${targetUser.id}\`)\n` +
                            `**Type** · ${serviceType}  **Plan** · ${planName}\n` +
                            `**IP** · \`${ip}\`  **Email** · ${email}  **Duration** · ${duration} days\n` +
                            `**Starts** · <t:${Math.floor(startDate.getTime() / 1000)}:D>  **Expires** · <t:${Math.floor(endDate.getTime() / 1000)}:D>\n` +
                            `**Admin** · <@${interaction.user.id}>  **Delivery** · ${dmSuccess ? `${settings.emojie.success} Sent` : `${settings?.emojie?.error ?? "❌"} Failed`}` +
                            (note ? `\n**Note** · ${note}` : '')
                        ))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${settings.emojie.clipboard} Subscription Log`));

                    await logChannel.send({
                        components: [logContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            }

            if (!dmSuccess) {
                for (const ownerId of config.OWNER) {
                    try {
                        const owner = await client.users.fetch(ownerId);
                        await owner.send({
                            content: `${settings.emojie.warning} **Warning**: Failed to send subscription data to user <@${targetUser.id}>\n\n**Subscription Details:**\n- Custom ID: ${customId}\n- Type: ${serviceType}\n- Plan: ${planName}\n- Email: ${email}\n- Duration: ${duration} days\n\nPlease contact the user manually.`
                        });
                    } catch (ownerError) {
                        console.error(`${settings?.emojie?.error ?? "❌"} Failed to send warning to owner ${ownerId}:`, ownerError.message);
                    }
                }
            }

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? "❌"} Error executing subscribe command:`, error);

            let errorMessage = `${settings?.emojie?.error ?? "❌"} An error occurred while processing the subscription request.`;
            if (error.code === 11000) {
                if (error.keyPattern && error.keyPattern.customId) {
                    errorMessage = `${settings?.emojie?.error ?? "❌"} This custom ID is already registered.`;
                } else if (error.keyPattern && error.keyPattern.email) {
                    errorMessage = `${settings?.emojie?.error ?? "❌"} This email is already registered.`;
                }
            }

            await interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(errorMessage))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8