# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-03-13

### Added
- **`/search`** — Search subscriptions by `customId` (exact), `userId` (exact), or `email` / `planName` / `serviceType` (regex). Returns up to 20 results with status emoji and expiry timestamp per row.
- **`/edit`** — Edit `email`, `password`, `note`, `endDate`, or `status` on any existing subscription without deleting it. Logs old→new change diff to the configured log channel. Handles duplicate email (MongoDB code 11000) with a clear error message.
- **`/test`** — Bot diagnostics command (admin-only, ephemeral): WS ping + response latency, MongoDB connection state / host / DB / document count, `setting.json` and `config.json` validity checks (key presence + counts), Node.js uptime and RSS memory.
- **`/chart` — Donut chart** (`type: donut`) — new visual style for status breakdown: segmented donut with glow, center total counter, and three legend cards showing count + percentage per status.
- **`/remind` — Scheduling support** — new `action` option (`send_now` / `schedule` / `both`) and `schedule_days` integer (1–90). Scheduled reminders are stored in a `scheduledReminders[]` array on the subscription document and delivered automatically by cron.
- **`checkScheduledReminders()`** in `systems/check_sub.js` — runs on a dedicated hourly cron (`0 * * * *`) and alongside every existing `checkAllSubscriptions()` call. Sends CV2 DMs for each due reminder and marks them `sent: true`.
- **`scheduledReminders` schema field** — added to `systems/shema_user_sub.js`: array of `{ sendAt: Date, message: String, sent: Boolean }`.
- **`status` enum** — `systems/shema_user_sub.js` `status` field now has `enum: ['active', 'expired', 'cancelled']` for stricter validation.

### Fixed
- **`d3` ESM crash** — downgraded `d3` from `^7.9.0` to `^6.7.0` (CommonJS). d3 v7 is ESM-only and caused `ERR_REQUIRE_ESM` on every `/chart` invocation in a CJS project.
- **`setting.json` typo** — `announce` description corrected from `"Send annonce for all subscriptions"` to `"Send announcement to all active subscribers"`.

### Changed
- `/chart` command now offers **5 chart choices**: status bar, status donut (new), plans bar, services bar, and timeline.
- `systems/chart_renderer.js` exports `renderDonut` alongside the existing `renderStatus`, `renderBar`, `renderTimeline`.

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
