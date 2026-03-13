# Security Policy

## Supported Versions

Only the latest release of this project receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | ✅ Active support  |
| 1.1.x   | ❌ No longer supported |
| 1.0.x   | ❌ No longer supported |

---

## Reporting a Vulnerability

If you discover a security vulnerability in this project, **please do not open a public GitHub issue**.

### How to report

1. **Discord** — Join the [support server](https://discord.gg/mFEehCPKEW) and open a private ticket with the `Security` tag.
2. **Email** — Contact the maintainer directly through the support server if you prefer email.

Please include:
- A clear description of the vulnerability.
- Steps to reproduce the issue.
- Potential impact or attack scenario.
- Any suggested fix, if available.

You can expect an acknowledgment within **48 hours** and a resolution timeline within **7 days** for critical issues.

---

## Sensitive Files

The following files contain sensitive credentials and **must never be committed to version control**:

| File | Contents |
|------|----------|
| `config.json` | Discord bot token, Client ID, MongoDB URI, Owner IDs |

`config.json` is excluded from this repository via `.gitignore`. Use `config.json.example` as a template.

---

## Security Best Practices for Deployment

- **Never share** your `DISCORD_TOKEN` or `MONGO_URI` publicly.
- Restrict bot permissions to the minimum required — avoid `Administrator`.
- Keep `node_modules` and dependencies up to date (`npm audit`).
- Run the bot with a non-root system user on VPS/server deployments.
- Rotate your Discord bot token immediately if it is ever exposed.

---

## Acknowledgements

We appreciate responsible disclosure and will credit reporters in the changelog (with permission).
