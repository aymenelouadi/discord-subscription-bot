// commands/owner_add.js
// Code Nexus => https://discord.gg/wBTyCap8
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const loadConfig = () => {
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
    return config;
};

const saveConfig = (newConfig) => {
    try {
        const configPath = path.join(__dirname, '..', 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4), 'utf8');
        return true;
    } catch (error) {
        console.error('❌ Failed to save config:', error);
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
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            const targetUser = interaction.options.getUser('user');
            
            if (config.OWNER.includes(targetUser.id)) {
                return await interaction.editReply({
                    content: `❌ <@${targetUser.id}> is already an owner.`,
                    ephemeral: true
                });
            }

            const updatedConfig = {
                ...config,
                OWNER: [...config.OWNER, targetUser.id]
            };

            const saveSuccess = saveConfig(updatedConfig);
            
            if (!saveSuccess) {
                return await interaction.editReply({
                    content: '❌ Failed to save configuration.',
                    ephemeral: true
                });
            }

            console.log(`✅ Owner added: ${targetUser.tag} (${targetUser.id}) by ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Owner Added')
                .setDescription('Successfully added user to owners list')
                .addFields(
                    {
                        name: '👤 User',
                        value: `<@${targetUser.id}> (${targetUser.id})`,
                        inline: true
                    },
                    {
                        name: '👮‍♂️ Added By',
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: '📊 Total Owners',
                        value: `${updatedConfig.OWNER.length} users`,
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Owners Management • User has full administrative access' 
                });

            await interaction.editReply({
                embeds: [embed],
                ephemeral: false
            });

            try {
                await targetUser.send({
                    embeds: [{
                        color: 0x00FF00,
                        title: '👑 Owner Privileges Granted',
                        description: `You have been granted owner privileges by <@${interaction.user.id}>`,
                        fields: [
                            { name: '🔧 Available Commands', value: '• Full access to all admin commands\n• User management\n• System configuration', inline: false },
                            { name: '⚠️ Responsibility', value: 'Use your privileges responsibly', inline: false }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                });
            } catch (dmError) {
                console.log(`ℹ️ Could not send DM to new owner ${targetUser.tag}`);
            }

        } catch (error) {
            console.error('❌ Error executing owner_add command:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while adding owner.',
                ephemeral: false
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
