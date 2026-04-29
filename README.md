# Luton Prayer Times — Data Repo (TypeScript)

This repository generates and hosts **static JSON** artifacts consumed by the Luton Prayer Times app.

## Output (what the app fetches)

- `mosque-index.json`
- `data/<slug>.json`

These match the paths used by `MOSQUE_DATA_BASE_URL` in the app.

## Local usage

```bash
npm install

# Refresh all mosques
npm run refresh

# Refresh one or more mosques
npm run refresh -- --mosque=masjid-e-noor,zuhri-academy
```

## GitHub Actions

- Daily scheduled refresh
- Manual refresh with optional `mosque` input (comma-separated slugs)

