# Data contract

This repo publishes **static JSON** (not a live HTTP API). Treat GitHub Raw as the base URL.

**Base URL (this repo):**

```
https://raw.githubusercontent.com/tan-ahmed/luton-prayer-times-data/main
```

Consumers typically set that as `MOSQUE_DATA_BASE_URL` and fetch:

| Path | Purpose |
|------|---------|
| `/mosque-index.json` | List of mosques + whether each has timings |
| `/near-today.json` | Today's jamah for every mosque (Near tab; one request) |
| `/data/<slug>.json` | Per-mosque prayer times for the current scrape |

Source of truth for TypeScript shapes: [`src/types.ts`](../src/types.ts).

---

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

---

## `near-today.json`

Derived at refresh time from `data/<slug>.json`. One HTTP request for the app's **Near** tab (town-wide jamah for the next prayer).

```json
{
  "date": "25-10-2026",
  "lastUpdated": "2026-10-25T21:31:36.525Z",
  "mosques": [
    {
      "name": "Luton Central Masjid",
      "slug": "luton-central-masjid",
      "jamah": {
        "fajr": "06:45",
        "zuhr": "14:00",
        "asr": "16:30",
        "magrib": "17:53",
        "isha": "20:00"
      }
    }
  ],
  "tomorrow": {
    "date": "26-10-2026",
    "mosques": [
      {
        "name": "Luton Central Masjid",
        "slug": "luton-central-masjid",
        "fajr": "06:45"
      }
    ]
  }
}
```

Notes:

- `date` is `DD-MM-YYYY` for the calendar day used when generating the file.
- Only mosques with a timing row for that date are included in `mosques`.
- Jamah only (no `begins` / `sunrise`). Multi-token fields (e.g. Zuhr) keep the first token.
- Mosques are sorted A–Z by name. The app groups by jamah clock for the upcoming prayer.
- `tomorrow` is optional: next calendar day's Fajr only. The Near tab uses it after the last Isha jamah today (subtitle: “Tomorrow's Fajr jama'ah…”).
- Rebuild without scraping: `npm run generate:near`.

---

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
      "isha": "21:15",
      "sunrise": "06:35",
      "begins": {
        "fajr": "04:45",
        "zuhr": "13:10",
        "asr": "17:20",
        "magrib": "19:40",
        "isha": "21:00",
        "asrMithl1": "17:20",
        "asrMithl2": "17:55"
      }
    }
  ],
  "lastChecked": "2026-04-29T14:56:55.601Z",
  "isStale": false
}
```

### Field meanings

| Field | Meaning |
|-------|---------|
| `date` | **DD-MM-YYYY** (match on this) |
| Top-level `fajr` / `zuhr` / `asr` / `magrib` / `isha` | **Jamah** (congregation) times, **HH:MM** 24h |
| `sunrise` | Optional sunrise, **HH:MM** |
| `begins` | Optional start-of-prayer window times (same keys + optional Asr mithls) |
| `begins.asr` | Default Asr begin: mithl 2 when the source provides both (Hanafi) |
| `begins.asrMithl1` / `begins.asrMithl2` | Present when the source distinguishes Asr opinions (WordPress / Supabase) |
| `lastChecked` / `isStale` / `staleReason` | Optional scrape metadata |

`begins` / `sunrise` are **omitted** (not empty strings) when the upstream source does not provide them. Always treat them as optional.

### Sources that populate `begins`

| Source key in `mosque-urls.ts` | Begins mapping |
|--------------------------------|----------------|
| `wpUrl` | `*_begins` + `asr_mithl_*` + `sunrise` |
| `supabaseUrl` | Same DPT field names as WordPress |
| `masjidBoxApi` | Top-level timetable athan → `begins`; `iqamah` → jamah; + `sunrise` (single Asr begin only) |

InspireFM HTML (`url`), Google Sheets, Mawaqit, and bespoke `websiteUrl` scrapers currently emit **jamah only**.

---

## Mosques without `begins` (current published data)

Use this when deciding whether to fall back to another calendar (e.g. Aladhan) for start times.

| Slug | Mosque | Why no `begins` yet |
|------|--------|---------------------|
| `bait-ul-abrar-jamia-masjid` | Bait Ul Abrar Jamia Masjid | InspireFM / website scraper (jamah only) |
| `faizan-e-mushkil-kusha` | Faizan-e-Mushkil Kusha | InspireFM / website scraper (jamah only) |
| `farley-hill-masjid` | Farley Hill Masjid | Google Sheet CSV (jamah only) |
| `jamia-islamia-ghousia-trust` | Jamia Islamia Ghousia Trust | InspireFM only (jamah only) |
| `jamia-al-akbaria` | Jamia Al-Akbaria | Google Sheet CSV (jamah only) |
| `madinah-masjid` | Madinah Masjid | Website scraper (jamah only) |
| `luton-central-masjid` | Luton Central Masjid | Falls through to InspireFM; `masjidBoxApi` is a page URL, not the JSON API |
| `masjid-al-huda` | Masjid Al-Huda | InspireFM only (jamah only) |
| `masjid-as-sunnah` | Masjid As-Sunnah | Has `wpUrl` (would support begins) but scrape currently invalid/stale — file still jamah-only |
| `masjid-irshad` | Masjid Irshad | Website scraper (jamah only) |
| `masjid-e-ali` | Masjid-e-Ali | Website scraper (jamah only) |
| `yusuf-hall` | Yusuf Hall | InspireFM only (jamah only) |
| `turkish-community-assoc` | Turkish Community Assoc | InspireFM only (jamah only) |
| `luton-islamic-centre` | Luton Islamic Centre | Mawaqit (jamah only so far) |
| `lewsey-community-centre` | Lewsey Community Centre | No timings (`hasData: false`) |

Re-check after refreshes: a mosque gains `begins` once its successful source is one of `wpUrl` / `supabaseUrl` / working `masjidBoxApi`.

---

## TypeScript types (copy/paste)

Keep in sync with [`src/types.ts`](../src/types.ts).

```ts
export type PrayerKey = "fajr" | "zuhr" | "asr" | "magrib" | "isha";

export interface PrayerBeginsTiming {
  fajr?: string;
  zuhr?: string;
  /** Default begins time for Asr (mithl 2 where the source provides both). */
  asr?: string;
  magrib?: string;
  isha?: string;
  /** Asr per shadow-length opinion, when the source distinguishes them. */
  asrMithl1?: string;
  asrMithl2?: string;
}

export interface PrayerTiming {
  day: string;
  /** DD-MM-YYYY */
  date: string;
  /** Jamah */
  fajr: string;
  zuhr: string;
  asr: string;
  magrib: string;
  isha: string;
  sunrise?: string;
  begins?: PrayerBeginsTiming;
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

export interface NearTodayJamah {
  fajr: string;
  zuhr: string;
  asr: string;
  magrib: string;
  isha: string;
}

export interface NearTodayMosque {
  name: string;
  slug: string;
  jamah: NearTodayJamah;
}

export interface NearTomorrowFajrMosque {
  name: string;
  slug: string;
  fajr: string;
}

export interface NearTomorrowFajr {
  /** DD-MM-YYYY */
  date: string;
  mosques: NearTomorrowFajrMosque[];
}

export interface NearToday {
  /** DD-MM-YYYY */
  date: string;
  lastUpdated: string;
  mosques: NearTodayMosque[];
  tomorrow?: NearTomorrowFajr;
}
```

---

## Example: plug into another app

```ts
const BASE =
  process.env.MOSQUE_DATA_BASE_URL ??
  "https://raw.githubusercontent.com/tan-ahmed/luton-prayer-times-data/main";

const index = (await fetch(`${BASE}/mosque-index.json`).then((r) => r.json())) as MosqueIndex;

const entry = index.mosques.find((m) => m.slug === "masjid-bilal" && m.hasData);
if (!entry) throw new Error("mosque missing");

const data = (await fetch(`${BASE}/${entry.dataFile}`).then((r) => r.json())) as MosqueData;

// Match today's date as DD-MM-YYYY
const today = new Date();
const dmy = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
const day = data.timings.find((t) => t.date === dmy);

if (day) {
  console.log("jamah", day.fajr, day.zuhr, day.asr, day.magrib, day.isha);
  console.log("begins", day.begins); // may be undefined — fall back if needed
  console.log("sunrise", day.sunrise);
}

// Town-wide today's jamah (Near tab) — one fetch
const near = (await fetch(`${BASE}/near-today.json`).then((r) => r.json())) as NearToday;
console.log(near.date, near.mosques.length);
```

Suggested consumer rule:

1. Prefer mosque `begins` when present.
2. Otherwise fall back to a generic calendar (e.g. Aladhan) for start times, and still use top-level fields for jamah.
3. For a town-wide jamah list for today, prefer `near-today.json` over N× `data/<slug>.json`.
