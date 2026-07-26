# Architecture

## Goal

Serve prayer times to the mobile/web app using **static JSON** (cheap, fast, reliable).

The app fetches:

- `mosque-index.json`
- `data/<slug>.json`

from a base URL (typically GitHub Raw).

## High-level flow

1. **Scrape** upstream sources per mosque (InspireFM HTML, WordPress JSON, MasjidBox API, Mawaqit HTML, Supabase REST, and a few custom websites).
2. **Normalize** everything into a stable schema (`PrayerTiming[]`). Top-level times are jamah; optional `begins` / `sunrise` are filled when the upstream source provides them (WordPress `wpUrl`, MasjidBox `masjidBoxApi`, Supabase `supabaseUrl`).
3. **Write artifacts** into this repo:
   - `data/<slug>.json`
   - `mosque-index.json` (computed from `data/`)
4. **Publish** by committing to `main`, which makes the JSON available at:
   - `https://raw.githubusercontent.com/tan-ahmed/luton-prayer-times-data/main/mosque-index.json`
   - `https://raw.githubusercontent.com/tan-ahmed/luton-prayer-times-data/main/data/<slug>.json`

Consumer-facing schema, TypeScript types, and begins coverage: [`data-contract.md`](data-contract.md).

## Code layout

- `src/mosque-urls.ts`: typed registry of mosques + their upstream endpoints
- `src/types.ts`: shared types (source of truth for the published JSON contract)
- `src/util.ts`: HTTP client + transformers/parsers for each source type
- `src/scraper.ts`: orchestrates scraping in batches; supports `--mosque=...` filtering
- `scripts/refresh-cache.ts`: runnable entrypoint used by GitHub Actions and local runs

## Why static JSON (instead of a live API)

- No server to keep running
- CDN-backed reads (GitHub Raw / Cloudflare)
- The app already expects static JSON paths, so swapping providers is just changing the base URL

