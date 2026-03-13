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

module.exports = {
    data: (() => {
        let settings;
        try {
            settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
        } catch {
            settings = { commands: { renew: { enable: true, name: 'renew', description: 'Renewing subscriptions' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.renew?.name || 'renew')
            .setDescription(settings.commands.renew?.description || 'Renewing subscriptions')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(option =>
                option.setName('custom_id')
                    .setDescription('Custom subscription ID to renew')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(50))
            .addIntegerOption(option =>
                option.setName('duration')
                    .setDescription('Number of days to extend the subscription')
                    .setRequired(true)
                    .setMinValue(1)
                    .setMaxValue(365))
            .addStringOption(option =>
                option.setName('note')
                    .setDescription('Optional note about this renewal')
                    .setRequired(false));
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
            } catch {
                return { commands: { renew: { enable: true } }, emojie: {} };
            }
        })();

        const config = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
            } catch {
                return { OWNER: [], LOG_SUB: [] };
            }
        })();

        // Command disabled check
        if (!settings.commands.renew?.enable) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${settings?.emojie?.error ?? '❌'} This command is currently disabled.`
                        ))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        // Owner-only check
        if (!config.OWNER.includes(interaction.user.id)) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `${settings?.emojie?.error ?? '❌'} You do not have permission to use this command.`
                        ))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            const customId = interaction.options.getString('custom_id').trim();
            const addDays = interaction.options.getInteger('duration');
            const note = interaction.options.getString('note') || '';

            // Find subscription
            const subscription = await client.Subscription.findOne({ customId });

            if (!subscription) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${settings?.emojie?.error ?? '❌'} No subscription found with ID \`${customId}\`.`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Calculate new end date — extend from current endDate if still active, otherwise from today
            const now = new Date();
            const oldEndDate = new Date(subscription.endDate);
            const baseDate = (subscription.status === 'active' && oldEndDate > now) ? oldEndDate : now;
            const newEndDate = new Date(baseDate);
            newEndDate.setDate(newEndDate.getDate() + addDays);

            const wasInactive = subscription.status !== 'active';
            const previousStatus = subscription.status;

            // Update the subscription
            subscription.endDate = newEndDate;
            subscription.status = 'active';
            subscription.lastNotified = null;
            if (note) subscription.note = note;
            await subscription.save();

            // Fetch the Discord user
            let targetUser = null;
            try {
                targetUser = await client.users.fetch(subscription.userId);
            } catch {
                targetUser = null;
            }

            // Send DM to user
            let dmSuccess = false;
            if (targetUser) {
                try {
                    const dmContainer = new ContainerBuilder()
                        .setAccentColor(0x23C55E)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${settings.emojie?.renew ?? '🔄'} Subscription Renewed`
                        ))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `**ID** · \`${subscription.customId}\`\n` +
                            `**Type** · ${subscription.serviceType}  **Plan** · ${subscription.planName}\n` +
                            (subscription.ip ? `**IP** · \`${subscription.ip}\`  ` : '') + `**Password** · \`${subscription.password}\`\n` +
                            `**Email** · ${subscription.email}\n` +
                            `**Extended by** · ${addDays} day${addDays !== 1 ? 's' : ''}\n` +
                            `**New Expiry** · <t:${Math.floor(newEndDate.getTime() / 1000)}:D>  (<t:${Math.floor(newEndDate.getTime() / 1000)}:R>)`
                        ))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `-# ${settings.emojie?.heart ?? '❤️'} Thank you for continuing your subscription!`
                        ));

                    await targetUser.send({
                        components: [dmContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                    dmSuccess = true;
                    console.log(`${settings.emojie?.success ?? '✅'} Sent renewal notice to user ${subscription.userId}`);
                } catch (dmError) {
                    console.error(`${settings?.emojie?.error ?? '❌'} Failed to send DM to user ${subscription.userId}:`, dmError.message);
                }
            }

            // Build admin reply container
            const replyContainer = new ContainerBuilder()
                .setAccentColor(0x23C55E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## ${settings.emojie?.renew ?? '🔄'} Subscription Renewed`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**User** · ${targetUser ? `<@${subscription.userId}>` : `\`${subscription.userId}\``}\n` +
                    `**ID** · \`${subscription.customId}\`  **Type** · ${subscription.serviceType}  **Plan** · ${subscription.planName}\n` +
                    `**Email** · ${subscription.email}\n` +
                    `**Extended by** · ${addDays} day${addDays !== 1 ? 's' : ''}\n` +
                    `**Old Expiry** · <t:${Math.floor(oldEndDate.getTime() / 1000)}:D>\n` +
                    `**New Expiry** · <t:${Math.floor(newEndDate.getTime() / 1000)}:D>  (<t:${Math.floor(newEndDate.getTime() / 1000)}:R>)` +
                    (wasInactive ? `\n**Status** · \`${previousStatus}\` → \`active\`` : '') +
                    (note ? `\n**Note** · ${note}` : '')
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    dmSuccess
                        ? `-# ${settings.emojie?.mail ?? '📧'} Renewal notice delivered to user`
                        : `-# ${settings.emojie?.warning ?? '⚠️'} DMs closed — user was not notified`
                ));

            await interaction.editReply({
                components: [replyContainer],
                flags: MessageFlags.IsComponentsV2
            });

            // Log to LOG_SUB channel
            if (config.LOG_SUB && config.LOG_SUB.length > 0) {
                try {
                    const logChannel = await client.channels.fetch(config.LOG_SUB[0]);
                    if (logChannel) {
                        const logContainer = new ContainerBuilder()
                            .setAccentColor(dmSuccess ? 0x23C55E : 0xF0B232)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                dmSuccess
                                    ? `## ${settings.emojie?.renew ?? '🔄'} Subscription Renewed`
                                    : `## ${settings.emojie?.warning ?? '⚠️'} Subscription Renewed — Notice Not Sent`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `**ID** · \`${subscription.customId}\`\n` +
                                `**User** · ${targetUser ? `<@${subscription.userId}>` : `\`${subscription.userId}\``} (\`${subscription.userId}\`)\n` +
                                `**Type** · ${subscription.serviceType}  **Plan** · ${subscription.planName}\n` +
                                `**Email** · ${subscription.email}\n` +
                                `**Extended by** · ${addDays} day${addDays !== 1 ? 's' : ''}\n` +
                                `**Old Expiry** · <t:${Math.floor(oldEndDate.getTime() / 1000)}:D>\n` +
                                `**New Expiry** · <t:${Math.floor(newEndDate.getTime() / 1000)}:D>\n` +
                                `**Admin** · <@${interaction.user.id}>  **Delivery** · ${dmSuccess ? `${settings.emojie?.success ?? '✅'} Sent` : `${settings?.emojie?.error ?? '❌'} Failed`}` +
                                (wasInactive ? `\n**Status** · \`${previousStatus}\` → \`active\`` : '') +
                                (note ? `\n**Note** · ${note}` : '')
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `-# ${settings.emojie?.clipboard ?? '📋'} Renewal Log`
                            ));

                        await logChannel.send({
                            components: [logContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                    }
                } catch (logError) {
                    console.error(`${settings?.emojie?.error ?? '❌'} Failed to send to log channel:`, logError.message);
                }
            }

            // Notify owners if DM failed
            if (!dmSuccess && targetUser && config.OWNER) {
                for (const ownerId of config.OWNER) {
                    try {
                        const owner = await client.users.fetch(ownerId);
                        await owner.send({
                            content: `${settings.emojie?.warning ?? '⚠️'} **Warning**: Could not deliver renewal notice to <@${subscription.userId}>.\n\n**Renewal Details:**\n- ID: \`${customId}\`\n- Extended by: ${addDays} days\n- New Expiry: <t:${Math.floor(newEndDate.getTime() / 1000)}:D>\n\nPlease inform the user manually.`
                        });
                    } catch (ownerError) {
                        console.error(`${settings?.emojie?.error ?? '❌'} Failed to notify owner ${ownerId}:`, ownerError.message);
                    }
                }
            }

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? '❌'} Error executing renew command:`, error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${settings?.emojie?.error ?? '❌'} An error occurred while processing the renewal.`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
