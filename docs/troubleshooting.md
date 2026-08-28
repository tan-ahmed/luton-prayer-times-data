# Troubleshooting

## GitHub Action fails with “Please tell me who you are”

Cause: the runner tried to `git commit` without an author identity.

Fix: ensure the workflow sets `user.name` and `user.email` before committing (already done in `refresh.yml`).

## “npm warn Unknown cli config --mosque”

Cause: passing `--mosque=...` without the `--` separator means npm may treat it as an npm config flag.

Fix:

```bash
npm run refresh -- --mosque=masjid-e-noor
```

## Puppeteer issues on GitHub Actions

This repo uses Puppeteer for a few mosques with client-rendered / WAF-protected sites.

If you hit Chromium dependency errors, the usual approach is:

- switch to `puppeteer` (bundled Chromium) rather than `puppeteer-core` (already using `puppeteer`)
- ensure the runner is `ubuntu-latest` (it is)

## A mosque has no data on the 1st–7th of the month

Behavior: if the scraper finds no new timings early in the month and an old `data/<slug>.json` exists, it preserves the previous month and sets:

- `isStale: true`
- `staleReason: "No new data available for current month"`

After day 7, empty results will be saved as empty `timings` (so the app can show “No Data Available”).

## Google Sheet returns an old month (no current-month rows)

**Example:** `farley-hill-masjid`, `jamia-al-akbaria`. Sheets that still have Feb/Mar data used to win over InspireFM and were saved with `isStale: false`.

**What we do:** accept Google Sheet CSV only when it covers the **current calendar month**. Otherwise log a warning and fall through to other sources (InspireFM, etc.). If every source still returns only old months, the file is saved with `isStale: true` and `staleReason: "No new data available for current month"`.

The app also treats “no timing row for the selected day” as stale in the UI, even if `isStale` was missing from the JSON.

**Example:** `kokni-masjid`. SiteGround/Cloudflare WAF on the mosque host blocks GitHub Actions datacenter IPs. The same `wpUrl` returns 200 from a residential IP.

**What we do:** on HTTP 403, `fetchWordPressTimings` retries via Jina Reader (`https://r.jina.ai/${wpUrl}` with `x-respond-with: text`), then the existing `isValidWordPressPayload` / `transformWordPressData` path. Uses `JINA_API_KEY` when set (local `.env` or Actions secret); otherwise anonymous Jina (~20 req/min). If the relay also fails, keep today’s preserve-stale behaviour (`isStale` + `staleReason: "Source blocked (HTTP 403)"`).

This covers every `wpUrl` mosque, not only Kokni. Kokni is not on InspireFM as an alternate source.

