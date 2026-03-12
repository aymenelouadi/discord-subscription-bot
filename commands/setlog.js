// Code Nexus => https://discord.gg/wBTyCap8
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: (() => {
        let settings;
        try {
            settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
        } catch {
            settings = { commands: { setlog: { enable: true, name: 'setlog', description: 'Define log channels' } } };
        }
        return new SlashCommandBuilder()
            .setName(settings.commands.setlog?.name || 'setlog')
            .setDescription(settings.commands.setlog?.description || 'Define log channels')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('Which log channel to configure')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Subscription Log (LOG_SUB)', value: 'LOG_SUB' },
                        { name: 'Expiry Log (LOG_END)',        value: 'LOG_END' }
                    ))
            .addChannelOption(option =>
                option.setName('channel')
                    .setDescription('The channel to use as the log channel')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true));
    })(),

    async execute(client, interaction) {
        const settings = (() => {
            try {
                return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'setting.json'), 'utf8'));
            } catch {
                return { commands: { setlog: { enable: true } }, emojie: {} };
            }
        })();

        const configPath = path.join(__dirname, '..', 'config.json');
        const config = (() => {
            try {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch {
                return { OWNER: [], LOG_SUB: [], LOG_END: [] };
            }
        })();

        // Command disabled check
        if (!settings.commands.setlog?.enable) {
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

            const logType = interaction.options.getString('type');
            const channel = interaction.options.getChannel('channel');

            // Update config.json with new channel
            config[logType] = [channel.id];
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');

            const typeLabel = logType === 'LOG_SUB' ? 'Subscription Log' : 'Expiry Log';

            const replyContainer = new ContainerBuilder()
                .setAccentColor(0x23C55E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `## ${settings.emojie?.setlog ?? '📋'} Log Channel Updated`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Type** · ${typeLabel}\n**Channel** · <#${channel.id}> (\`${channel.name}\`)`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# ${settings.emojie?.clipboard ?? '📋'} Config saved by <@${interaction.user.id}>`
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
                            .setAccentColor(0x23C55E)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `## ${settings.emojie?.setlog ?? '📋'} Log Channel Updated`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `**Type** · ${typeLabel}\n**Channel** · <#${channel.id}> (\`${channel.name}\`)\n**Admin** · <@${interaction.user.id}>`
                            ))
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `-# ${settings.emojie?.clipboard ?? '📋'} Config Log`
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

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? '❌'} Error executing setlog command:`, error);
            try {
                await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                `${settings?.emojie?.error ?? '❌'} An error occurred while updating the log channel.`
                            ))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch {}
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
