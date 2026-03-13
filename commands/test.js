// Code Nexus => https://discord.gg/wBTyCap8
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const fs      = require('fs');
const path    = require('path');
const mongoose = require('mongoose');

// Required keys we expect in each config file
const SETTING_REQUIRED = ['commands', 'emojie'];
const CONFIG_REQUIRED  = ['DISCORD_TOKEN', 'CLIENT_ID', 'MONGODB_URI', 'OWNER'];

module.exports = {
    data: (() => {
        let settings;
        try {
            settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
        } catch {
            settings = { commands: { test: { enable: true, name: 'test', description: 'Run a diagnostics check on the bot' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.test?.name || 'test')
            .setDescription(settings.commands.test?.description || 'Run a diagnostics check on the bot')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8')); }
            catch { return { commands: { test: { enable: true } }, emojie: {} }; }
        })();
        const config = (() => {
            try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8')); }
            catch { return { OWNER: [], LOG_SUB: [] }; }
        })();
        const em = settings.emojie ?? {};

        if (!settings.commands.test?.enable) {
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

        // ── Defer so we can take a moment to run checks ─────────────────────
        const startTs = Date.now();
        await interaction.deferReply({ ephemeral: true });
        const interactionLatency = Date.now() - startTs;

        // ── 1. Bot Ping ──────────────────────────────────────────────────────
        const wsPing = client.ws.ping;
        const pingStatus  = wsPing < 0   ? '⚠️ Measuring…' :
                           wsPing < 100  ? '🟢' :
                           wsPing < 250  ? '🟡' : '🔴';
        const pingLine = pingStatus + ' **WS Ping** · `' + wsPing + ' ms`   |   ' +
                         '⚡ **Response** · `' + interactionLatency + ' ms`';

        // ── 2. MongoDB ───────────────────────────────────────────────────────
        let mongoLine, subCount = null;
        const mongoState = mongoose.connection.readyState;
        // 0 = disconnected | 1 = connected | 2 = connecting | 3 = disconnecting
        const mongoStateLabels = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
        const mongoStateColor  = { 0: '🔴', 1: '🟢', 2: '🟡', 3: '🟡' };

        if (mongoState === 1) {
            try {
                subCount  = await client.Subscription.countDocuments({});
                mongoLine = '🟢 **MongoDB** · `' + (mongoStateLabels[mongoState] ?? 'Unknown') + '`\n' +
                            '> Host · `' + (mongoose.connection.host ?? 'n/a') + '`\n' +
                            '> DB · `'   + (mongoose.connection.name ?? 'n/a') + '`\n' +
                            '> Documents in subscriptions · `' + subCount + '`';
            } catch (e) {
                mongoLine = '🟡 **MongoDB** · `Connected but query failed`\n> `' + e.message + '`';
            }
        } else {
            mongoLine = (mongoStateColor[mongoState] ?? '⚠️') +
                        ' **MongoDB** · `' + (mongoStateLabels[mongoState] ?? 'Unknown') + '`';
        }

        // ── 3. setting.json ──────────────────────────────────────────────────
        let settingLine;
        try {
            const raw = fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8');
            const obj = JSON.parse(raw);
            const missing = SETTING_REQUIRED.filter(k => !(k in obj));
            const commandCount = Object.keys(obj.commands ?? {}).length;
            const emojiCount   = Object.keys(obj.emojie  ?? {}).length;
            if (missing.length > 0) {
                settingLine = '🟡 **setting.json** · `Valid JSON, missing keys: ' + missing.join(', ') + '`';
            } else {
                settingLine = '🟢 **setting.json** · `Valid`\n' +
                              '> Commands defined · `' + commandCount + '`\n' +
                              '> Emojis defined · `'   + emojiCount   + '`';
            }
        } catch (e) {
            settingLine = '🔴 **setting.json** · `' + e.message + '`';
        }

        // ── 4. config.json ───────────────────────────────────────────────────
        let configLine;
        try {
            const raw = fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8');
            const obj = JSON.parse(raw);
            const missing = CONFIG_REQUIRED.filter(k => !(k in obj));
            const ownerCount = (obj.OWNER ?? []).length;
            if (missing.length > 0) {
                configLine = '🟡 **config.json** · `Valid JSON, missing keys: ' + missing.join(', ') + '`';
            } else {
                const tokenPreview = obj.DISCORD_TOKEN
                    ? obj.DISCORD_TOKEN.slice(0, 8) + '••••••••'
                    : 'not set';
                configLine = '🟢 **config.json** · `Valid`\n' +
                             '> Token · `' + tokenPreview           + '`\n' +
                             '> Client ID · `' + (obj.CLIENT_ID ?? 'n/a') + '`\n' +
                             '> Owners · `'  + ownerCount            + '`\n' +
                             '> Check interval · `' + (obj.CHECK_HOURS ?? 'n/a') + ' hrs`';
            }
        } catch (e) {
            configLine = '🔴 **config.json** · `' + e.message + '`';
        }

        // ── 5. Uptime ────────────────────────────────────────────────────────
        const uptimeSec  = Math.floor(process.uptime());
        const uh  = Math.floor(uptimeSec / 3600);
        const um  = Math.floor((uptimeSec % 3600) / 60);
        const us  = uptimeSec % 60;
        const uptimeFmt = (uh > 0 ? uh + 'h ' : '') + (um > 0 ? um + 'm ' : '') + us + 's';
        const memMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
        const systemLine = '🕒 **Uptime** · `' + uptimeFmt + '`   |   💾 **Memory** · `' + memMB + ' MB`\n' +
                           '🤖 **discord.js** · `' + require('discord.js').version + '`   |   ' +
                           '🟩 **Node.js** · `' + process.version + '`';

        // ── Build CV2 response ────────────────────────────────────────────────
        const allOk = (wsPing > 0 && wsPing < 250) && mongoState === 1 &&
                      !settingLine.startsWith('🔴') && !configLine.startsWith('🔴');
        const accentColor = allOk ? 0x23C55E : 0xF0B232;

        const container = new ContainerBuilder()
            .setAccentColor(accentColor)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                '## 🔬 Diagnostics Report'
            ))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))

            // Ping
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                '### Latency\n' + pingLine
            ))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))

            // MongoDB
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                '### MongoDB\n' + mongoLine
            ))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))

            // Config files
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                '### Configuration Files\n' + settingLine + '\n\n' + configLine
            ))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))

            // System
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                '### System\n' + systemLine
            ))
            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                '-# 🔬 Diagnostics · <t:' + Math.floor(Date.now() / 1000) + ':f> · requested by <@' + interaction.user.id + '>'
            ));

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
