// commands/owner_remove.js
// Code Nexus => https://discord.gg/wBTyCap8

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

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
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }

        try {
            await interaction.deferReply({ ephemeral: false });

            const targetUser = interaction.options.getUser('user');
            
            if (!config.OWNER.includes(targetUser.id)) {
                return await interaction.editReply({
                    content: `❌ <@${targetUser.id}> is not in the owners list.`,
                    ephemeral: true
                });
            }

            if (targetUser.id === interaction.user.id) {
                return await interaction.editReply({
                    content: '❌ You cannot remove yourself from owners list.',
                    ephemeral: true
                });
            }

            if (config.OWNER.length <= 1) {
                return await interaction.editReply({
                    content: '❌ Cannot remove the last owner from the list.',
                    ephemeral: true
                });
            }

            config.OWNER = config.OWNER.filter(id => id !== targetUser.id);

            try {
                const configPath = path.join(__dirname, '..', 'config.json');
                fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
                
                console.log(`✅ Owner removed: ${targetUser.tag} (${targetUser.id}) by ${interaction.user.tag}`);
            } catch (error) {
                console.error('❌ Failed to save config:', error);
                return await interaction.editReply({
                    content: '❌ Failed to save configuration.',
                    ephemeral: false
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('❌ Owner Removed')
                .setDescription('Successfully removed user from owners list')
                .addFields(
                    {
                        name: '👤 User',
                        value: `<@${targetUser.id}> (${targetUser.id})`,
                        inline: true
                    },
                    {
                        name: '👮‍♂️ Removed By',
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: '📊 Remaining Owners',
                        value: `${config.OWNER.length} users`,
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Owners Management • User administrative access revoked' 
                });

            await interaction.editReply({
                embeds: [embed],
                ephemeral: false
            });

            try {
                await targetUser.send({
                    embeds: [{
                        color: 0xFFA500,
                        title: '🔓 Owner Privileges Revoked',
                        description: `Your owner privileges have been revoked by <@${interaction.user.id}>`,
                        fields: [
                            { name: '📋 Access Level', value: '• Standard user permissions\n• No administrative access', inline: false },
                            { name: 'ℹ️ Note', value: 'You can still use public commands', inline: false }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                });
            } catch (dmError) {
                console.log(`ℹ️ Could not send DM to removed owner ${targetUser.tag}`);
            }

        } catch (error) {
            console.error('❌ Error executing owner_remove command:', error);
            
            await interaction.editReply({
                content: '❌ An error occurred while removing owner.',
                ephemeral: true
            });
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8
