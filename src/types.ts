export interface MosqueConfig {
  name: string;
  slug: string;
  /** InspireFM HTML page URL */
  url?: string;
  /** WordPress JSON endpoint (dpt/v1/prayertime?filter=month) */
  wpUrl?: string;
  /** MasjidBox API endpoint */
  masjidBoxApi?: string;
  /** Mawaqit HTML page */
  mawaqitUrl?: string;
  /** Supabase REST endpoint */
  supabaseUrl?: string;
  /** Custom website used by bespoke scrapers */
  websiteUrl?: string;
  /** Google Sheet CSV export URL */
  googleSheetCsvUrl?: string;
}

/** Jamah prayer keys used by bespoke HTML/CSV transforms. */
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
