// Code Nexus => https://discord.gg/wBTyCap8
const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');

module.exports = {
    name: 'subscription-checker',
    execute(client) {
        console.log('🔄 Subscription checker system loaded successfully');

        let config = null;
        
        const loadConfig = () => {
            try {
                const fs = require('fs');
                const path = require('path');
                const configPath = path.join(__dirname, '..', 'config.json');
                const configFile = fs.readFileSync(configPath, 'utf8');
                config = JSON.parse(configFile);
                console.log('✅ Config loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load config.json:', error.message);
            }
        };

        const messageQueue = [];
        let isProcessingQueue = false;

        const processMessageQueue = async () => {
            if (isProcessingQueue || messageQueue.length === 0) return;
            
            isProcessingQueue = true;
            
            while (messageQueue.length > 0) {
                const message = messageQueue.shift();
                try {
                    await message();
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error('❌ Error processing message from queue:', error);
                }
            }
            
            isProcessingQueue = false;
        };

        const sendUserNotification = async (user, embed) => {
            messageQueue.push(async () => {
                try {
                    await user.send({ embeds: [embed] });
                    return true;
                } catch (error) {
                    console.error(`❌ Failed to send notification to user ${user.id}:`, error.message);
                    return false;
                }
            });
            processMessageQueue();
        };

        const sendOwnerNotification = async (ownerId, embed) => {
            messageQueue.push(async () => {
                try {
                    const owner = await client.users.fetch(ownerId);
                    await owner.send({ embeds: [embed] });
                    return true;
                } catch (error) {
                    console.error(`❌ Failed to send notification to owner ${ownerId}:`, error.message);
                    return false;
                }
            });
            processMessageQueue();
        };

        const checkAllSubscriptions = async () => {
            try {
                const now = new Date();
                console.log(`🔍 Starting subscription check at: ${now.toISOString()}`);

                if (!config) {
                    console.error('❌ Config not loaded, skipping check');
                    return;
                }

                const {
                    NOTIFY_TIME_DAY_ONE = 7,
                    NOTIFY_TIME_DAY_TWO = 3,
                    NOTIFY_TIME_DAY_THREE = 1,
                    OWNER = []
                } = config;

                const notifyDateStage1 = new Date();
                notifyDateStage1.setDate(notifyDateStage1.getDate() + NOTIFY_TIME_DAY_ONE);

                const notifyDateStage2 = new Date();
                notifyDateStage2.setDate(notifyDateStage2.getDate() + NOTIFY_TIME_DAY_TWO);

                const notifyDateStage3 = new Date();
                notifyDateStage3.setDate(notifyDateStage3.getDate() + NOTIFY_TIME_DAY_THREE);

                const activeSubscriptions = await client.Subscription.find({
                    status: 'active',
                    endDate: { $gt: now }
                });

                console.log(`📊 Found ${activeSubscriptions.length} active subscriptions`);

                let stage1Count = 0;
                let stage2Count = 0;
                let stage3Count = 0;
                let expiredCount = 0;
                let failedNotifications = [];

                for (const subscription of activeSubscriptions) {
                    try {
                        const daysRemaining = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
                        
                        if (daysRemaining <= 0) {
                            subscription.status = 'expired';
                            await subscription.save();
                            expiredCount++;
                            
                            for (const ownerId of OWNER) {
                                const expiredEmbed = new EmbedBuilder()
                                    .setColor(0xFF0000)
                                    .setTitle('🔴 Subscription Expired')
                                    .setFields([
                                        { name: '👤 User', value: `<@${subscription.userId}> (${subscription.userId})`, inline: true },
                                        { name: '🆔 Custom ID', value: subscription.customId, inline: true },
                                        { name: '📋 Type', value: subscription.serviceType, inline: true },
                                        { name: '📊 Plan', value: subscription.planName, inline: true },
                                        { name: '📅 End Date', value: `<t:${Math.floor(subscription.endDate.getTime() / 1000)}:F>`, inline: true }
                                    ])
                                    .setTimestamp();
                                
                                await sendOwnerNotification(ownerId, expiredEmbed);
                            }
                            continue;
                        }

                        let notificationStage = null;
                        let stageDays = null;

                        if (daysRemaining <= NOTIFY_TIME_DAY_THREE && (!subscription.lastNotified || subscription.lastNotified < notifyDateStage3)) {
                            notificationStage = 3;
                            stageDays = NOTIFY_TIME_DAY_THREE;
                            stage3Count++;
                        } else if (daysRemaining <= NOTIFY_TIME_DAY_TWO && (!subscription.lastNotified || subscription.lastNotified < notifyDateStage2)) {
                            notificationStage = 2;
                            stageDays = NOTIFY_TIME_DAY_TWO;
                            stage2Count++;
                        } else if (daysRemaining <= NOTIFY_TIME_DAY_ONE && (!subscription.lastNotified || subscription.lastNotified < notifyDateStage1)) {
                            notificationStage = 1;
                            stageDays = NOTIFY_TIME_DAY_ONE;
                            stage1Count++;
                        }

                        if (!notificationStage) continue;

                        let userNotifySuccess = false;
                        try {
                            const user = await client.users.fetch(subscription.userId);
                            const userEmbed = new EmbedBuilder()
                                .setColor(0xFFA500)
                                .setTitle('⏰ Subscription Expiration Alert')
                                .setDescription(`Your subscription will expire in **${daysRemaining} days**`)
                                .setFields([
                                    { name: '🆔 Custom ID', value: subscription.customId, inline: true },
                                    { name: '📋 Service Type', value: subscription.serviceType, inline: true },
                                    { name: '📊 Plan', value: subscription.planName, inline: true },
                                    { name: '📅 End Date', value: `<t:${Math.floor(subscription.endDate.getTime() / 1000)}:F>`, inline: true },
                                    { name: '⏰ Time Remaining', value: `${daysRemaining} days`, inline: true }
                                ])
                                .setTimestamp()
                                .setFooter({ text: 'Please renew your subscription before it expires' });

                            await sendUserNotification(user, userEmbed);
                            userNotifySuccess = true;
                            console.log(`✅ Sent stage ${notificationStage} notification to user ${subscription.userId}`);
                        } catch (userError) {
                            console.error(`❌ Failed to send notification to user ${subscription.userId}:`, userError.message);
                            userNotifySuccess = false;
                        }

                        for (const ownerId of OWNER) {
                            const ownerEmbed = new EmbedBuilder()
                                .setColor(userNotifySuccess ? 0xFFA500 : 0xFF0000)
                                .setTitle(userNotifySuccess ? `⏰ Stage ${notificationStage} Subscription Alert` : '⚠️ Notification Failed')
                                .setFields([
                                    { name: '👤 User', value: `<@${subscription.userId}> (${subscription.userId})`, inline: true },
                                    { name: '🆔 Custom ID', value: subscription.customId, inline: true },
                                    { name: '📋 Type', value: subscription.serviceType, inline: true },
                                    { name: '📊 Plan', value: subscription.planName, inline: true },
                                    { name: '📅 End Date', value: `<t:${Math.floor(subscription.endDate.getTime() / 1000)}:F>`, inline: true },
                                    { name: '⏰ Time Remaining', value: `${daysRemaining} days`, inline: true },
                                    { name: '📨 Notification Status', value: userNotifySuccess ? '✅ Sent' : '❌ Failed', inline: true },
                                    { name: '🔔 Stage', value: `Stage ${notificationStage} (${stageDays} days)`, inline: true }
                                ])
                                .setTimestamp();

                            await sendOwnerNotification(ownerId, ownerEmbed);
                        }

                        subscription.lastNotified = now;
                        await subscription.save();

                        await new Promise(resolve => setTimeout(resolve, 200));

                    } catch (error) {
                        console.error(`❌ Error processing subscription ${subscription.customId}:`, error);
                        failedNotifications.push(subscription.customId);
                    }
                }

                console.log(`📈 Check completed:`);
                console.log(`   Stage 1 (${NOTIFY_TIME_DAY_ONE} days): ${stage1Count} notifications`);
                console.log(`   Stage 2 (${NOTIFY_TIME_DAY_TWO} days): ${stage2Count} notifications`);
                console.log(`   Stage 3 (${NOTIFY_TIME_DAY_THREE} days): ${stage3Count} notifications`);
                console.log(`   Expired: ${expiredCount} subscriptions`);
                
                if (failedNotifications.length > 0) {
                    console.log(`❌ Failed notifications for: ${failedNotifications.join(', ')}`);
                }

            } catch (error) {
                console.error('❌ Error in subscription checker:', error);
            }
        };

        // ── Scheduled reminders (set via /remind schedule) ────────────────────
        const checkScheduledReminders = async () => {
            try {
                const now = new Date();
                const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');

                const subsWithPending = await client.Subscription.find({
                    scheduledReminders: { $elemMatch: { sent: false, sendAt: { $lte: now } } }
                });

                if (subsWithPending.length === 0) return;
                console.log('🔔 Processing ' + subsWithPending.length + ' scheduled reminder(s)...');

                for (const sub of subsWithPending) {
                    const dueReminders = (sub.scheduledReminders || []).filter(
                        r => !r.sent && new Date(r.sendAt) <= now
                    );

                    for (const reminder of dueReminders) {
                        try {
                            const user     = await client.users.fetch(sub.userId);
                            const daysLeft = Math.ceil((new Date(sub.endDate) - now) / 86400000);
                            const color    = daysLeft <= 0 ? 0xF23F43 : daysLeft <= 3 ? 0xF0B232 : 0x23C55E;
                            const endTs    = Math.floor(new Date(sub.endDate).getTime() / 1000);

                            const textLines = [
                                '**ID** · `' + sub.customId + '`',
                                '**Type** · ' + sub.serviceType + '  **Plan** · ' + sub.planName,
                                daysLeft > 0
                                    ? '**Expires** · <t:' + endTs + ':D>  (<t:' + endTs + ':R>)'
                                    : '**Status** · Expired  <t:' + endTs + ':R>'
                            ];
                            if (reminder.message) textLines.push('\n' + reminder.message);

                            const dmContainer = new ContainerBuilder()
                                .setAccentColor(color)
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    '## 🔔 Scheduled Reminder'
                                ))
                                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    textLines.join('\n')
                                ))
                                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                    '-# ❤️ Please renew your subscription to continue enjoying the service.'
                                ));

                            await user.send({ components: [dmContainer], flags: MessageFlags.IsComponentsV2 });
                            console.log('✅ Sent scheduled reminder to ' + sub.userId + ' for ' + sub.customId);
                        } catch (err) {
                            console.error('❌ Failed to send scheduled reminder for ' + sub.customId + ':', err.message);
                        }
                        // Mark sent regardless to avoid infinite retry
                        reminder.sent = true;
                    }

                    sub.markModified('scheduledReminders');
                    await sub.save();
                }
            } catch (err) {
                console.error('❌ Error in checkScheduledReminders:', err);
            }
        };

        const initializeSystem = () => {
            loadConfig();

            if (!config) {
                console.error('❌ Cannot start subscription checker - config not loaded');
                return;
            }

            const { CHECK_HOURS = 12 } = config;

            cron.schedule('0 0 * * *', () => {
                console.log('🕛 Running scheduled subscription check (midnight)');
                checkAllSubscriptions();
                checkScheduledReminders();
            });

            // Also run scheduled reminders every hour
            cron.schedule('0 * * * *', () => {
                checkScheduledReminders();
            });

            console.log('🚀 Running initial subscription check');
            checkAllSubscriptions();
            checkScheduledReminders();

            setInterval(() => {
                console.log(`🔄 Running periodic subscription check (every ${CHECK_HOURS} hours)`);
                checkAllSubscriptions();
                checkScheduledReminders();
            }, CHECK_HOURS * 60 * 60 * 1000);

            console.log(`⏰ Subscription checker initialized:`);
            console.log(`   - Daily check at midnight`);
            console.log(`   - Periodic check every ${CHECK_HOURS} hours`);
            console.log(`   - Notification stages: 7, 3, 1 days before expiration`);
        };

        if (client.isReady()) {
            initializeSystem();
        } else {
            client.once('ready', initializeSystem);
        }
    }
};
// Code Nexus => https://discord.gg/wBTyCap8