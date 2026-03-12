# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-03-12

### Added
- **Custom emoji palette** — 36 Lucide icons uploaded as Discord application emojis, stored in `setting.json` under `emojie` key.
- **Components V2 (CV2) support** — All 12 slash commands migrated from embed-based responses to the new discord.js Components V2 system (`ContainerBuilder`, `TextDisplayBuilder`, `SeparatorBuilder`, `MessageFlags.IsComponentsV2`).
- **Utility icon set** — 16 new utility icons: `success`, `error`, `warning`, `clock`, `heart`, `rocket`, `wrench`, `key`, `search`, `home`, `mail`, `mail_off`, `arrow_left`, `arrow_right`, `refresh`, `clipboard`.
- **Command icon set** — 20 command-specific icons for every slash command.
- `CHANGELOG.md`, `README.md` (updated), `SECURITY.md` documentation files.
- `.gitignore` to exclude `node_modules/`, `config.json`, and `setting.json`.

### Changed
- Emoji palette moved from per-command fields to a shared top-level `emojie: {}` object in `setting.json`.
- All command files now reference `settings.emojie.KEY` instead of inline Unicode emoji.
- Button navigation (`Prev`, `Next`, `Home`, `Refresh`) switched from `.setLabel()` with emoji text to `.setEmoji()` + `.setLabel()` for proper Discord rendering.
- Error handlers in all command files use optional chaining (`settings?.emojie?.error ?? "❌"`) to prevent crash when `setting.json` fails to load.

### Fixed
- `setting.json` UTF-8 BOM removed — was causing `Unexpected token` JSON parse error on every bot start.
- Ternary expressions in `subscribe.js`, `unsubscribe.js`, and `enable.js` that had single-quoted strings containing `${...}` template syntax (wouldn't interpolate).
- Custom emoji codes appearing as raw text in button labels instead of rendering as icons.

---

## [1.0.0] - 2025-12-01

### Added
- Initial release of the Discord Subscription Bot.
- `/subscribe` — Create a new user subscription with custom ID, type, plan, duration, and email.
- `/unsubscribe` — Cancel a subscription with DM notification to the user.
- `/subscriptions` — Paginated list of all subscriptions with Refresh/Prev/Next buttons.
- `/info` — View a user's active subscription details with filtering and search.
- `/help` — Paginated command reference with category navigation.
- `/enable` — Toggle any slash command on or off.
- `/owner_add` / `/owner_remove` — Manage bot owner list.
- `/plan_add` / `/plan_remove` — Manage available subscription plans.
- `/type_add` / `/type_remove` — Manage available service types.
- `/setlog` *(premium)* — Configure the log channel.
- `/check` *(premium)* — Manually trigger subscription expiry check.
- `/clearexpired` *(premium)* — Bulk delete expired subscription records.
- `/remind` *(premium)* — Custom pre-expiration reminder configuration.
- `/renew` *(premium)* — Subscription renewal with premium upsell embed.
- `/stats` *(premium)* — Subscription statistics dashboard.
- `/chart` *(premium)* — Subscription growth chart.
- `/announce` *(premium)* — Announce to all active subscribers.
- Automatic cron-based subscription expiry checker (daily + every 12 hours).
- Multi-stage DM notifications: 7, 3, and 1 day before expiration.
- MongoDB integration via Mongoose for persistent subscription storage.
- `config.json` for sensitive credentials and `setting.json` for bot behaviour.

---

## Links
- [GitHub Repository](https://github.com/aymenelouadi/discord-subscription-bot)
- [Support Server](https://discord.gg/mFEehCPKEW)
