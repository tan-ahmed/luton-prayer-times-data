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

## WordPress source blocked (HTTP 403) from GitHub Actions

**Example:** `kokni-masjid` (as of July 2026). Daily refresh keeps June timings and sets:

- `isStale: true`
- `staleReason: "Source blocked (HTTP 403)"`

**Cause:** SiteGround WAF on the mosque host blocks GitHub Actions datacenter IPs. The same `wpUrl` returns 200 from a residential / browser IP. Retrying the workflow or a local one-off refresh does not fix the scheduled job.

**Not viable for a lasting fix:**

- Local `npm run refresh -- --mosque=kokni-masjid` — gets current data once, Actions still 403 next day
- Asking the mosque / host to allowlist — unlikely

**Options to revisit:**

1. **Jina Reader relay (preferred if we implement)** — on 403 in `fetchWordPressTimings`, retry via `https://r.jina.ai/${wpUrl}` with header `x-respond-with: text`, then `JSON.parse` the body and run existing `isValidWordPressPayload` / `transformWordPressData`. Verified July 2026: returns raw July month JSON (31 days). Free anonymous limit ~20 req/min (fine for one fallback/day). Relies on a third party; if the relay fails, keep today’s preserve-stale behaviour.
2. **Own proxy** — Cloudflare Worker or Google Apps Script that fetches the URL and returns the body. More control; must confirm SiteGround allows that egress IP.
3. **Self-hosted Actions runner** — residential IP; fixes the class of “datacenter blocked” failures for any mosque.
4. **Paid residential proxy** — works, hard to justify for one request/day.

Kokni is not on InspireFM as an alternate source. Same SiteGround-style block may hit other `wpUrl` mosques later; a relay fallback in `fetchWordPressTimings` would cover all of them.

