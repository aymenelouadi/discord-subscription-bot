// commands/owner_add.js
// Code Nexus => https://discord.gg/wBTyCap8
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const loadConfig = () => {
    let config;
    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        const configFile = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configFile);
    } catch (error) {
        console.error(`${settings?.emojie?.error ?? "❌"} Failed to load config.json:`, error.message);
        config = {
            OWNER: []
        };
    }
    return config;
};

const saveConfig = (newConfig) => {
    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4), 'utf8');
        return true;
    } catch (error) {
        console.error(`${settings?.emojie?.error ?? "❌"} Failed to save config:`, error);
        return false;
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner_add')
        .setDescription('Add a user to owners list')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to add as owner')
                .setRequired(true)),

    async execute(client, interaction) {
        const config = loadConfig();

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

            const targetUser = interaction.options.getUser('user');

            if (config.OWNER.includes(targetUser.id)) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} <@${targetUser.id}> is already an owner.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const updatedConfig = { ...config, OWNER: [...config.OWNER, targetUser.id] };
            const saveSuccess = saveConfig(updatedConfig);

            if (!saveSuccess) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Failed to save configuration.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            console.log(`${settings.emojie.success} Owner added: ${targetUser.tag} (${targetUser.id}) by ${interaction.user.tag}`);

            const container = new ContainerBuilder()
                .setAccentColor(0x23C55E)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.owner_add} Owner Added`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**User** Â· <@${targetUser.id}>\n` +
                    `**ID** Â· \`${targetUser.id}\`\n` +
                    `**Added By** Â· <@${interaction.user.id}>\n` +
                    `**Total Owners** Â· ${updatedConfig.OWNER.length} users`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# ${settings.emojie.key} Owners Management Â· User now has full administrative access`
                ));

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            try {
                const dmContainer = new ContainerBuilder()
                    .setAccentColor(0x23C55E)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.owner_add} Owner Privileges Granted`))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `You have been granted owner privileges by <@${interaction.user.id}>\n\n` +
                        `**What you can do**\n> Full access to all admin commands\n> User & subscription management\n> System configuration\n\n` +
                        `**${settings.emojie.warning} Note** Â· Use your privileges responsibly`
                    ));
                await targetUser.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
            } catch (dmError) {
                console.log(`${settings.emojie.info} Could not send DM to new owner ${targetUser.tag}`);
            }

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? "❌"} Error executing owner_add command:`, error);
            await interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} An error occurred while adding owner.`))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
