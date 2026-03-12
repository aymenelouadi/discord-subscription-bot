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
            settings = { commands: { announce: { enable: true, name: 'announce', description: 'Send announcement to all subscribers' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.announce?.name || 'announce')
            .setDescription(settings.commands.announce?.description || 'Send announcement to all subscribers')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('The announcement message to send to all subscribers')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(1800))
            .addStringOption(option =>
                option.setName('target')
                    .setDescription('Who to send the announcement to (default: active only)')
                    .setRequired(false)
                    .addChoices(
                        { name: 'Active subscribers only',     value: 'active'    },
                        { name: 'All subscribers (any status)', value: 'all'      }
                    ));
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
            } catch {
                return { commands: { announce: { enable: true } }, emojie: {} };
            }
        })();

        const config = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
            } catch {
                return { OWNER: [], LOG_SUB: [] };
            }
        })();

        if (!settings.commands.announce?.enable) {
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

            const message = interaction.options.getString('message');
            const target  = interaction.options.getString('target') || 'active';

            // Fetch subscriptions
            const query = target === 'all' ? {} : { status: 'active' };
            const subscriptions = await client.Subscription.find(query);

            if (subscriptions.length === 0) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF0B232)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${settings.emojie?.announce ?? '📢'} No Subscribers Found`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `No ${target === 'all' ? '' : 'active '}subscriptions exist in the database.`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `-# ${settings.emojie?.clipboard ?? '📋'} Nothing to announce`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Send DMs — rate-limited with 500ms delay
            let sent    = 0;
            let failed  = 0;
            const failedUsers = [];

            for (const sub of subscriptions) {
                try {
                    const user = await client.users.fetch(sub.userId);
                    const dmContainer = new ContainerBuilder()
                        .setAccentColor(0x5865F2)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `## ${settings.emojie?.announce ?? '📢'} Announcement`
                        ))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(message))
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            `-# ${settings.emojie?.heart ?? '❤️'} Thank you for being a subscriber!`
                        ));

                    await user.send({
                        components: [dmContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                    sent++;
                } catch {
                    failed++;
                    failedUsers.push(sub.userId);
                }

                // Rate-limit: 500ms between each DM
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const targetLabel = target === 'all' ? 'All subscribers' : 'Active subscribers';

            const replyContainer = new ContainerBuilder()
                .setAccentColor(sent > 0 ? 0x23C55E : 0xF23F43)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## ${settings.emojie?.announce ?? '📢'} Announcement Sent`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Target** · ${targetLabel}\n` +
                    `**Total** · ${subscriptions.length} subscriber${subscriptions.length !== 1 ? 's' : ''}\n` +
                    `**Delivered** · ${settings.emojie?.success ?? '✅'} ${sent}\n` +
                    `**Failed** · ${settings.emojie?.error ?? '❌'} ${failed}` +
                    (failed > 0 ? `  *(DMs closed)*` : '')
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# ${settings.emojie?.clipboard ?? '📋'} Sent by <@${interaction.user.id}>`
                ));

            await interaction.editReply({
                components: [replyContainer],
                flags: MessageFlags.IsComponentsV2
            });

            // Log
            if (config.LOG_SUB && config.LOG_SUB.length > 0) {
                try {
                    const logChannel = await client.channels.fetch(config.LOG_SUB[0]);
                    if (logChannel) {
                        const preview = message.length > 120 ? message.slice(0, 120) + '…' : message;
                        const logContainer = new ContainerBuilder()
                            .setAccentColor(sent > 0 ? 0x23C55E : 0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${settings.emojie?.announce ?? '📢'} Announcement Sent`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `**Admin** · <@${interaction.user.id}>\n` +
                                `**Target** · ${targetLabel}  **Total** · ${subscriptions.length}\n` +
                                `**Delivered** · ${sent}  **Failed** · ${failed}\n` +
                                `**Message preview** · ${preview}`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `-# ${settings.emojie?.clipboard ?? '📋'} Announce Log`
                            ));
                        await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
                    }
                } catch (logError) {
                    console.error(`${settings?.emojie?.error ?? '❌'} Failed to log:`, logError.message);
                }
            }

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? '❌'} Error in announce:`, error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${settings?.emojie?.error ?? '❌'} An error occurred while sending the announcement.`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
