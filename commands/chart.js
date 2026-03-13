// Code Nexus => https://discord.gg/wBTyCap8
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    AttachmentBuilder,
    MessageFlags
} = require('discord.js');
const fs   = require('fs');
const path = require('path');
const { renderStatus, renderBar, renderTimeline, renderDonut } = require('../systems/chart_renderer');

module.exports = {
    data: (() => {
        let settings;
        try {
            settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
        } catch {
            settings = { commands: { chart: { enable: true, name: 'chart', description: 'Generate subscription charts' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.chart?.name || 'chart')
            .setDescription(settings.commands.chart?.description || 'Generate subscription charts')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(opt =>
                opt.setName('type')
                    .setDescription('Chart type to generate')
                    .setRequired(false)
                    .addChoices(
                        { name: '📊 Status breakdown – bar chart',                 value: 'status'   },
                        { name: '🍩 Status breakdown – donut chart',               value: 'donut'    },
                        { name: '📦 Subscriptions by plan',                        value: 'plans'    },
                        { name: '🔧 Subscriptions by service type',                value: 'services' },
                        { name: '📅 Timeline – new subscriptions per month',       value: 'timeline' }
                    ))
            .addStringOption(opt =>
                opt.setName('period')
                    .setDescription('Timeline period (only used when type = timeline)')
                    .setRequired(false)
                    .addChoices(
                        { name: 'Last 3 months',  value: '3'  },
                        { name: 'Last 6 months',  value: '6'  },
                        { name: 'Last 12 months', value: '12' }
                    ));
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
            } catch {
                return { commands: { chart: { enable: true } }, emojie: {} };
            }
        })();
        const config = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
            } catch {
                return { OWNER: [], LOG_SUB: [] };
            }
        })();
        const em = settings.emojie ?? {};

        if (!settings.commands.chart?.enable) {
            return await interaction.reply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
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
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                            (em.error ?? '❌') + ' You do not have permission to use this command.'
                        ))
                ],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            const chartType  = interaction.options.getString('type')   || 'status';
            const periodStr  = interaction.options.getString('period') || '6';
            const monthCount = parseInt(periodStr, 10);
            const now        = new Date();
            const subs       = await client.Subscription.find({});

            let imageBuffer;
            let chartLabel;

            // ── status ──────────────────────────────────────────────
            if (chartType === 'status') {
                chartLabel  = 'Status Breakdown';
                imageBuffer = renderStatus({
                    active:    subs.filter(s => s.status === 'active').length,
                    expired:   subs.filter(s => s.status === 'expired').length,
                    cancelled: subs.filter(s => s.status === 'cancelled').length,
                });
            }

            // ── donut ───────────────────────────────────────────────
            else if (chartType === 'donut') {
                chartLabel  = 'Status Breakdown (Donut)';
                imageBuffer = renderDonut({
                    active:    subs.filter(s => s.status === 'active').length,
                    expired:   subs.filter(s => s.status === 'expired').length,
                    cancelled: subs.filter(s => s.status === 'cancelled').length,
                });
            }

            // ── plans ───────────────────────────────────────────────
            else if (chartType === 'plans') {
                chartLabel = 'Subscriptions by Plan';
                const planMap = {};
                for (const s of subs) if (s.planName) planMap[s.planName] = (planMap[s.planName] ?? 0) + 1;
                const data = Object.entries(planMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([label, value]) => ({ label, value }));
                imageBuffer = renderBar(data, '📦  Subscriptions by Plan', 'Top ' + data.length + ' plans');
            }

            // ── services ────────────────────────────────────────────
            else if (chartType === 'services') {
                chartLabel = 'Subscriptions by Service Type';
                const typeMap = {};
                for (const s of subs) if (s.serviceType) typeMap[s.serviceType] = (typeMap[s.serviceType] ?? 0) + 1;
                const data = Object.entries(typeMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([label, value]) => ({ label, value }));
                imageBuffer = renderBar(data, '🔧  Subscriptions by Service Type', 'Top ' + data.length + ' service types');
            }

            // ── timeline ────────────────────────────────────────────
            else if (chartType === 'timeline') {
                chartLabel = 'Timeline (' + monthCount + ' months)';

                // Build month buckets
                const buckets = {};
                for (let m = monthCount - 1; m >= 0; m--) {
                    const d   = new Date(now.getFullYear(), now.getMonth() - m, 1);
                    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
                    buckets[key] = 0;
                }
                for (const s of subs) {
                    const sd  = new Date(s.startDate);
                    const key = sd.getFullYear() + '-' + String(sd.getMonth() + 1).padStart(2, '0');
                    if (key in buckets) buckets[key]++;
                }
                const data = Object.entries(buckets).map(([label, value]) => ({ label, value }));
                imageBuffer = renderTimeline(data, monthCount);
            }

            // ── Build Discord message ────────────────────────────────
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'chart.png' });

            const container = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '## ' + (em.chart ?? '📊') + ' ' + chartLabel
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '-# ' + (em.clipboard ?? '📋') + ' Generated by <@' + interaction.user.id + '> · <t:' + Math.floor(now.getTime()/1000) + ':f>'
                ));

            await interaction.editReply({
                components: [container],
                files: [attachment],
                flags: MessageFlags.IsComponentsV2
            });

            // Log
            if (config.LOG_SUB && config.LOG_SUB.length > 0) {
                try {
                    const logChannel = await client.channels.fetch(config.LOG_SUB[0]);
                    if (logChannel) {
                        const logContainer = new ContainerBuilder()
                            .setAccentColor(0x5865F2)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '## ' + (em.chart ?? '📊') + ' Chart Generated'
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '**Type** · ' + chartLabel + '\n**Admin** · <@' + interaction.user.id + '>'
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                '-# ' + (em.clipboard ?? '📋') + ' Chart Log'
                            ));
                        await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
                    }
                } catch (logErr) {
                    console.error((em.error ?? '❌') + ' Failed to log:', logErr.message);
                }
            }

        } catch (error) {
            console.error((settings.emojie?.error ?? '❌') + ' Error in /chart:', error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                (settings.emojie?.error ?? '❌') + ' An error occurred while generating the chart.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
