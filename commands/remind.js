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
            settings = { commands: { remind: { enable: true, name: 'remind', description: 'Send subscription reminder to a member' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.remind?.name || 'remind')
            .setDescription(settings.commands.remind?.description || 'Send subscription reminder to a member')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(option =>
                option.setName('custom_id')
                    .setDescription('Custom subscription ID to remind')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(50))
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('Optional custom message to include in the reminder')
                    .setRequired(false));
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
            } catch {
                return { commands: { remind: { enable: true } }, emojie: {} };
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
        if (!settings.commands.remind?.enable) {
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

            const customId    = interaction.options.getString('custom_id').trim();
            const customMsg   = interaction.options.getString('message') || '';

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

            // Calculate days remaining
            const now = new Date();
            const endDate = new Date(subscription.endDate);
            const msLeft  = endDate - now;
            const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
            const isExpired = daysLeft <= 0;

            // Fetch Discord user
            let targetUser = null;
            try {
                targetUser = await client.users.fetch(subscription.userId);
            } catch {
                targetUser = null;
            }

            // Choose accent color based on days left
            const accentColor = isExpired ? 0xF23F43 : daysLeft <= 3 ? 0xF0B232 : 0x23C55E;

            // Build DM
            let dmSuccess = false;
            if (targetUser) {
                try {
                    const statusLine = isExpired
                        ? `**Status** · ${settings.emojie?.error ?? '❌'} Expired <t:${Math.floor(endDate.getTime() / 1000)}:R>`
                        : `**Expires** · <t:${Math.floor(endDate.getTime() / 1000)}:D>  (<t:${Math.floor(endDate.getTime() / 1000)}:R>)`;

                    const dmLines = [
                        `**ID** · \`${subscription.customId}\``,
                        `**Type** · ${subscription.serviceType}  **Plan** · ${subscription.planName}`,
                        `**Email** · ${subscription.email}`,
                        statusLine,
                    ];
                    if (customMsg) dmLines.push(`\n${customMsg}`);

                    const dmContainer = new ContainerBuilder()
                        .setAccentColor(accentColor)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${settings.emojie?.remind ?? '🔔'} Subscription Reminder`
                        ))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(dmLines.join('\n')))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `-# ${settings.emojie?.heart ?? '❤️'} Please renew your subscription to continue enjoying the service.`
                        ));

                    await targetUser.send({
                        components: [dmContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                    dmSuccess = true;
                    console.log(`${settings.emojie?.success ?? '✅'} Sent reminder to user ${subscription.userId}`);
                } catch (dmError) {
                    console.error(`${settings?.emojie?.error ?? '❌'} Failed to DM user ${subscription.userId}:`, dmError.message);
                }
            }

            // Admin reply
            const replyLines = [
                `**User** · ${targetUser ? `<@${subscription.userId}>` : `\`${subscription.userId}\``}`,
                `**ID** · \`${subscription.customId}\`  **Type** · ${subscription.serviceType}  **Plan** · ${subscription.planName}`,
                `**Email** · ${subscription.email}`,
                isExpired
                    ? `**Status** · ${settings.emojie?.error ?? '❌'} Expired <t:${Math.floor(endDate.getTime() / 1000)}:R>`
                    : `**Expires** · <t:${Math.floor(endDate.getTime() / 1000)}:D>  (<t:${Math.floor(endDate.getTime() / 1000)}:R>)  (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)`,
            ];
            if (customMsg) replyLines.push(`**Custom message** · ${customMsg}`);

            const replyContainer = new ContainerBuilder()
                .setAccentColor(dmSuccess ? accentColor : 0xF0B232)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## ${settings.emojie?.remind ?? '🔔'} Reminder Sent`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(replyLines.join('\n')))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    dmSuccess
                        ? `-# ${settings.emojie?.mail ?? '📧'} Reminder delivered to user`
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
                            .setAccentColor(dmSuccess ? accentColor : 0xF0B232)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                dmSuccess
                                    ? `## ${settings.emojie?.remind ?? '🔔'} Reminder Sent`
                                    : `## ${settings.emojie?.warning ?? '⚠️'} Reminder — Notice Not Delivered`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `**ID** · \`${subscription.customId}\`\n` +
                                `**User** · ${targetUser ? `<@${subscription.userId}>` : `\`${subscription.userId}\``} (\`${subscription.userId}\`)\n` +
                                `**Type** · ${subscription.serviceType}  **Plan** · ${subscription.planName}\n` +
                                `**Delivery** · ${dmSuccess ? `${settings.emojie?.success ?? '✅'} Sent` : `${settings?.emojie?.error ?? '❌'} Failed`}\n` +
                                `**Admin** · <@${interaction.user.id}>` +
                                (customMsg ? `\n**Message** · ${customMsg}` : '')
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `-# ${settings.emojie?.clipboard ?? '📋'} Reminder Log`
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
                            content: `${settings.emojie?.warning ?? '⚠️'} **Warning**: Could not deliver reminder to <@${subscription.userId}> (ID: \`${customId}\`). DMs appear to be closed.`
                        });
                    } catch (ownerError) {
                        console.error(`${settings?.emojie?.error ?? '❌'} Failed to notify owner ${ownerId}:`, ownerError.message);
                    }
                }
            }

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? '❌'} Error executing remind command:`, error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${settings?.emojie?.error ?? '❌'} An error occurred while sending the reminder.`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
