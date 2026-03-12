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
            settings = { commands: { check: { enable: true, name: 'check', description: 'Check all subscriptions' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.check?.name || 'check')
            .setDescription(settings.commands.check?.description || 'Check all subscriptions')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
            } catch {
                return { commands: { check: { enable: true } }, emojie: {} };
            }
        })();

        const config = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
            } catch {
                return { OWNER: [], LOG_SUB: [] };
            }
        })();

        if (!settings.commands.check?.enable) {
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

            const now = new Date();
            const allSubs = await client.Subscription.find({});

            let total       = allSubs.length;
            let active      = 0;
            let nowExpired  = 0;  // were active/unknown, now expired
            let alreadyExp  = 0;  // already had expired status
            let cancelled   = 0;

            const bulkOps = [];

            for (const sub of allSubs) {
                const isOverdue = new Date(sub.endDate) < now;

                if (sub.status === 'cancelled') {
                    cancelled++;
                } else if (sub.status === 'expired') {
                    alreadyExp++;
                } else if (isOverdue) {
                    // active/unknown but past end date → mark expired
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: sub._id },
                            update: { $set: { status: 'expired' } }
                        }
                    });
                    nowExpired++;
                } else {
                    active++;
                }
            }

            // Apply bulk update if any
            if (bulkOps.length > 0) {
                await client.Subscription.bulkWrite(bulkOps);
            }

            const totalExpired = alreadyExp + nowExpired;

            const replyContainer = new ContainerBuilder()
                .setAccentColor(0x23C55E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## ${settings.emojie?.check ?? '🔍'} Subscription Check Complete`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Total** · ${total} subscription${total !== 1 ? 's' : ''}\n` +
                    `**Active** · ${settings.emojie?.success ?? '✅'} ${active}\n` +
                    `**Expired** · ${settings.emojie?.error ?? '❌'} ${totalExpired}${nowExpired > 0 ? ` (${nowExpired} newly marked)` : ''}\n` +
                    `**Cancelled** · ${settings.emojie?.warning ?? '⚠️'} ${cancelled}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# ${settings.emojie?.clipboard ?? '📋'} Checked by <@${interaction.user.id}>`
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
                        const logContainer = new ContainerBuilder()
                            .setAccentColor(0x23C55E)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${settings.emojie?.check ?? '🔍'} Subscription Check`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `**Total** · ${total}  **Active** · ${active}  **Expired** · ${totalExpired}  **Cancelled** · ${cancelled}\n` +
                                (nowExpired > 0 ? `**Newly expired** · ${nowExpired} subscription${nowExpired !== 1 ? 's' : ''} marked\n` : '') +
                                `**Admin** · <@${interaction.user.id}>`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `-# ${settings.emojie?.clipboard ?? '📋'} Check Log`
                            ));
                        await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
                    }
                } catch (logError) {
                    console.error(`${settings?.emojie?.error ?? '❌'} Failed to log:`, logError.message);
                }
            }

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? '❌'} Error in check:`, error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${settings?.emojie?.error ?? '❌'} An error occurred while checking subscriptions.`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
