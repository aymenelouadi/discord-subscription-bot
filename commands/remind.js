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
            settings = { commands: { remind: { enable: true, name: 'remind', description: 'Send or schedule subscription reminders' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.remind?.name || 'remind')
            .setDescription(settings.commands.remind?.description || 'Send or schedule subscription reminders')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(opt =>
                opt.setName('custom_id')
                    .setDescription('Custom subscription ID')
                    .setRequired(true)
                    .setMinLength(1)
                    .setMaxLength(50))
            .addStringOption(opt =>
                opt.setName('action')
                    .setDescription('What to do (default: send now)')
                    .setRequired(false)
                    .addChoices(
                        { name: '📨 Send now only',                value: 'send_now'  },
                        { name: '⏰ Schedule automatic reminder',   value: 'schedule'  },
                        { name: '📨 + ⏰ Send now AND schedule',    value: 'both'      }
                    ))
            .addStringOption(opt =>
                opt.setName('message')
                    .setDescription('Custom message to include in the reminder')
                    .setRequired(false)
                    .setMaxLength(500))
            .addIntegerOption(opt =>
                opt.setName('schedule_days')
                    .setDescription('Days before expiry to fire the scheduled reminder (required when scheduling)')
                    .setRequired(false)
                    .setMinValue(1)
                    .setMaxValue(90));
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8')); }
            catch { return { commands: { remind: { enable: true } }, emojie: {} }; }
        })();
        const config = (() => {
            try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8')); }
            catch { return { OWNER: [], LOG_SUB: [] }; }
        })();
        const em = settings.emojie ?? {};

        if (!settings.commands.remind?.enable) {
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

            const customId     = interaction.options.getString('custom_id').trim();
            const action       = interaction.options.getString('action') || 'send_now';
            const customMsg    = interaction.options.getString('message') || '';
            const scheduleDays = interaction.options.getInteger('schedule_days');

            const doSend     = action === 'send_now' || action === 'both';
            const doSchedule = action === 'schedule'  || action === 'both';

            // Validate: schedule needs schedule_days
            if (doSchedule && !scheduleDays) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder().setAccentColor(0xF0B232)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                (em.warning ?? '⚠️') + ' Please provide **schedule_days** when using the schedule action.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

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

            const now      = new Date();
            const endDate  = new Date(sub.endDate);
            const daysLeft = Math.ceil((endDate - now) / 86400000);
            const isExpired = daysLeft <= 0;
            const color     = isExpired ? 0xF23F43 : daysLeft <= 3 ? 0xF0B232 : 0x23C55E;

            const resultLines = [];

            // ── 1. Send now ───────────────────────────────────────────
            let dmSuccess = false;
            let targetUser = null;

            if (doSend) {
                try { targetUser = await client.users.fetch(sub.userId); } catch {}

                if (targetUser) {
                    try {
                        const statusLine = isExpired
                            ? '**Status** · ' + (em.error ?? '❌') + ' Expired <t:' + Math.floor(endDate.getTime()/1000) + ':R>'
                            : '**Expires** · <t:' + Math.floor(endDate.getTime()/1000) + ':D>  (<t:' + Math.floor(endDate.getTime()/1000) + ':R>)';

                        const dmLines = [
                            '**ID** · `' + sub.customId + '`',
                            '**Type** · ' + sub.serviceType + '  **Plan** · ' + sub.planName,
                            '**Email** · ' + sub.email,
                            statusLine
                        ];
                        if (customMsg) dmLines.push('\n' + customMsg);

                        const dmContainer = new ContainerBuilder()
                            .setAccentColor(color)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '## ' + (em.remind ?? '🔔') + ' Subscription Reminder'
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(dmLines.join('\n')))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '-# ' + (em.heart ?? '❤️') + ' Please renew your subscription to continue enjoying the service.'
                            ));

                        await targetUser.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
                        dmSuccess = true;
                        resultLines.push((em.mail ?? '📧') + ' **DM sent** · ' + (em.success ?? '✅') + ' Delivered to <@' + sub.userId + '>');
                    } catch {
                        resultLines.push((em.mail_off ?? '📪') + ' **DM sent** · ' + (em.error ?? '❌') + ' Failed — DMs closed');
                    }
                } else {
                    resultLines.push((em.error ?? '❌') + ' **DM sent** · Could not fetch user `' + sub.userId + '`');
                }
            }

            // ── 2. Schedule ───────────────────────────────────────────
            let scheduleSuccess = false;
            let sendAtTs = null;

            if (doSchedule) {
                const sendAt = new Date(endDate.getTime() - scheduleDays * 86400000);

                if (sendAt <= now) {
                    resultLines.push((em.warning ?? '⚠️') + ' **Schedule** · ' + (em.error ?? '❌') + ' Cannot schedule — computed send date is in the past (endDate - ' + scheduleDays + ' days)');
                } else {
                    // Check for duplicate scheduled reminder at same date (±1 hour)
                    const dup = (sub.scheduledReminders || []).find(r =>
                        !r.sent && Math.abs(new Date(r.sendAt) - sendAt) < 3600000
                    );

                    if (dup) {
                        resultLines.push((em.warning ?? '⚠️') + ' **Schedule** · Already scheduled near <t:' + Math.floor(new Date(dup.sendAt).getTime()/1000) + ':D>');
                    } else {
                        if (!sub.scheduledReminders) sub.scheduledReminders = [];
                        sub.scheduledReminders.push({ sendAt, message: customMsg, sent: false });
                        sub.markModified('scheduledReminders');
                        await sub.save();
                        sendAtTs = Math.floor(sendAt.getTime() / 1000);
                        scheduleSuccess = true;
                        resultLines.push((em.clock ?? '🕐') + ' **Scheduled** · ' + (em.success ?? '✅') + ' Will fire <t:' + sendAtTs + ':D> (<t:' + sendAtTs + ':R>)  (' + scheduleDays + 'd before expiry)');
                    }
                }
            }

            // ── Show existing scheduled reminders ─────────────────────
            const pending = (sub.scheduledReminders || []).filter(r => !r.sent);
            if (pending.length > 0) {
                const list = pending.map(r =>
                    '· <t:' + Math.floor(new Date(r.sendAt).getTime()/1000) + ':D> (<t:' + Math.floor(new Date(r.sendAt).getTime()/1000) + ':R>)'
                ).join('\n');
                resultLines.push('\n' + (em.clock ?? '🕐') + ' **All pending reminders (' + pending.length + ')**\n' + list);
            }

            // ── Reply ─────────────────────────────────────────────────
            const replyContainer = new ContainerBuilder()
                .setAccentColor(0x23C55E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '## ' + (em.remind ?? '🔔') + ' Remind — ' + sub.customId
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '**User** · <@' + sub.userId + '>\n' +
                    '**Plan** · ' + sub.planName + '  **Type** · ' + sub.serviceType + '\n' +
                    '**Expiry** · ' + (isExpired ? 'Expired' : daysLeft + 'd left') + ' · <t:' + Math.floor(endDate.getTime()/1000) + ':D>'
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(resultLines.join('\n')))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '-# ' + (em.clipboard ?? '📋') + ' Action by <@' + interaction.user.id + '>'
                ));

            await interaction.editReply({ components: [replyContainer], flags: MessageFlags.IsComponentsV2 });

            // ── Log ───────────────────────────────────────────────────
            if (config.LOG_SUB && config.LOG_SUB.length > 0) {
                try {
                    const logChannel = await client.channels.fetch(config.LOG_SUB[0]);
                    if (logChannel) {
                        const logContainer = new ContainerBuilder()
                            .setAccentColor(0x23C55E)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '## ' + (em.remind ?? '🔔') + ' Remind — ' + sub.customId
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '**Admin** · <@' + interaction.user.id + '>\n' +
                                '**User** · <@' + sub.userId + '>\n' +
                                '**Action** · ' + action + '\n' +
                                resultLines.join('\n')
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '-# ' + (em.clipboard ?? '📋') + ' Remind Log'
                            ));
                        await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
                    }
                } catch (logErr) {
                    console.error((em.error ?? '❌') + ' Failed to log:', logErr.message);
                }
            }

        } catch (error) {
            console.error((settings.emojie?.error ?? '❌') + ' Error in /remind:', error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder().setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                (settings.emojie?.error ?? '❌') + ' An error occurred while processing the reminder.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
