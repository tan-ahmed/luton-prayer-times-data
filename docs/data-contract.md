# Data contract

The mobile/web app expects these files relative to `MOSQUE_DATA_BASE_URL`:

## `mosque-index.json`

```json
{
  "mosques": [
    {
      "name": "Masjid-e-Noor",
      "slug": "masjid-e-noor",
      "dataFile": "data/masjid-e-noor.json",
      "hasData": true
    }
  ],
  "lastUpdated": "2026-04-29T14:56:55.601Z"
}
```

Notes:

- `dataFile` is a relative path used for convenience/diagnostics; the app typically fetches `data/<slug>.json` directly.
- `hasData` should reflect whether `timings.length > 0`.

## `data/<slug>.json`

```json
{
  "mosqueName": "Masjid-e-Noor",
  "timings": [
    {
      "day": "Wednesday",
      "date": "01-04-2026",
      "fajr": "06:00",
      "zuhr": "13:30",
      "asr": "18:00",
      "magrib": "19:40",
      "isha": "21:15"
    }
  ],
  "lastChecked": "2026-04-29T14:56:55.601Z",
  "isStale": false
}
```

Notes:

- `date` is **DD-MM-YYYY** (the frontend matches on this).
- Times are **HH:MM** (24h).
- `lastChecked`, `isStale`, and `staleReason` are optional metadata used for transparency and month rollovers.

