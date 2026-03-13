// Code Nexus => https://discord.gg/wBTyCap8
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const fs   = require('fs');
const path = require('path');

module.exports = {
    data: (() => {
        let settings;
        try {
            settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
        } catch {
            settings = { commands: { edit: { enable: true, name: 'edit', description: 'Edit an existing subscription' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.edit?.name || 'edit')
            .setDescription(settings.commands.edit?.description || 'Edit an existing subscription')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(opt =>
                opt.setName('custom_id')
                    .setDescription('Custom ID of the subscription to edit')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(50))
            .addStringOption(opt =>
                opt.setName('email')
                    .setDescription('New email address')
                    .setRequired(false)
                    .setMaxLength(200))
            .addStringOption(opt =>
                opt.setName('password')
                    .setDescription('New password')
                    .setRequired(false)
                    .setMinLength(2)
                    .setMaxLength(100))
            .addStringOption(opt =>
                opt.setName('note')
                    .setDescription('Add or update a note (use "clear" to remove existing note)')
                    .setRequired(false)
                    .setMaxLength(300))
            .addStringOption(opt =>
                opt.setName('end_date')
                    .setDescription('New end date (format: YYYY-MM-DD)')
                    .setRequired(false))
            .addStringOption(opt =>
                opt.setName('status')
                    .setDescription('Change subscription status')
                    .setRequired(false)
                    .addChoices(
                        { name: 'Active',    value: 'active'    },
                        { name: 'Expired',   value: 'expired'   },
                        { name: 'Cancelled', value: 'cancelled' }
                    ));
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8')); }
            catch { return { commands: { edit: { enable: true } }, emojie: {} }; }
        })();
        const config = (() => {
            try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8')); }
            catch { return { OWNER: [], LOG_SUB: [] }; }
        })();
        const em = settings.emojie ?? {};

        if (!settings.commands.edit?.enable) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder().setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            (em.error ?? '❌') + ' This command is currently disabled.'
                        ))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (!config.OWNER.includes(interaction.user.id)) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder().setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            (em.error ?? '❌') + ' You do not have permission to use this command.'
                        ))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            const customId  = interaction.options.getString('custom_id').trim();
            const newEmail  = interaction.options.getString('email');
            const newPass   = interaction.options.getString('password');
            const newNote   = interaction.options.getString('note');
            const newEndRaw = interaction.options.getString('end_date');
            const newStatus = interaction.options.getString('status');

            // At least one field must be provided
            if (!newEmail && !newPass && !newNote && !newEndRaw && !newStatus) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder().setAccentColor(0xF0B232)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                (em.warning ?? '⚠️') + ' Please provide at least one field to update.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Find subscription
            const sub = await client.Subscription.findOne({ customId });
            if (!sub) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder().setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                (em.error ?? '❌') + ' No subscription found with ID `' + customId + '`.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // Validate end_date format
            let newEndDate = null;
            if (newEndRaw) {
                const parsed = new Date(newEndRaw);
                if (isNaN(parsed.getTime())) {
                    return await interaction.editReply({
                        components: [
                            new ContainerBuilder().setAccentColor(0xF23F43)
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    (em.error ?? '❌') + ' Invalid date format. Please use **YYYY-MM-DD** (e.g. `2026-06-01`).'
                                ))
                        ],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
                newEndDate = parsed;
            }

            // Track changes for the log
            const changes = [];
            const old = {
                email:   sub.email,
                endDate: sub.endDate,
                status:  sub.status,
                note:    sub.note
            };

            // Apply changes
            if (newEmail) {
                sub.email = newEmail.toLowerCase().trim();
                changes.push('**Email** · `' + old.email + '` → `' + sub.email + '`');
            }
            if (newPass) {
                sub.password = newPass;
                changes.push('**Password** · updated *(hidden)*');
            }
            if (newNote !== null) {
                if (newNote === 'clear') {
                    sub.note = undefined;
                    changes.push('**Note** · cleared');
                } else {
                    sub.note = newNote;
                    changes.push('**Note** · set to: ' + newNote);
                }
            }
            if (newEndDate) {
                sub.endDate = newEndDate;
                const oldTs = Math.floor(new Date(old.endDate).getTime() / 1000);
                const newTs = Math.floor(newEndDate.getTime() / 1000);
                changes.push('**End Date** · <t:' + oldTs + ':D> → <t:' + newTs + ':D>');
            }
            if (newStatus) {
                sub.status = newStatus;
                changes.push('**Status** · ' + old.status + ' → ' + newStatus);
            }

            await sub.save();

            const container = new ContainerBuilder()
                .setAccentColor(0x23C55E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '## ' + (em.wrench ?? '🔧') + ' Subscription Updated'
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '**ID** · `' + sub.customId + '`  **User** · <@' + sub.userId + '>\n\n' +
                    changes.join('\n')
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '-# ' + (em.clipboard ?? '📋') + ' Edited by <@' + interaction.user.id + '>'
                ));

            await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

            // Log
            if (config.LOG_SUB && config.LOG_SUB.length > 0) {
                try {
                    const logChannel = await client.channels.fetch(config.LOG_SUB[0]);
                    if (logChannel) {
                        const logContainer = new ContainerBuilder()
                            .setAccentColor(0x23C55E)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '## ' + (em.wrench ?? '🔧') + ' Subscription Edited'
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '**ID** · `' + sub.customId + '`  **User** · <@' + sub.userId + '>\n' +
                                '**Admin** · <@' + interaction.user.id + '>\n\n' +
                                changes.join('\n')
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '-# ' + (em.clipboard ?? '📋') + ' Edit Log'
                            ));
                        await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
                    }
                } catch (logErr) {
                    console.error((em.error ?? '❌') + ' Failed to log:', logErr.message);
                }
            }

        } catch (error) {
            // Duplicate email / unique constraint
            if (error.code === 11000) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder().setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                (settings.emojie?.error ?? '❌') + ' This email address is already used by another subscription.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }
            console.error((settings.emojie?.error ?? '❌') + ' Error in /edit:', error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder().setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                (settings.emojie?.error ?? '❌') + ' An error occurred while editing the subscription.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
