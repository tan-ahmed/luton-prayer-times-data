# Telegram alerts (planned)

Future work: notify a Telegram channel when a refresh leaves mosques **failed** or **stale**.

Status: **not implemented** — revisit when ready to wire Bot API + GitHub secrets.

## Why

Daily Actions refresh currently logs warnings and may preserve stale JSON (`isStale: true`), but nothing alerts the channel. Failures are easy to miss until the app shows bad data.

## What to notify

After each `npm run refresh` / Actions run, send **one** message if any mosque ends as:

| Status | Meaning |
| --- | --- |
| `failed` | No usable timings written (sources failed and preserve did not keep data, or an unexpected error) |
| `stale` | Existing `data/<slug>.json` preserved with `isStale: true` (include `staleReason`) |

Do **not** notify when:

- scrape succeeds with fresh timings
- existing data is preserved but still covers the current month (`isStale: false`)

## Suggested shape

1. **`scrapePrayerTimings`** returns a `ScrapeOutcome` (`ok` | `stale` | `failed`) instead of `void`.
2. Adjust **`tryPreserveExistingData`** so the caller knows preserve vs stale without re-reading the file.
3. **`runScraper`** collects outcomes, runs `generateMosqueIndex`, then notifies if any `failed` / `stale`.
4. New **`src/telegram.ts`**: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`; skip quietly if unset; plain-text list; log Telegram errors and do **not** fail the refresh job.
5. **`.github/workflows/refresh.yml`**: pass the two secrets as `env` on the Refresh JSON step.
6. Document secrets + local testing in [`operations.md`](operations.md) once implemented.

Example message:

```
Prayer times refresh issues (2)

- Kokni Masjid (kokni-masjid) — failed: Source timed out
- Yusuf Hall (yusuf-hall) — stale: Source blocked (HTTP 403)
```

## Secrets (when implementing)

Repo secrets:

- `TELEGRAM_BOT_TOKEN` — from [@BotFather](https://t.me/BotFather)
- `TELEGRAM_CHAT_ID` — channel/chat id (bot must be able to post there)

Local test:

```bash
export TELEGRAM_BOT_TOKEN=...
export TELEGRAM_CHAT_ID=...
npm run refresh
```

## Job behaviour

Keep current Actions behaviour: mosque scrape issues and Telegram send failures should **not** fail the workflow; commit/push of any JSON changes still runs.
