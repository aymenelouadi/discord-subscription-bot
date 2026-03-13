const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, REST, Routes, ActivityType, MessageFlags } = require('discord.js');
const mongoose = require('mongoose');

// ======================
// Load settings from config.json
// ======================
let config;
try {
    const configPath = path.join(__dirname, 'config.json');
    if (!fs.existsSync(configPath)) {
        throw new Error('❌ config.json file not found. Please create the file based on config.example.json');
    }
    
    const configFile = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configFile);
    
    // Validate required values
    if (!config.DISCORD_TOKEN) {
        throw new Error('❌ DISCORD_TOKEN not found in config.json');
    }
    if (!config.CLIENT_ID) {
        throw new Error('❌ CLIENT_ID not found in config.json');
    }
    
    console.log('✅ Successfully loaded settings from config.json');
} catch (error) {
    console.error('❌ Failed to load config.json:');
    console.error(error.message);
    process.exit(1);
}

// ======================
// Unhandled error handling
// ======================
process.on('unhandledRejection', error => {
    console.error('⚠️ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('⚠️ Uncaught exception:', error);
});

process.on('uncaughtExceptionMonitor', error => {
    console.error('⚠️ Uncaught exception monitor:', error);
});

// ======================
// Client setup
// ======================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ]
});

// ======================
// Storage collections
// ======================
client.commands = new Collection();
client.systems = new Collection();
client.config = config; // Make settings available through client
client.db = null; // Will be set when MongoDB connects

// ======================
// Database connection functions
// ======================
const connectToDatabase = async () => {
    if (!config.MONGODB_URI) {
        console.warn('⚠️ MONGODB_URI not found in config.json - Skipping database connection');
        return null;
    }

    try {
        console.log('🔄 Attempting to connect to database...');
        
        // Recommended connection settings
        const connectionOptions = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4
        };

        await mongoose.connect(config.MONGODB_URI, connectionOptions);
        
        console.log('✅ Successfully connected to database');
        
        // Set up connection event listeners
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ Database connection disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ Database connection reestablished');
        });

        return mongoose.connection;
    } catch (error) {
        console.error('❌ Failed to connect to database:');
        console.error('Error details:', error.message);
        
        if (error.name === 'MongoServerSelectionError') {
            console.error('🔍 Check:');
            console.error('   - MONGODB_URI connection string validity');
            console.error('   - Internet connection');
            console.error('   - Network settings and firewall');
            console.error('   - Credentials validity');
        }
        
        return null;
    }
};

// ======================
// Helper functions
// ======================
const loadFiles = async (directory, callback) => {
    const dirPath = path.join(__dirname, directory);
    console.log(`🔍 Searching for files in: ${dirPath}`);
    
    if (!fs.existsSync(dirPath)) {
        console.warn(`⚠️ Directory not found: ${directory}`);
        return;
    }

    try {
        const files = fs.readdirSync(dirPath).filter(file => file.endsWith('.js'));
        console.log(`📂 Found ${files.length} files in ${directory}:`, files);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            try {
                // Clear cache to ensure loading latest version
                delete require.cache[require.resolve(filePath)];
                
                const loadedFile = require(filePath);
                await callback(file, loadedFile);
                console.log(`✅ Successfully loaded: ${file}`);
            } catch (err) {
                console.error(`❌ Failed to load file: ${filePath}`);
                console.error(err.stack || err);
                
                // If error is related to config loading, handle differently
                if (err.message.includes('config.json')) {
                    console.error(`🔧 Issue in: ${file} - Trying to load config.json itself`);
                }
            }
        }
    } catch (err) {
        console.error(`❌ Error reading directory: ${dirPath}`);
        console.error(err.stack || err);
    }
};

// ======================
// Load commands
// ======================
const loadSlashCommands = async () => {
    const commands = [];
    
    await loadFiles('commands', (file, command) => {
        if (!command.data || !command.execute) {
            console.warn(`⚠️ Skipping ${file}: Missing data or execute function`);
            return;
        }

        try {
            commands.push(command.data.toJSON());
            client.commands.set(command.data.name, command);
            console.log(`🔄 Loaded command: ${command.data.name}`);
        } catch (err) {
            console.error(`❌ Error processing command ${file}:`);
            console.error(err.stack || err);
        }
    });

    if (commands.length === 0) {
        console.warn('⚠️ No commands were loaded!');
        return;
    }

    try {
        const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
        console.log('🔄 Refreshing application (/) commands...');
        
        const data = await rest.put(
            Routes.applicationCommands(config.CLIENT_ID), 
            { body: commands }
        );
        
        console.log(`✅ Successfully reloaded ${data.length} application commands.`);
    } catch (err) {
        console.error('❌ Failed to reload commands:');
        console.error(err.stack || err);
    }
};

// ======================
// Load systems
// ======================
const loadSystems = async () => {
    await loadFiles('systems', (file, system) => {
        if (!system.name || typeof system.execute !== 'function') {
            console.warn(`⚠️ Skipping ${file}: Missing name or execute function`);
            return;
        }

        try {
            // Pass client only - Systems should use client.config
            system.execute(client);
            client.systems.set(system.name, system);
            console.log(`🔄 System initialized: ${system.name}`);
        } catch (err) {
            console.error(`❌ Error initializing system ${system.name}:`);
            console.error(err.stack || err);
        }
    });
};

// ======================
// Event handling
// ======================
client.on('interactionCreate', async (interaction) => {
    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || !command.autocomplete) return;
        try {
            await command.autocomplete(interaction);
        } catch (error) {
            // 10062 = interaction token expired (user typed faster than round-trip) — not a real error
            if (error.code !== 10062) {
                console.error(`❌ Error in autocomplete for ${interaction.commandName}:`, error);
            }
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`❌ Command not found: ${interaction.commandName}`);
        return interaction.reply({ 
            content: '❌ This command is currently unavailable.', 
            ephemeral: true 
        });
    }

    try {
        console.log(`🔧 Executing command: ${interaction.commandName}`);
        await command.execute(client, interaction);
    } catch (error) {
        console.error(`❌ Error executing ${interaction.commandName}:`);
        console.error(error.stack || error);
        
        if (interaction.replied || interaction.deferred) {
            try {
                await interaction.followUp({
                    content: '❌ An error occurred while executing the command.',
                    flags: MessageFlags.Ephemeral
                });
            } catch { /* interaction may have expired */ }
        } else {
            try {
                await interaction.reply({
                    content: '❌ An error occurred while executing the command.',
                    flags: MessageFlags.Ephemeral
                });
            } catch { /* interaction may have expired */ }
        }
    }
});

// ======================
// Graceful application shutdown
// ======================
const gracefulShutdown = async () => {
    console.log('🔄 Shutting down application gracefully...');
    
    try {
        // Close Discord connection
        if (client && !client.destroyed) {
            client.destroy();
            console.log('✅ Discord connection closed');
        }
        
        // Close MongoDB connection
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('✅ Database connection closed');
        }
        
        console.log('👋 Application closed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// ======================
// Startup
// ======================
const startBot = async () => {
    try {
        // Connect to database first
        const dbConnection = await connectToDatabase();
        client.db = dbConnection;
        
        // Then load systems and commands
        await loadSystems();
        await loadSlashCommands();
        
        // Finally start the bot
        await client.login(config.DISCORD_TOKEN);

        // Set bot activity after ready event
        client.once('clientReady', () => {
            console.log(`🤖 Bot is now online as: ${client.user.tag}`);
            client.user.setActivity('Subscriptions', { type: ActivityType.Watching });
        });
        
    } catch (err) {
        console.error('❌ Failed to start bot:');
        console.error(err.stack || err);
        await gracefulShutdown();
    }
};

startBot();