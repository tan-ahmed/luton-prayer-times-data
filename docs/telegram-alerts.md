# Telegram refresh summary

After each `npm run refresh` / Actions run, the scraper sends **one Telegram message** listing every mosque scraped in that run: **OK**, **STALE**, and **FAILED** (with reasons).

Status: **implemented** in [`src/telegram.ts`](../src/telegram.ts).

## Why

Daily Actions refresh logs warnings and may preserve stale JSON (`isStale: true`), but nothing surfaced that in one place. The Telegram dump makes it easy to see what worked and what needs attention.

## Message format

Plain-language summary with a simple table. Example:

```
🕌 Luton Prayer Times
Checked: Friday, 28 August 2026, 9:23 pm

Summary: 26 up to date · 1 showing old times · 2 with no data

Mosque                     Status
──────────────────────────────────
Al Hira Centre             ✅
Kokni Masjid               ✅
Jalalabad Jamia Masjid     ❌
...

⚠️ Showing old times (1)
The app may still show last month's prayer times for these mosques.
• Yusuf Hall — The mosque website blocked our automatic check

❌ No prayer times (2)
These mosques have nothing to show in the app right now.
• Jalalabad Jamia Masjid — The website took too long to respond

✅ = fresh times loaded · ⚠️ = kept older saved times · ❌ = nothing available
```

If everything is fine, the message says **All 29 mosques are up to date** and only shows the table.

Empty problem sections are omitted. Messages longer than 4096 characters are split automatically.

## Status meanings

| What you see | Meaning |
| --- | --- |
| ✅ Up to date | Fresh prayer times were loaded successfully |
| ⚠️ Old times | We could not refresh today, so last month's saved times are still being used |
| ❌ No data | No prayer times available for this mosque right now |

## Setup (one-time)

### 1. Create a bot

1. In Telegram, message [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts.
3. Copy the bot token (`123456789:ABC...`).

### 2. Create a channel or group

1. Create a private channel (or group) for refresh summaries.
2. Add your bot as an **admin** with permission to **post messages**.

### 3. Get the chat id

1. Post any message in the channel.
2. Open `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser.
3. Find `channel_post.chat.id` in the JSON (channels usually look like `-100...`).

Alternatively, forward a channel post to [@userinfobot](https://t.me/userinfobot) or similar.

### 4. Local `.env`

Copy [`.env.example`](../.env.example) to `.env` (gitignored) and set:

```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### 5. GitHub Actions secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Same names as in `.env`. The workflow passes them on the Refresh JSON step (see [`.github/workflows/refresh.yml`](../.github/workflows/refresh.yml)).

## Local test

```bash
export TELEGRAM_BOT_TOKEN=...
export TELEGRAM_CHAT_ID=...
npm run refresh -- --mosque=kokni-masjid
```

Or put the vars in `.env` and run `npm run refresh`.

## Job behaviour

- If `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` is unset, the scraper logs once and skips Telegram.
- Telegram send failures are logged and do **not** fail the refresh job or block commit/push.
