// commands/owner_remove.js
// Code Nexus => https://discord.gg/wBTyCap8

const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('owner_remove')
        .setDescription('Remove a user from owners list')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to remove from owners')
                .setRequired(true)),

    async execute(client, interaction) {
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

            if (!config.OWNER.includes(targetUser.id)) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} <@${targetUser.id}> is not in the owners list.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (targetUser.id === interaction.user.id) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} You cannot remove yourself from the owners list.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            if (config.OWNER.length <= 1) {
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Cannot remove the last owner from the list.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            config.OWNER = config.OWNER.filter(id => id !== targetUser.id);

            try {
                const configPath = path.join(__dirname, '..', 'config.json');
                fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                console.log(`${settings.emojie.success} Owner removed: ${targetUser.tag} (${targetUser.id}) by ${interaction.user.tag}`);
            } catch (error) {
                console.error(`${settings?.emojie?.error ?? "❌"} Failed to save config:`, error);
                return await interaction.editReply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xF23F43)
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} Failed to save configuration.`))
                    ],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const container = new ContainerBuilder()
                .setAccentColor(0xF0B232)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.owner_remove} Owner Removed`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**User** Â· <@${targetUser.id}>\n` +
                    `**ID** Â· \`${targetUser.id}\`\n` +
                    `**Removed By** Â· <@${interaction.user.id}>\n` +
                    `**Remaining Owners** Â· ${config.OWNER.length} users`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `-# ${settings.emojie.key} Owners Management Â· Administrative access revoked`
                ));

            await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });

            try {
                const dmContainer = new ContainerBuilder()
                    .setAccentColor(0xF0B232)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${settings.emojie.owner_remove} Owner Privileges Revoked`))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `Your owner privileges have been revoked by <@${interaction.user.id}>\n\n` +
                        `**Access Level**\n> Standard user permissions\n> No administrative access\n\n` +
                        `**${settings.emojie.info} Note** Â· You can still use public commands`
                    ));
                await targetUser.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
            } catch (dmError) {
                console.log(`${settings.emojie.info} Could not send DM to removed owner ${targetUser.tag}`);
            }

        } catch (error) {
            console.error(`${settings?.emojie?.error ?? "❌"} Error executing owner_remove command:`, error);
            await interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xF23F43)
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${settings?.emojie?.error ?? "❌"} An error occurred while removing owner.`))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
