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
            settings = { commands: { clearexpired: { enable: true, name: 'clearexpired', description: 'Delete expired subscriptions completely' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.clearexpired?.name || 'clearexpired')
            .setDescription(settings.commands.clearexpired?.description || 'Delete expired subscriptions completely')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(option =>
                option.setName('scope')
                    .setDescription('Which subscriptions to delete')
                    .setRequired(false)
                    .addChoices(
                        { name: 'Expired (status = expired)',   value: 'expired'   },
                        { name: 'Cancelled (status = cancelled)', value: 'cancelled' },
                        { name: 'Both expired and cancelled',   value: 'both'      }
                    ));
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
            } catch {
                return { commands: { clearexpired: { enable: true } }, emojie: {} };
            }
        })();

        const config = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
            } catch {
                return { OWNER: [], LOG_SUB: [] };
            }
        })();

        if (!settings.commands.clearexpired?.enable) {
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

            const scope = interaction.options.getString('scope') || 'both';

            // Build query filter
            let statusFilter;
            if (scope === 'expired')   statusFilter = { status: 'expired' };
            else if (scope === 'cancelled') statusFilter = { status: 'cancelled' };
            else statusFilter = { status: { $in: ['expired', 'cancelled'] } };

            // Count before deleting
            const totalBefore = await client.Subscription.countDocuments(statusFilter);

            if (totalBefore === 0) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF0B232)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${settings.emojie?.clearexpired ?? '🗑️'} Nothing to Clear`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `No ${scope === 'both' ? 'expired or cancelled' : scope} subscriptions found in the database.`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `-# ${settings.emojie?.clipboard ?? '📋'} Database is already clean`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Delete
            const result = await client.Subscription.deleteMany(statusFilter);
            const deleted = result.deletedCount;

            const scopeLabel = scope === 'both' ? 'expired & cancelled' : scope;

            const replyContainer = new ContainerBuilder()
                .setAccentColor(0x23C55E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## ${settings.emojie?.clearexpired ?? '🗑️'} Subscriptions Cleared`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Scope** · ${scopeLabel}\n**Deleted** · ${deleted} subscription${deleted !== 1 ? 's' : ''}`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# ${settings.emojie?.clipboard ?? '📋'} Cleared by <@${interaction.user.id}>`
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
                                `## ${settings.emojie?.clearexpired ?? '🗑️'} Subscriptions Cleared`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `**Scope** · ${scopeLabel}\n**Deleted** · ${deleted} subscription${deleted !== 1 ? 's' : ''}\n**Admin** · <@${interaction.user.id}>`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `-# ${settings.emojie?.clipboard ?? '📋'} Clear Log`
                            ));
                        await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
                    }
                } catch (logError) {
                    console.error(`${settings?.emojie?.error ?? '❌'} Failed to log:`, logError.message);
                }
            }

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? '❌'} Error in clearexpired:`, error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${settings?.emojie?.error ?? '❌'} An error occurred while clearing subscriptions.`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
