<h1 align="center">
  <br>
  <a href="https://github.com/aymenelouadi/discord-subscription-bot">
    <img src="https://res.cloudinary.com/djoo9ukvd/image/upload/v1761418439/discord_images/mjbnatclqrl0kwyqriak.png" height="200" alt="Discord Subscription Bot">
  </a>
  <br>
  Discord Subscription Bot
  <br>
</h1>

<p align="center">
  <a href="https://github.com/aymenelouadi/discord-subscription-bot/releases"><img src="https://img.shields.io/github/v/release/aymenelouadi/discord-subscription-bot?color=blue&label=version" alt="Version"></a>
  <a href="https://github.com/aymenelouadi/discord-subscription-bot/blob/main/LICENSE"><img src="https://img.shields.io/github/license/aymenelouadi/discord-subscription-bot" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen" alt="Node.js"></a>
  <a href="https://discord.gg/mFEehCPKEW"><img src="https://img.shields.io/discord/1234567890?color=5865F2&label=support&logo=discord" alt="Discord"></a>
</p>

<p align="center">
  A fully automated role-based subscription management bot for Discord.<br>
  Handles subscriptions, expirations, renewals, notifications, charts, and diagnostics — all from slash commands.
</p>

---

## 🔗 Links
- 🤝 Support Server: [discord.gg/mFEehCPKEW](https://discord.gg/mFEehCPKEW)
- 📺 YouTube: [@cn_nexus](https://www.youtube.com/@cn_nexus)
- 💖 Donate: [PayPal](https://www.paypal.com/paypalme/rewebby)
- 📋 Changelog: [CHANGELOG.md](CHANGELOG.md)
- 🔒 Security Policy: [SECURITY.md](SECURITY.md)

## 📦 Prerequisites

- [Node.js](https://nodejs.org/en/) v20 or higher
- [MongoDB](https://www.mongodb.com)

## 🚀 Getting Started

- Download the project in [Visual Studio Code](https://code.visualstudio.com/), open a terminal via ``CTRL + SHIFT + ``` and run:
```
npm install
```

- Fill in [config.json](config.json) with your credentials.
- Start the bot:
```
node index.js
```

**If you use hosting:**
- Upload the project as `.zip` and extract it.
- Fill in [config.json](config.json).
- Run the bot from your hosting panel.

If you need help, [join the support server](https://discord.gg/mFEehCPKEW).

---

<h1 align="center">✨ Features ✨</h1>

**💳 Subscription Management**
- Full lifecycle tracking: active → expired → cancelled.
- Create, renew, cancel, and search subscriptions with a custom ID system.
- Edit any subscription field (email, password, note, end date, status) without deleting it.

**📬 Smart Notifications**
- DM alerts at configurable stages: 7, 3, and 1 day before expiry.
- Scheduled reminders stored in the database and delivered automatically via cron.
- Owner alerts when a user's DM fails.

**📊 Charts & Statistics**
- `/stats` — comprehensive database dashboard.
- `/chart` — 4 visual types: status bar, status donut, plans bar, services bar, and monthly timeline.
- Rendered server-side with `@napi-rs/canvas` — no external service required.

**🔍 Search & Edit**
- `/search` — find any subscription by `customId`, `userId`, `email`, `planName`, or `serviceType`.
- `/edit` — update fields on an existing subscription with old→new change tracking in the log.

**🔬 Diagnostics**
- `/test` — instant health report: WS ping, MongoDB state, config validation, uptime, and memory.

**🔒 Security & Permissions**
- Owner-only access for all admin commands.
- Configurable log channels via `/setlog`.

**📁 Configuration**
- `config.json` for credentials; `setting.json` for behaviour, names, descriptions, and emoji palette.
- Per-command enable/disable toggle via `/enable`.

**🕒 Auto Expiry System**
- Daily midnight cron + configurable interval (default every 12 h).
- Marks expired subscriptions automatically and notifies owners.
- Hourly cron for scheduled reminder delivery.

---

<h1 align="center">✨ Command Reference ✨</h1>

### 📋 Subscription Commands

| Command | Description | Access |
|---------|-------------|--------|
| `/subscribe` | Create a new subscription | 🔑 Admin |
| `/unsubscribe` | Cancel a subscription by custom ID | 🔑 Admin |
| `/renew` | Renew an existing subscription | 🔑 Admin |
| `/subscriptions` | Paginated list of all subscriptions with filters | 🔑 Admin |
| `/info` | View a user's own subscription details | 🌐 Public |
| `/search` | Search by ID, email, user, plan, or service type | 🔑 Admin |
| `/edit` | Edit email, password, note, end date, or status | 🔑 Admin |

### 🔔 Notification Commands

| Command | Description | Access |
|---------|-------------|--------|
| `/check` | Manually run subscription expiry check | 🔑 Admin |
| `/remind` | Send immediate or scheduled reminder to a user | 🔑 Admin |
| `/announce` | Broadcast a message to all active subscribers | 🔑 Admin |

### 📊 Analytics Commands

| Command | Description | Access |
|---------|-------------|--------|
| `/stats` | Full database statistics dashboard | 🔑 Admin |
| `/chart` | Generate bar, donut, or timeline charts | 🔑 Admin |

### ⚙️ Management Commands

| Command | Description | Access |
|---------|-------------|--------|
| `/clearexpired` | Bulk delete all expired subscription records | 🔑 Admin |
| `/setlog` | Configure log channels | 🔑 Admin |
| `/enable` | Toggle any command on or off | 🔑 Admin |
| `/owner_add` | Add a user to the owner list | 🔑 Admin |
| `/owner_remove` | Remove a user from the owner list | 🔑 Admin |
| `/plan_add` / `/plan_remove` | Manage available subscription plans | 🔑 Admin |
| `/type_add` / `/type_remove` | Manage available service types | 🔑 Admin |
| `/help` | Paginated command reference | 🌐 Public |
| `/test` | Bot diagnostics (ping, DB, config validation) | 🔑 Admin |

---

## 📜 License & Copyright
- © 2025 Code Nexus. All rights reserved.