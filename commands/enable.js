// Code Nexus => https://discord.gg/wBTyCap8
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

let settings;
try {
    const settingsPath = path.join(__dirname, '..', 'setting.json');
    const settingsFile = fs.readFileSync(settingsPath, 'utf8');
    settings = JSON.parse(settingsFile);
} catch (error) {
    console.error('❌ Failed to load setting.json:', error.message);
    settings = {
        commands: {}
    };
}

let config;
try {
    const configPath = path.join(__dirname, '..', 'config.json');
    const configFile = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configFile);
} catch (error) {
    console.error('❌ Failed to load config.json:', error.message);
    config = {
        OWNER: []
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enable')
        .setDescription('Enable or disable commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Select command to modify')
                .setRequired(true)
                .addChoices(
                    ...Object.entries(settings.commands || {}).map(([key, cmd]) => ({
                        name: `/${cmd.name} - ${cmd.enable ? '✅ Enabled' : '❌ Disabled'}`,
                        value: cmd.name
                    }))
                ))
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Enable or disable the command')
                .setRequired(true)
                .addChoices(
                    { name: '✅ Enable', value: 'true' },
                    { name: '❌ Disable', value: 'false' }
                )),

    async execute(client, interaction) {
        if (!config.OWNER.includes(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            const commandName = interaction.options.getString('command');
            const status = interaction.options.getString('status') === 'true';
            
            const commandKey = Object.keys(settings.commands).find(
                key => settings.commands[key].name === commandName
            );

            if (!commandKey) {
                return await interaction.editReply({
                    content: `❌ Command \`/${commandName}\` not found in settings.`,
                    ephemeral: true
                });
            }

            const currentStatus = settings.commands[commandKey].enable;
            
            if (currentStatus === status) {
                return await interaction.editReply({
                    content: `ℹ️ Command \`/${commandName}\` is already ${status ? 'enabled' : 'disabled'}.`,
                    ephemeral: true
                });
            }

            settings.commands[commandKey].enable = status;

            try {
                const settingsPath = path.join(__dirname, '..', 'setting.json');
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4), 'utf8');
                
                console.log(`✅ Command ${commandName} ${status ? 'enabled' : 'disabled'} by ${interaction.user.tag}`);
            } catch (error) {
                console.error('❌ Failed to save settings:', error);
                return await interaction.editReply({
                    content: '❌ Failed to save settings to file.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(status ? 0x00FF00 : 0xFF0000)
                .setTitle(status ? '✅ Command Enabled' : '❌ Command Disabled')
                .setDescription(`Successfully ${status ? 'enabled' : 'disabled'} the command`)
                .addFields(
                    {
                        name: 'Command',
                        value: `\`/${commandName}\``,
                        inline: true
                    },
                    {
                        name: 'Description',
                        value: settings.commands[commandKey].description,
                        inline: true
                    },
                    {
                        name: 'Permission Level',
                        value: settings.commands[commandKey].options === 'admin' ? '👮‍♂️ Admin Only' : '👥 Public',
                        inline: true
                    },
                    {
                        name: 'Previous Status',
                        value: currentStatus ? '✅ Enabled' : '❌ Disabled',
                        inline: true
                    },
                    {
                        name: 'New Status',
                        value: status ? '✅ Enabled' : '❌ Disabled',
                        inline: true
                    },
                    {
                        name: 'Modified By',
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Command Status Manager • Changes take effect immediately' 
                });

            await interaction.editReply({
                embeds: [embed],
                ephemeral: false
            });

        } catch (error) {
            console.error('❌ Error executing enable command:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while modifying command settings.',
                ephemeral: true
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8