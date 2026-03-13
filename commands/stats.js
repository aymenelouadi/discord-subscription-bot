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
            settings = { commands: { stats: { enable: true, name: 'stats', description: 'View full database statistics' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.stats?.name || 'stats')
            .setDescription(settings.commands.stats?.description || 'View full database statistics')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
            } catch {
                return { commands: { stats: { enable: true } }, emojie: {} };
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

        if (!settings.commands.stats?.enable) {
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
            const now  = new Date();
            const subs = await client.Subscription.find({});

            const total     = subs.length;
            const active    = subs.filter(s => s.status === 'active').length;
            const expired   = subs.filter(s => s.status === 'expired').length;
            const cancelled = subs.filter(s => s.status === 'cancelled').length;

            const daysLeft = (end) => Math.ceil((new Date(end) - now) / 86400000);
            const in7  = subs.filter(s => s.status === 'active' && daysLeft(s.endDate) <= 7  && daysLeft(s.endDate) >= 0).length;
            const in30 = subs.filter(s => s.status === 'active' && daysLeft(s.endDate) <= 30 && daysLeft(s.endDate) >= 0).length;

            // Plan breakdown (top 5)
            const planMap = {};
            for (const s of subs) if (s.planName) planMap[s.planName] = (planMap[s.planName] ?? 0) + 1;
            const topPlans = Object.entries(planMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

            // Service type breakdown (top 5)
            const typeMap = {};
            for (const s of subs) if (s.serviceType) typeMap[s.serviceType] = (typeMap[s.serviceType] ?? 0) + 1;
            const topTypes = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

            // Newest & soonest expiry
            const activeSubs = subs.filter(s => s.status === 'active');
            let newestDate    = null;
            let oldestEndDate = null;
            if (activeSubs.length > 0) {
                newestDate    = activeSubs.reduce((a, b) => new Date(b.startDate) > new Date(a.startDate) ? b : a).startDate;
                oldestEndDate = activeSubs.reduce((a, b) => new Date(a.endDate)   < new Date(b.endDate)   ? a : b).endDate;
            }

            const bar = (count, tot) => {
                if (tot === 0) return '`░░░░░░░░░░` 0%';
                const fill = Math.round(count / tot * 10);
                return '`' + '█'.repeat(fill) + '░'.repeat(10 - fill) + '`' + ' ' + Math.round(count / tot * 100) + '%';
            };

            let expiryText =
                (em.warning ?? '⚠️') + ' **Expiring ≤ 7 days** · ' + in7 + '\n' +
                (em.clock   ?? '🕐') + ' **Expiring ≤ 30 days** · ' + in30;
            if (newestDate)    expiryText += '\n' + (em.success ?? '✅') + ' **Latest join** · <t:' + Math.floor(new Date(newestDate).getTime()/1000) + ':D>';
            if (oldestEndDate) expiryText += '\n' + (em.clock   ?? '🕐') + ' **Soonest expiry** · <t:' + Math.floor(new Date(oldestEndDate).getTime()/1000) + ':R>';

            const topPlansText = topPlans.length > 0
                ? topPlans.map(([n, c]) => '**' + n + '** · ' + c + ' · ' + bar(c, total)).join('\n')
                : 'No plan data yet';
            const topTypesText = topTypes.length > 0
                ? topTypes.map(([n, c]) => '**' + n + '** · ' + c + ' · ' + bar(c, total)).join('\n')
                : 'No service type data yet';

            const container = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '## ' + (em.stats ?? '📊') + ' Subscription Statistics'
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '### ' + (em.clipboard ?? '📋') + ' Overview\n' +
                    '**Total subscriptions** · ' + total + '\n\n' +
                    (em.success  ?? '✅') + ' **Active**    · ' + active    + '    · ' + bar(active,    total) + '\n' +
                    (em.error    ?? '❌') + ' **Expired**   · ' + expired   + '   · ' + bar(expired,   total) + '\n' +
                    (em.warning  ?? '⚠️') + ' **Cancelled** · ' + cancelled + ' · ' + bar(cancelled, total)
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '### ' + (em.clock ?? '🕐') + ' Expiry Alerts\n' + expiryText
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '### ' + (em.key ?? '🔑') + ' Top Plans\n' + topPlansText
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '### ' + (em.wrench ?? '🔧') + ' Top Service Types\n' + topTypesText
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    '-# ' + (em.clipboard ?? '📋') + ' Requested by <@' + interaction.user.id + '> · <t:' + Math.floor(now.getTime()/1000) + ':f>'
                ));

            await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

        } catch (error) {
            console.error((settings.emojie?.error ?? '❌') + ' Error in /stats:', error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                (settings.emojie?.error ?? '❌') + ' An error occurred while fetching statistics.'
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
