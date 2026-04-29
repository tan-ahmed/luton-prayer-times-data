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
2. Run `npm run refresh` (optionally filtered by `--mosque=...`)
3. Commit + push any changed JSON artifacts

