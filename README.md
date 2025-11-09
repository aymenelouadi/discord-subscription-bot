<h1 align="center">
  <br>
  <a href="https://github.com/saiteja-"><img src="https://res.cloudinary.com/djoo9ukvd/image/upload/v1761418439/discord_images/mjbnatclqrl0kwyqriak.png" height="200" alt="Code Nexus | System V4"></a>
  <br>
    Code Nexus | Sub V1
  <br>
</h1>

<p align="center">💰 <b>Subscription System</b> — A fully automated role-based subscription system that allows users to subscribe to premium roles for a limited time. 
It checks active subscriptions, renews or removes expired ones automatically, and provides admins with full control over duration, pricing, and notifications.
</p>
<br>

## 🔗 Resource Links
- 🤝 Support Server: [Join Here](https://discord.gg/mFEehCPKEW)
- 📺 Youtube Channel: [Youtube](https://www.youtube.com/@cn_nexus)
- 💖 Donate us: [PayPal](https://www.paypal.com/paypalme/rewebby)

## 📦 Prerequisites

- [Node.js](https://nodejs.org/en/) v20 or higher
- [MongoDB](https://www.mongodb.com)

## 🚀 Getting Started

- Download the project in [Visual studio code](https://code.visualstudio.com/), put the project in it, and open a terminal via CTRL + SHIFT + ` or via the button at the top left, then Terminal, then New Terminal, and write the following:
```
npm install
```

- Wait for all the dependencies to be installed
- go to [config.json](config.json) complete all of them
- Type `npm start` or `node index.js` or `nodeon index.js` to start the bot in cmd

```
if you use hosting
```
- add project en `.zip` and decompress project
- go to [config.json](config.json) complete all of them
- finally run hosting

If you need any additional help [join support server discord](https://discord.gg/mFEehCPKEW)

<br>

<h1 align="center"> ✨ Features ✨ </h1>

**💳 Subscription System**
- Automatic tracking of active, expired, and cancelled subscriptions.
- Manual and automatic cancellation options.
- Logs sent to the specified channel for transparency.

**📬 Notifications**
- DM notifications to users when their subscription is created, renewed, or cancelled.
- Owner alerts when a user’s DM is closed or delivery fails.

**🔒 Security & Permissions**
- Owner-only access for sensitive commands.
- Configurable permissions and logging for safer management.

**📁 Smart Configuration**
- All settings stored in JSON files (`config.json` & `setting.json`) for easy customization.
- Automatically reloads configurations if not found or corrupted.

**📊 Organized Display**
- Embed-based interface with emojis, color coding, and detailed fields.
- Pagination system for easy browsing through many subscriptions.

**🕒 Auto Expiry System**
- Automatic expiry tracking with remaining time calculation.
- Real-time updates using buttons (Refresh, Next, Previous).

**💬 User-Friendly Interface**
- Clean design with categorized embeds.
- Button navigation for effortless control.

<h1 align="center"> ✨ Command List & Features ✨</h1>

## /subscribe
- Create a new user subscription.
- Saves to the database, sends DM to the user, and logs the event.
- In the free version: limited duration or number of subscriptions.

## /unsubscribe
- Cancel a subscription using a custom_id.
- Changes status to "cancelled" and sends notifications.

## /subscriptions
- Displays all subscriptions with pagination and navigation.
- Includes real-time refresh and page buttons.
- In the free version: view only, no control.

## /info
- Displays the user’s current subscription details.

## /help
- Shows a categorized command list with pages and buttons.

## /check
- Manually checks all subscriptions and sends reminders.
- Premium version: customizable reminder stages.

## Automatic Check System (cron)
- Performs daily and automatic subscription verification.

## /renew [Premium](https://discord.gg/mFEehCPKEW)
- Automatically or manually renew a subscription.

## /stats [Premium](https://discord.gg/mFEehCPKEW)
- Displays detailed statistics of users and plans.

## /chart [Premium](https://discord.gg/mFEehCPKEW)
- Shows a chart of subscription growth or decline over time.

## /clearexpired [Premium](https://discord.gg/mFEehCPKEW)
- Deletes or archives expired subscriptions.

## /announce [Premium](https://discord.gg/mFEehCPKEW)
- Sends an announcement or message to all subscribers only.

## /remind [Premium](https://discord.gg/mFEehCPKEW)
- Set custom reminders before expiration days.

## ⚖️ Access Policy: Free vs Premium

| Command (Free)     | Availability | Command (Premium)       | Availability |
|-------------------|--------------|------------------------|--------------|
| /subscribe        | Free 🟢      | /renew                 | [Premium](https://discord.gg/mFEehCPKEW) 🔵 |
| /unsubscribe      | Free 🟢      | /stats                 | [Premium](https://discord.gg/mFEehCPKEW) 🔵 |
| /subscriptions    | Free 🟢      | /chart                 | [Premium](https://discord.gg/mFEehCPKEW) 🔵 |
| /info             | Free 🟢      | /announce              | [Premium](https://discord.gg/mFEehCPKEW) 🔵 |
| /help             | Free 🟢      | /remind                | [Premium](https://discord.gg/mFEehCPKEW) 🔵 |
| /plan_add         | Free 🟢      | /check                 | [Premium](https://discord.gg/mFEehCPKEW) 🔵 |
| /plan_remove      | Free 🟢      | /setlog                | [Premium](https://discord.gg/mFEehCPKEW) 🔵 |
| /type_add         | Free 🟢      | /clearexpired          | [Premium](https://discord.gg/mFEehCPKEW) 🔵 |
| /type_remove      | Free 🟢      |                        |              |
| /enable           | Free 🟢      |                        |              |
| /owner_add        | Free 🟢      |                        |              |
| /owner_remove     | Free 🟢      |                        |              |




## 📜 License & Copyright
- © 2025 Code Nexus. All rights reserved.