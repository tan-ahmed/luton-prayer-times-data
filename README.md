# Luton Prayer Times — Data

Static JSON prayer-time artifacts for the Luton Prayer Times app (and any client that can fetch GitHub Raw).

Generation / scraping lives in **[luton-prayer-times-scraper](https://github.com/tan-ahmed/luton-prayer-times-scraper)** (daily Actions + local `npm run refresh`). This repo only holds the published files.

## Fetch URLs

Base URL:

```
https://raw.githubusercontent.com/tan-ahmed/luton-prayer-times-data/main
```

| File | Description |
|------|-------------|
| `mosque-index.json` | Mosque list + `hasData` |
| `soon-today.json` | Today's jamah only for every mosque that has today's date (Soon tab) |
| `data/<slug>.json` | Jamah times; optional `begins` + `sunrise` when the source provides them |

**Types, field meanings, example fetch code, and begins coverage:** see [`docs/data-contract.md`](docs/data-contract.md).

## Refreshing data

Do not edit JSON by hand unless fixing an emergency. Run the scraper:

```bash
# from a sibling checkout of luton-prayer-times-scraper
npm run refresh
# or
npm run refresh -- --mosque=masjid-e-noor
```

Or trigger **Actions → Refresh prayer time JSON** on the [scraper repo](https://github.com/tan-ahmed/luton-prayer-times-scraper/actions).
