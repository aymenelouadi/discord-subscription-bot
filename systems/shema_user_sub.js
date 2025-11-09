// systems/shema_user_sub.js
// Code Nexus => https://discord.gg/wBTyCap8
const mongoose = require('mongoose');

module.exports = {
    name: 'user-subscription-schema',
    execute(client) {
        console.log('🔄 Loading user subscription form...');

        const subscriptionSchema = new mongoose.Schema({
            userId: { 
                type: String, 
                required: true
            },
            customId: { 
                type: String,
                required: true,
                unique: true,
                trim: true
            },
            email: {
                type: String,
                required: true,
                unique: true, 
                lowercase: true, 
                trim: true 
            },
            password: {
                type: String,
                required: true,
                minlength: 2
            },
            planName: { 
                type: String, 
                required: true
            },
            serviceType: { 
                type: String, 
                required: true 
            },
            startDate: { 
                type: Date, 
                required: true
            },
            endDate: { 
                type: Date, 
                required: true
            },
            status: { 
                type: String, 
                required: true
            },
            lastNotified: { 
                type: Date
            },
            note: { 
                type: String
            }
        });

        const Subscription = mongoose.model('Subscription', subscriptionSchema);
        client.Subscription = Subscription;

        console.log('✅ The user subscription form has been successfully uploaded');
    }
};
// Code Nexus => https://discord.gg/wBTyCap8