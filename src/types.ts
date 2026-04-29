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

