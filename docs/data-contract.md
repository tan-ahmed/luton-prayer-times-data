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

## TypeScript types (copy/paste)

Source of truth: `src/types.ts`.

```ts
export interface PrayerTiming {
  day: string;
  /** DD-MM-YYYY */
  date: string;
  fajr: string;
  zuhr: string;
  asr: string;
  magrib: string;
  isha: string;
}

export interface MosqueData {
  mosqueName: string;
  timings: PrayerTiming[];
  lastChecked?: string;
  isStale?: boolean;
  staleReason?: string;
}

export interface MosqueIndexEntry {
  name: string;
  slug: string;
  dataFile: string;
  hasData: boolean;
  /** Reserved for future expansion; kept for compatibility with existing schema. */
  jummahSchedule?: unknown;
}

export interface MosqueIndex {
  mosques: MosqueIndexEntry[];
  lastUpdated: string;
}
```

## Example usage

```ts
const base = process.env.MOSQUE_DATA_BASE_URL!;

const index = (await fetch(`${base}/mosque-index.json`).then((r) => r.json())) as MosqueIndex;
const first = index.mosques.find((m) => m.hasData);

if (first) {
  const data = (await fetch(`${base}/${first.dataFile}`).then((r) => r.json())) as MosqueData;
  console.log(data.mosqueName, data.timings[0]);
}
```

