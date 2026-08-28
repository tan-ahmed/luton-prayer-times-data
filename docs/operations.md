# Operations

## Run locally

```bash
npm install

# Refresh all mosques
npm run refresh

# Refresh one or more mosques (comma-separated slugs)
npm run refresh -- --mosque=masjid-e-noor,zuhri-academy

# Same thing, but “one” as a convenience alias
npm run refresh:one -- --mosque=masjid-suffa-tul-islam
```

Optional local secrets: copy `.env.example` to `.env` (gitignored).

- `JINA_API_KEY` — WordPress 403 fallback via Jina Reader
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` — post a full refresh summary to Telegram after each run (see [`telegram-alerts.md`](telegram-alerts.md))

## GitHub Actions

Workflow: `.github/workflows/refresh.yml`

- **Schedule**: `0 0 * * *` (daily 00:00 UTC)
- **Manual**: `workflow_dispatch` with optional `mosque` input

### Manual per-mosque refresh

On GitHub:

1. Repo → Actions → “Refresh prayer time JSON”
2. “Run workflow”
3. Set `mosque` to a single slug (or comma-separated list)

The workflow will:

1. `npm ci`
2. Run `npm run refresh` (optionally filtered by `--mosque=...`) with secrets from the repo
3. Commit + push any changed JSON artifacts
4. Send a Telegram summary if bot credentials are configured

Repo secrets:

- `JINA_API_KEY` — Jina Reader API key for WordPress 403 fallback (anonymous relay is used if unset)
- `TELEGRAM_BOT_TOKEN` — from [@BotFather](https://t.me/BotFather); see [`telegram-alerts.md`](telegram-alerts.md)
- `TELEGRAM_CHAT_ID` — channel or group id the bot can post to

