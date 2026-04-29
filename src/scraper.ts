import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { mosqueUrls } from "./mosque-urls";
import type { MosqueConfig, MosqueData, PrayerTiming } from "./types";
import {
  addMonthToMosqueConfigs,
  ensureDataDirectory,
  generateMosqueIndex,
  httpClient,
  saveToFile,
  transformBaitUlAbrarWebsiteData,
  transformBuryParkWebsiteData,
  transformFaizanEMushkilKushaWebsiteData,
  transformGoogleSheetPrayerTimesCsv,
  transformInspireFMData,
  transformMadinahMasjidWebsiteData,
  transformMasjidBoxApiData,
  transformMasjidEAliWebsiteData,
  transformMasjidIrshadWebsiteData,
  transformMawaqitData,
  transformSupabaseData,
  transformWordPressData,
} from "./util";

export interface ScrapeOptions {
  /** Repo root (where mosque-index.json lives) */
  repoRoot: string;
  /** Specific mosque slugs to scrape; empty means all */
  slugs?: string[];
}

function parseCliArguments(argv: string[]): string[] | null {
  const mosqueArg = argv.find((arg) => arg.startsWith("--mosque="));
  if (!mosqueArg) return null;
  const slugs = mosqueArg
    .replace("--mosque=", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return slugs.length > 0 ? slugs : null;
}

function constructSupabaseUrlForCurrentMonth(supabaseUrl: string, yearOverride?: number): string {
  const now = new Date();
  const year =
    yearOverride !== undefined && Number.isFinite(yearOverride) ? yearOverride : now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const firstDayNextMonth = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-01`;

  const urlWithoutDate = supabaseUrl.split("&d_date=")[0]?.split("?d_date=")[0] ?? supabaseUrl;
  const separator = urlWithoutDate.includes("?") ? "&" : "?";
  return `${urlWithoutDate}${separator}d_date=gte.${firstDay}&d_date=lt.${firstDayNextMonth}`;
}

async function fetchSupabaseMonthDataWithYearFallback(supabaseUrl: string, slug: string): Promise<unknown[]> {
  const now = new Date();
  const currentYear = now.getFullYear();

  let monthUrl = constructSupabaseUrlForCurrentMonth(supabaseUrl);
  let monthResponse = await httpClient.get(monthUrl);
  let monthData = Array.isArray(monthResponse.data) ? monthResponse.data : [];

  if (monthData.length === 0 && currentYear > 1900) {
    const prevYear = currentYear - 1;
    monthUrl = constructSupabaseUrlForCurrentMonth(supabaseUrl, prevYear);
    monthResponse = await httpClient.get(monthUrl);
    monthData = Array.isArray(monthResponse.data) ? monthResponse.data : [];
    if (monthData.length > 0) {
      console.log(
        `[Supabase] No rows for ${currentYear} for ${slug}; using ${prevYear} month data (transform rewrites year).`,
      );
    }
  }

  return monthData;
}

/** Mosques that use Google Sheet CSV (Luton Prayer timetables). */
const GOOGLE_SHEET_MOSQUES: Record<string, string> = {
  "farley-hill-masjid": "Farley Hill",
  "jamia-al-akbaria": "Jamia Al-Akbaria",
  "luton-central-masjid": "Luton Central",
};

/** Source priority: WordPress first (full month), then InspireFM, then masjidBox, Mawaqit, Supabase. */
const SOURCE_ORDER = ["wpUrl", "url", "masjidBoxApi", "mawaqitUrl", "supabaseUrl"] as const;

const WP_API_TIMEOUT_MS = 25_000;

function hasSource(config: MosqueConfig, source: (typeof SOURCE_ORDER)[number]): boolean {
  return Boolean(config[source]);
}

async function trySource(
  source: (typeof SOURCE_ORDER)[number],
  config: MosqueConfig,
  timings: PrayerTiming[],
  mosqueNameRef: { current: string },
): Promise<boolean> {
  switch (source) {
    case "wpUrl": {
      if (!config.wpUrl) return false;
      const wpResponse = await httpClient.get(config.wpUrl, { timeout: WP_API_TIMEOUT_MS });
      const wpTimings = transformWordPressData(wpResponse.data);
      if (wpTimings.length > 0) timings.push(...wpTimings);
      return wpTimings.length > 0;
    }
    case "url": {
      if (!config.url) return false;
      const response = await httpClient.get(config.url);
      const inspire = transformInspireFMData(String(response.data));
      if (inspire.mosqueName) mosqueNameRef.current = inspire.mosqueName;
      if (inspire.timings.length > 0) timings.push(...inspire.timings);
      return inspire.timings.length > 0;
    }
    case "masjidBoxApi": {
      if (!config.masjidBoxApi) return false;
      const mbApiResponse = await httpClient.get(config.masjidBoxApi, {
        headers: { apikey: "JejYcMS7hsOsZTPDk2ZhKOAlW9IyQ6Px" },
      });
      const mbTimings = transformMasjidBoxApiData(mbApiResponse.data);
      if (mbTimings.length > 0) timings.push(...mbTimings);
      return mbTimings.length > 0;
    }
    case "mawaqitUrl": {
      if (!config.mawaqitUrl) return false;
      const mwResponse = await httpClient.get(config.mawaqitUrl);
      const mwTimings = transformMawaqitData(String(mwResponse.data));
      if (mwTimings.length > 0) timings.push(...mwTimings);
      return mwTimings.length > 0;
    }
    case "supabaseUrl": {
      if (!config.supabaseUrl) return false;
      const monthData = await fetchSupabaseMonthDataWithYearFallback(config.supabaseUrl, config.slug);
      const sbTimings = transformSupabaseData(monthData);
      if (sbTimings.length > 0) timings.push(...sbTimings);
      return sbTimings.length > 0;
    }
  }
}

async function scrapeWithPuppeteer(url: string, timeoutMs: number = 15_000): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; PrayerTimesScraper/1.0)");
    await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });
    return await page.content();
  } finally {
    await browser.close();
  }
}

async function scrapePrayerTimings(repoRoot: string, dataDir: string, config: MosqueConfig): Promise<void> {
  const filePath = path.join(dataDir, `${config.slug}.json`);
  let mosqueName = config.name;
  const timings: PrayerTiming[] = [];

  try {
    // Special cases (website scrapers)

    // Bury Park — prioritise Supabase (current month), fallback to website via Puppeteer
    if (config.slug === "bury-park-jamia-masjid") {
      if (config.supabaseUrl && timings.length === 0) {
        try {
          const monthData = await fetchSupabaseMonthDataWithYearFallback(config.supabaseUrl, config.slug);
          const sbTimings = transformSupabaseData(monthData);
          if (sbTimings.length > 0) timings.push(...sbTimings);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[Bury Park] Supabase failed: ${msg}`);
        }
      }
      if (config.websiteUrl && timings.length === 0) {
        try {
          const html = await scrapeWithPuppeteer(config.websiteUrl);
          const webTimings = transformBuryParkWebsiteData(html);
          if (webTimings.length > 0) timings.push(...webTimings);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[Bury Park] Website scraper failed: ${msg}`);
        }
      }
    }

    // Masjid Irshad — client-rendered website
    if (config.slug === "masjid-irshad" && config.websiteUrl && timings.length === 0) {
      try {
        const html = await scrapeWithPuppeteer(config.websiteUrl);
        const webTimings = transformMasjidIrshadWebsiteData(html);
        if (webTimings.length > 0) timings.push(...webTimings);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Masjid Irshad] Website scraper failed: ${msg}`);
      }
    }

    // Madinah Masjid — server-rendered page (usually)
    if (config.slug === "madinah-masjid" && config.websiteUrl && timings.length === 0) {
      try {
        const webResponse = await httpClient.get(config.websiteUrl);
        const webTimings = transformMadinahMasjidWebsiteData(String(webResponse.data));
        if (webTimings.length > 0) timings.push(...webTimings);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Madinah Masjid] Website scraper failed: ${msg}`);
      }
    }

    // Masjid-e-Ali — Next.js client-rendered
    if (config.slug === "masjid-e-ali" && config.websiteUrl && timings.length === 0) {
      try {
        const html = await scrapeWithPuppeteer(config.websiteUrl);
        const webTimings = transformMasjidEAliWebsiteData(html);
        if (webTimings.length > 0) timings.push(...webTimings);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Masjid-e-Ali] Website scraper failed: ${msg}`);
      }
    }

    // Bait Ul Abrar — WAF sometimes; longer timeout + retries
    if (config.slug === "bait-ul-abrar-jamia-masjid" && config.websiteUrl && timings.length === 0) {
      const timeout = 45_000;
      const maxTries = 3;
      let html: string | null = null;
      for (let attempt = 1; attempt <= maxTries; attempt++) {
        try {
          html = await scrapeWithPuppeteer(config.websiteUrl, timeout);
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[Bait Ul Abrar] Attempt ${attempt}/${maxTries} failed: ${msg}`);
          if (attempt < maxTries) await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
      if (html) {
        const webTimings = transformBaitUlAbrarWebsiteData(html);
        if (webTimings.length > 0) timings.push(...webTimings);
      }
    }

    // Google Sheet CSV: specific mosques
    const googleSheetLabel = GOOGLE_SHEET_MOSQUES[config.slug];
    if (googleSheetLabel && config.googleSheetCsvUrl && timings.length === 0) {
      try {
        const csvResponse = await httpClient.get(config.googleSheetCsvUrl, {
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400,
        });
        const csvContent = typeof csvResponse.data === "string" ? csvResponse.data : String(csvResponse.data);
        const sheetTimings = transformGoogleSheetPrayerTimesCsv(csvContent);
        if (sheetTimings.length > 0) timings.push(...sheetTimings);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Google Sheet] CSV fetch failed for ${config.slug}: ${msg}`);
      }
    }

    // Normal flow: try sources in priority order
    if (timings.length === 0) {
      const mosqueNameRef = { current: mosqueName };
      const sourceOrder =
        config.slug === "bury-park-jamia-masjid" && config.supabaseUrl
          ? (["supabaseUrl", ...SOURCE_ORDER.filter((s) => s !== "supabaseUrl")] as const)
          : SOURCE_ORDER;

      for (const source of sourceOrder) {
        if (timings.length > 0) break;
        if (!hasSource(config, source)) continue;
        try {
          await trySource(source, config, timings, mosqueNameRef);
          mosqueName = mosqueNameRef.current;
        } catch (err) {
          const msg = (err as any)?.response?.status ? `HTTP ${(err as any).response.status}` : (err instanceof Error ? err.message : String(err));
          console.warn(`[${config.slug}] ${source} failed: ${msg}`);
        }
      }
    }

    // Faizan fallback: if all normal sources failed, try website (Puppeteer)
    if (config.slug === "faizan-e-mushkil-kusha" && timings.length === 0 && config.websiteUrl) {
      try {
        const html = await scrapeWithPuppeteer(config.websiteUrl);
        const webTimings = transformFaizanEMushkilKushaWebsiteData(html);
        if (webTimings.length > 0) timings.push(...webTimings);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Faizan] Website fallback failed: ${msg}`);
      }
    }

    const currentDate = new Date();
    const dayOfMonth = currentDate.getDate();

    // Preserve previous month's data in the first 7 days if new data is empty.
    if (timings.length === 0 && dayOfMonth <= 7 && fs.existsSync(filePath)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(filePath, "utf8")) as MosqueData;
        if (existingData.timings && existingData.timings.length > 0) {
          const preserved: MosqueData = {
            ...existingData,
            lastChecked: currentDate.toISOString(),
            isStale: true,
            staleReason: "No new data available for current month",
          };
          saveToFile(filePath, preserved);
          return;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[${config.slug}] Could not read existing data: ${msg}`);
      }
    }

    const mosqueData: MosqueData = {
      mosqueName,
      timings,
      lastChecked: currentDate.toISOString(),
      isStale: false,
    };

    saveToFile(filePath, mosqueData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error scraping ${config.slug}: ${msg}`);
  }
}

export async function runScraper(options: ScrapeOptions): Promise<void> {
  const repoRoot = options.repoRoot;
  const dataDir = ensureDataDirectory(repoRoot);

  const slugs = options.slugs?.length ? options.slugs : undefined;
  let filteredMosques: MosqueConfig[] = mosqueUrls;

  if (slugs) {
    filteredMosques = mosqueUrls.filter((m) => slugs.includes(m.slug));
    if (filteredMosques.length === 0) {
      throw new Error(`No mosques found matching: ${slugs.join(", ")}`);
    }
  }

  const mosqueConfigsWithMonth = addMonthToMosqueConfigs(filteredMosques);
  console.log(`Scraping ${mosqueConfigsWithMonth.length} mosque(s)...`);

  const batchSize = 5;
  for (let i = 0; i < mosqueConfigsWithMonth.length; i += batchSize) {
    const batch = mosqueConfigsWithMonth.slice(i, i + batchSize);
    await Promise.all(batch.map((config) => scrapePrayerTimings(repoRoot, dataDir, config)));
    if (i + batchSize < mosqueConfigsWithMonth.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  generateMosqueIndex(repoRoot, dataDir);
}

export async function runFromCli(): Promise<void> {
  const slugs = parseCliArguments(process.argv.slice(2));
  const repoRoot = path.resolve(__dirname, "..");
  await runScraper({
    repoRoot,
    ...(slugs ? { slugs } : {}),
  });
}

