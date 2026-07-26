# Luton Prayer Times — Data Repo (TypeScript)

This repository generates and hosts **static JSON** artifacts consumed by the Luton Prayer Times app (and any other client that can fetch GitHub Raw).

## Output (what clients fetch)

Base URL:

```
https://raw.githubusercontent.com/tan-ahmed/luton-prayer-times-data/main
```

| File | Description |
|------|-------------|
| `mosque-index.json` | Mosque list + `hasData` |
| `data/<slug>.json` | Jamah times; optional `begins` + `sunrise` when the source provides them |

**Types, field meanings, example fetch code, and which mosques still lack `begins`:** see [`docs/data-contract.md`](docs/data-contract.md).

## Quick start

## Local usage

```bash
npm install

# Refresh all mosques
npm run refresh

# Refresh one or more mosques
npm run refresh -- --mosque=masjid-e-noor,zuhri-academy

# Refresh exactly one mosque (same script; just pass one slug)
npm run refresh:one -- --mosque=masjid-suffa-tul-islam
```

## GitHub Actions

- **Daily scheduled refresh**: runs at **00:00 UTC** and commits any changes.
- **Manual refresh**: Actions → “Refresh prayer time JSON” → Run workflow, with optional `mosque` input (comma-separated slugs).

## Docs

See [`docs/`](docs/) for architecture, data contract, and workflow details.

