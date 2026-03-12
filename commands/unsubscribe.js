// Code Nexus => https://discord.gg/wBTyCap8
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

let settings;
try {
    const settingsPath = path.join(__dirname, '..', 'setting.json');
    const settingsFile = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(settingsFile);
} catch (error) {
    console.error(`${settings?.emojie?.error ?? "❌"} Failed to load setting.json:`, error.message);
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
    console.error(`${settings?.emojie?.error ?? "❌"} Failed to load config.json:`, error.message);
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

            const customId = interaction.options.getString('custom_id').trim();
            const subscription = await client.Subscription.findOne({ customId });

            if (!subscription) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} No subscription found with custom ID: \`${customId}\``))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (subscription.status === 'cancelled') {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF0B232)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings.emojie.info} Subscription \`${customId}\` is already cancelled.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (subscription.status === 'expired') {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF0B232)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings.emojie.info} Subscription \`${customId}\` is already expired.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
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
                const dmContainer = new ContainerBuilder()
                    .setAccentColor(0xF23F43)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.unsubscribe} Subscription Cancelled`))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `**ID** Â· \`${subscription.customId}\`
**Type** Â· ${subscription.serviceType}  **Plan** Â· ${subscription.planName}
**Email** Â· ${subscription.email}
**Started** Â· <t:${Math.floor(subscription.startDate.getTime() / 1000)}:D>  **Ended** Â· <t:${Math.floor(subscription.endDate.getTime() / 1000)}:D>
**Cancelled By** Â· <@${interaction.user.id}>`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${settings.emojie.heart} We hope to see you again!`));

                await targetUser.send({
                    components: [dmContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                dmSuccess = true;
                console.log(`${settings.emojie.success} Sent cancellation notification to user ${subscription.userId}`);
            } catch (dmError) {
                console.error(`${settings?.emojie?.error ?? "❌"} Failed to send message to user ${subscription.userId}:`, dmError.message);
                dmSuccess = false;
            }

            const replyContainer = new ContainerBuilder()
                .setAccentColor(0xF23F43)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.unsubscribe} Subscription Cancelled`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**ID** Â· \`${customId}\`
**User** Â· <@${subscription.userId}>
**Type** Â· ${subscription.serviceType}  **Plan** Â· ${subscription.planName}
**Email** Â· ${subscription.email}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    dmSuccess
                        ? `-# ${settings.emojie.mail} Cancellation notification sent to user`
                        : `-# ${settings.emojie.warning} DMs closed â€” user was not notified`
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
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.unsubscribe} Subscription Cancelled`))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `**ID** Â· \`${subscription.customId}\`
**User** Â· <@${subscription.userId}> (\`${subscription.userId}\`)
**Type** Â· ${subscription.serviceType}  **Plan** Â· ${subscription.planName}
**Email** Â· ${subscription.email}
**Started** Â· <t:${Math.floor(subscription.startDate.getTime() / 1000)}:D>  **Ended** Â· <t:${Math.floor(subscription.endDate.getTime() / 1000)}:D>
**Admin** Â· <@${interaction.user.id}>  **Delivery** Â· ${dmSuccess ? `${settings.emojie.success} Sent` : `${settings?.emojie?.error ?? "❌"} Failed`}` +
                            (subscription.note ? `\n**Note** Â· ${subscription.note}` : '')
                        ))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${settings.emojie.clipboard} Cancellation Log`));

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
                            content: `${settings.emojie.warning} **Warning**: Failed to send cancellation notification to user <@${subscription.userId}>\n\n**Cancelled Subscription Details:**\n- Custom ID: ${subscription.customId}\n- Type: ${subscription.serviceType}\n- Plan: ${subscription.planName}\n- Email: ${subscription.email}\n\nPlease contact the user manually.`
                        });
                    } catch (ownerError) {
                        console.error(`${settings?.emojie?.error ?? "❌"} Failed to send warning to owner ${ownerId}:`, ownerError.message);
                    }
                }
            }

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? "❌"} Error executing unsubscribe command:`, error);

            await interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} An error occurred while processing the cancellation request.`))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
