# Luton Prayer Times — Data Repo (TypeScript)

This repository generates and hosts **static JSON** artifacts consumed by the Luton Prayer Times app.

## Output (what the app fetches)

- `mosque-index.json`
- `data/<slug>.json`

These match the paths used by `MOSQUE_DATA_BASE_URL` in the app.

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

