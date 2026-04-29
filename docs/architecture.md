# Architecture

## Goal

Serve prayer times to the mobile/web app using **static JSON** (cheap, fast, reliable).

The app fetches:

- `mosque-index.json`
- `data/<slug>.json`

from a base URL (typically GitHub Raw).

## High-level flow

1. **Scrape** upstream sources per mosque (InspireFM HTML, WordPress JSON, MasjidBox API, Mawaqit HTML, Supabase REST, and a few custom websites).
2. **Normalize** everything into a stable schema (`PrayerTiming[]`).
3. **Write artifacts** into this repo:
   - `data/<slug>.json`
   - `mosque-index.json` (computed from `data/`)
4. **Publish** by committing to `main`, which makes the JSON available at:
   - `https://raw.githubusercontent.com/<owner>/<repo>/main/mosque-index.json`
   - `https://raw.githubusercontent.com/<owner>/<repo>/main/data/<slug>.json`

## Code layout

- `src/mosque-urls.ts`: typed registry of mosques + their upstream endpoints
- `src/types.ts`: shared types (kept aligned with the frontend expectations)
- `src/util.ts`: HTTP client + transformers/parsers for each source type
- `src/scraper.ts`: orchestrates scraping in batches; supports `--mosque=...` filtering
- `scripts/refresh-cache.ts`: runnable entrypoint used by GitHub Actions and local runs

## Why static JSON (instead of a live API)

- No server to keep running
- CDN-backed reads (GitHub Raw / Cloudflare)
- The app already expects static JSON paths, so swapping providers is just changing the base URL

