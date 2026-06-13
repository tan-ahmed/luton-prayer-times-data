import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import axios from "axios";
import * as cheerio from "cheerio";
import { parse as parseCsv } from "csv-parse/sync";
import type { MosqueData, MosqueIndex, PrayerTiming } from "./types";

export function ensureDataDirectory(repoRoot: string): string {
  const dataDir = path.join(repoRoot, "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

export function getCurrentMonth(): string {
  const currentDate = new Date();
  return String(currentDate.getMonth() + 1).padStart(2, "0");
}

export function addMonthToMosqueConfigs<T extends { url?: string }>(configs: T[]): T[] {
  const monthFormatted = getCurrentMonth();
  return configs.map((config) => ({
    ...config,
    url: config.url ? `${config.url}&month=${monthFormatted}` : config.url,
  }));
}

// No custom User-Agent: SiteGround WAF blocks Mozilla-prefixed bot strings; axios default works.
export const httpClient = axios.create({
  timeout: 10000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

export function saveToFile(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function generateMosqueIndex(repoRoot: string, dataDir: string): string | null {
  const indexData: MosqueIndex = {
    mosques: [],
    lastUpdated: new Date().toISOString(),
  };

  try {
    const files = fs.readdirSync(dataDir).filter((file) => file.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as MosqueData;
        const slug = file.replace(".json", "");
        indexData.mosques.push({
          name: data.mosqueName,
          slug,
          dataFile: `data/${file}`,
          hasData: Array.isArray(data.timings) && data.timings.length > 0,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error reading ${file}: ${message}`);
      }
    }

    indexData.mosques.sort((a, b) => a.name.localeCompare(b.name));
    const indexPath = path.join(repoRoot, "mosque-index.json");
    saveToFile(indexPath, indexData);
    return indexPath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error generating mosque index: ${message}`);
    return null;
  }
}

export function transformInspireFMData(html: string): { mosqueName: string; timings: PrayerTiming[] } {
  const $ = cheerio.load(html);
  const timings: PrayerTiming[] = [];
  const extractedName = $("h3.text-center span.color-green").text().trim();

  $("table.table-hover tbody tr").each((_index, row) => {
    const cols = $(row).find("td");
    if (cols.length === 7) {
      timings.push({
        day: $(cols[0]).text().trim(),
        date: $(cols[1]).text().trim(),
        fajr: $(cols[2]).text().trim(),
        zuhr: $(cols[3]).text().trim(),
        asr: $(cols[4]).text().trim(),
        magrib: $(cols[5]).text().trim(),
        isha: $(cols[6]).text().trim(),
      });
    }
  });

  return { mosqueName: extractedName, timings };
}

type AnyObj = Record<string, unknown>;

function parseYmd(ymd: unknown): { y: string; m: string; d: string } | null {
  if (typeof ymd !== "string") return null;
  const parts = ymd.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function isValidUtcYmd(y: string, m: string, d: string): boolean {
  const yearNum = Number(y);
  const monthNum = Number(m);
  const dayNum = Number(d);
  if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum) || !Number.isFinite(dayNum)) return false;
  const dt = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
  return dt.getUTCFullYear() === yearNum && dt.getUTCMonth() === monthNum - 1 && dt.getUTCDate() === dayNum;
}

/** True when the body looks like a WordPress prayer-time month payload (not HTML/error). */
export function isValidWordPressPayload(wpData: unknown): boolean {
  if (!Array.isArray(wpData) || wpData.length === 0) return false;

  let days: unknown[] = wpData;
  const first = wpData[0];
  if (Array.isArray(first) && first.length > 0) {
    days = first;
  }

  return days.some(
    (d) =>
      typeof d === "object" &&
      d !== null &&
      "d_date" in d &&
      typeof (d as Record<string, unknown>).d_date === "string",
  );
}

export function transformWordPressData(wpData: unknown): PrayerTiming[] {
  if (!Array.isArray(wpData) || wpData.length === 0) return [];

  // Some endpoints return [[...]]; normalize.
  let days: AnyObj[] = wpData as AnyObj[];
  const first = wpData[0];
  if (Array.isArray(first) && first.length > 0 && typeof first[0] === "object" && first[0] && "d_date" in (first[0] as AnyObj)) {
    days = first as AnyObj[];
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const allParsed = days.map((d) => parseYmd(d?.d_date)).filter((p): p is NonNullable<typeof p> => !!p);
  const years = new Set(allParsed.map((p) => p.y));
  const months = new Set(allParsed.map((p) => p.m));

  const shouldRewriteYear =
    allParsed.length > 0 &&
    years.size === 1 &&
    months.size === 1 &&
    [...months][0] === currentMonth &&
    Number([...years][0]) > 1900 &&
    Number([...years][0]) !== currentYear;

  if (shouldRewriteYear) {
    days = days
      .map((day) => {
        const parsed = parseYmd(day?.d_date);
        if (!parsed) return day;
        const rewritten = `${currentYear}-${parsed.m}-${parsed.d}`;
        if (!isValidUtcYmd(String(currentYear), parsed.m, parsed.d)) return null;
        return { ...day, d_date: rewritten };
      })
      .filter((d): d is AnyObj => !!d);
  }

  const convertDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
  };

  const convertTime = (timeStr: unknown): string => {
    if (typeof timeStr !== "string") return "";
    return timeStr.substring(0, 5);
  };

  const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const timings: PrayerTiming[] = [];
  for (const dayData of days) {
    const dDate = typeof dayData.d_date === "string" ? dayData.d_date : "";
    if (!dDate) continue;
    timings.push({
      day: getDayName(dDate),
      date: convertDate(dDate),
      fajr: convertTime(dayData.fajr_jamah),
      zuhr: convertTime(dayData.zuhr_jamah),
      asr: convertTime(dayData.asr_jamah),
      magrib: convertTime(dayData.maghrib_jamah),
      isha: convertTime(dayData.isha_jamah),
    });
  }

  return timings;
}

export function transformSupabaseData(supabaseData: unknown): PrayerTiming[] {
  if (!Array.isArray(supabaseData) || supabaseData.length === 0) return [];
  let days: AnyObj[] = [...(supabaseData as AnyObj[])];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

  const allParsed = days.map((d) => parseYmd(d?.d_date)).filter((p): p is NonNullable<typeof p> => !!p);
  const years = new Set(allParsed.map((p) => p.y));
  const months = new Set(allParsed.map((p) => p.m));

  const shouldRewriteYear =
    allParsed.length > 0 &&
    years.size === 1 &&
    months.size === 1 &&
    [...months][0] === currentMonth &&
    Number([...years][0]) > 1900 &&
    Number([...years][0]) !== currentYear;

  if (shouldRewriteYear) {
    days = days
      .map((day) => {
        const parsed = parseYmd(day?.d_date);
        if (!parsed) return day;
        const rewritten = `${currentYear}-${parsed.m}-${parsed.d}`;
        if (!isValidUtcYmd(String(currentYear), parsed.m, parsed.d)) return null;
        return { ...day, d_date: rewritten };
      })
      .filter((d): d is AnyObj => !!d);
  }

  const convertDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-");
    return `${day}-${month}-${year}`;
  };
  const convertTime = (timeStr: unknown): string => {
    if (typeof timeStr !== "string") return "";
    return timeStr.substring(0, 5);
  };
  const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const timings: PrayerTiming[] = [];
  for (const dayData of days) {
    const dDate = typeof dayData.d_date === "string" ? dayData.d_date : "";
    if (!dDate) continue;
    timings.push({
      day: getDayName(dDate),
      date: convertDate(dDate),
      fajr: convertTime(dayData.fajr_jamah),
      zuhr: convertTime(dayData.zuhr_jamah),
      asr: convertTime(dayData.asr_jamah),
      magrib: convertTime(dayData.maghrib_jamah),
      isha: convertTime(dayData.isha_jamah),
    });
  }
  return timings;
}

export function transformMasjidBoxApiData(apiData: unknown): PrayerTiming[] {
  const data = apiData as AnyObj | null;
  if (!data || !Array.isArray((data as AnyObj).timetable)) return [];

  const timetable = (data.timetable as AnyObj[]) ?? [];
  const timeZone = (data.settings as AnyObj | undefined)?.timezone;
  const tz = typeof timeZone === "string" ? timeZone : "Europe/London";

  const timeFormatter = (() => {
    try {
      return new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: tz,
      });
    } catch {
      return null;
    }
  })();

  const formatIsoToHHMM = (isoTime: unknown): string => {
    if (typeof isoTime !== "string") return "";
    const dt = new Date(isoTime);
    if (!Number.isFinite(dt.getTime())) return "";
    if (timeFormatter) return timeFormatter.format(dt);
    return dt.toTimeString().substring(0, 5);
  };

  const formatIsoDateToDMY = (isoDate: unknown): string => {
    if (typeof isoDate !== "string") return "";
    const dt = new Date(isoDate);
    if (!Number.isFinite(dt.getTime())) return "";
    if (!timeFormatter) {
      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = dt.getFullYear();
      return `${day}-${month}-${year}`;
    }
    const parts = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: tz,
    }).formatToParts(dt);
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    return day && month && year ? `${day}-${month}-${year}` : "";
  };

  const formatIsoDateToWeekday = (isoDate: unknown): string => {
    if (typeof isoDate !== "string") return "";
    const dt = new Date(isoDate);
    if (!Number.isFinite(dt.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        timeZone: tz,
      }).format(dt);
    } catch {
      return dt.toLocaleDateString("en-US", { weekday: "long" });
    }
  };

  const timings: PrayerTiming[] = [];
  for (const dayData of timetable) {
    const dayName = formatIsoDateToWeekday(dayData.date);
    const dateStr = formatIsoDateToDMY(dayData.date);
    const iqamah = (dayData.iqamah as AnyObj | undefined) ?? {};
    timings.push({
      day: dayName,
      date: dateStr,
      fajr: formatIsoToHHMM(iqamah.fajr),
      zuhr: formatIsoToHHMM(iqamah.dhuhr),
      asr: formatIsoToHHMM(iqamah.asr),
      magrib: formatIsoToHHMM(iqamah.maghrib),
      isha: formatIsoToHHMM(iqamah.isha),
    });
  }

  return timings;
}

export function convertTo24Hour(time12: string): string {
  if (!time12) return "";
  const cleanTime = time12.replace(/\s+/g, "").toUpperCase();
  const match = cleanTime.match(/(\d{1,2}):?(\d{2})(AM|PM)/i);
  if (!match) {
    const altMatch = cleanTime.match(/(\d{1})(\d{2})(AM|PM)/i);
    if (altMatch) {
      const h = altMatch[1];
      const minutes = altMatch[2];
      const periodRaw = altMatch[3];
      if (!h || !minutes || !periodRaw) return "";
      let hours = parseInt(h, 10);
      const period = periodRaw.toUpperCase();
      if (period === "PM" && hours !== 12) hours += 12;
      else if (period === "AM" && hours === 12) hours = 0;
      return `${String(hours).padStart(2, "0")}:${minutes}`;
    }
    return "";
  }

  const h = match[1];
  const minutes = match[2];
  const periodRaw = match[3];
  if (!h || !minutes || !periodRaw) return "";
  let hours = parseInt(h, 10);
  const period = periodRaw.toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  else if (period === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function addMinutesToTime(time24: string, minutesToAdd: number): string {
  if (!time24 || !minutesToAdd) return time24;
  const [hours, minutes] = time24.split(":").map(Number);
  const date = new Date();
  date.setHours(hours ?? 0, (minutes ?? 0) + minutesToAdd, 0, 0);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function transformMawaqitData(html: string): PrayerTiming[] {
  const timings: PrayerTiming[] = [];
  try {
    const confMatch = html.match(/var confData = ({.*?});[\s\n]*var/s);
    if (!confMatch) return timings;
    const confJson = confMatch[1];
    if (!confJson) return timings;
    const confData = JSON.parse(confJson) as AnyObj;

    const today = new Date();
    const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
    const dayOfMonth = today.getDate();
    const monthIndex = today.getMonth();
    const day = String(dayOfMonth).padStart(2, "0");
    const month = String(monthIndex + 1).padStart(2, "0");
    const year = String(today.getFullYear());
    const dateStr = `${day}-${month}-${year}`;

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayName = tomorrow.toLocaleDateString("en-US", { weekday: "long" });
    const tomorrowDayOfMonth = tomorrow.getDate();
    const tomorrowMonthIndex = tomorrow.getMonth();
    const tomorrowDay = String(tomorrowDayOfMonth).padStart(2, "0");
    const tomorrowMonth = String(tomorrowMonthIndex + 1).padStart(2, "0");
    const tomorrowYear = String(tomorrow.getFullYear());
    const tomorrowDateStr = `${tomorrowDay}-${tomorrowMonth}-${tomorrowYear}`;

    const processDayTimes = (
      date: Date,
      dayOfMonthLocal: number,
      monthIndexLocal: number,
      dayNameLocal: string,
      dateStrLocal: string,
    ): PrayerTiming | null => {
      let azanTimes: unknown[] | null = null;
      if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth()) {
        azanTimes = (confData.times as unknown[]) ?? [];
      } else {
        const monthCalendar = confData.calendar ? (confData.calendar as AnyObj[])[monthIndexLocal] : null;
        const dayArr = monthCalendar ? (monthCalendar as AnyObj)[dayOfMonthLocal] : null;
        if (Array.isArray(dayArr) && dayArr.length >= 6) {
          azanTimes = [dayArr[0], dayArr[2], dayArr[3], dayArr[4], dayArr[5]];
        } else {
          return null;
        }
      }

      if (!azanTimes || azanTimes.length < 5) return null;

      let iqamaOffsets: unknown[] = ["+0", "+0", "+0", "+0", "+0"];
      if (confData.iqamaCalendar && Array.isArray(confData.iqamaCalendar)) {
        const monthIqama = (confData.iqamaCalendar as AnyObj[])[monthIndexLocal] as AnyObj | undefined;
        const offsets = monthIqama ? (monthIqama as AnyObj)[dayOfMonthLocal] : null;
        if (Array.isArray(offsets)) iqamaOffsets = offsets;
      }

      const prayerNames = ["fajr", "zuhr", "asr", "magrib", "isha"] as const;
      const jamaat: Partial<Record<(typeof prayerNames)[number], string>> = {};
      for (let i = 0; i < 5; i++) {
        const prayerKey = prayerNames[i];
        if (!prayerKey) continue;
        const azanTime = typeof azanTimes[i] === "string" ? (azanTimes[i] as string) : "";
        const offset = iqamaOffsets[i];
        let jamaatTime = azanTime;
        if (typeof offset === "string" && offset.startsWith("+")) {
          const minutes = parseInt(offset.substring(1), 10);
          if (Number.isFinite(minutes)) jamaatTime = addMinutesToTime(azanTime, minutes);
        } else if (typeof offset === "string" && offset.includes(":")) {
          jamaatTime = offset;
        }
        jamaat[prayerKey] = jamaatTime;
      }

      return {
        day: dayNameLocal,
        date: dateStrLocal,
        fajr: jamaat.fajr ?? "",
        zuhr: jamaat.zuhr ?? "",
        asr: jamaat.asr ?? "",
        magrib: jamaat.magrib ?? "",
        isha: jamaat.isha ?? "",
      };
    };

    const todayTiming = processDayTimes(today, dayOfMonth, monthIndex, dayName, dateStr);
    if (todayTiming) timings.push(todayTiming);
    const tomorrowTiming = processDayTimes(tomorrow, tomorrowDayOfMonth, tomorrowMonthIndex, tomorrowDayName, tomorrowDateStr);
    if (tomorrowTiming) timings.push(tomorrowTiming);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error parsing Mawaqit data: ${message}`);
  }
  return timings;
}

function normalizeTableTime(timeStr: string, colIndex: number): string {
  if (!timeStr || !timeStr.trim()) return "";
  const t = timeStr.trim();
  if (!/^\d{1,2}:\d{2}$/.test(t)) return convertTo24Hour(t) || t;
  const hour = parseInt(t.split(":")[0] ?? "0", 10);
  const mins = t.split(":")[1] ?? "00";
  const needSuffix = colIndex === 0 ? true : hour >= 1 && hour <= 9;
  const withSuffix = needSuffix ? (colIndex === 0 ? `${t}AM` : `${t}PM`) : null;
  if (withSuffix) {
    const converted = convertTo24Hour(withSuffix);
    if (converted) return converted;
  }
  return t.length === 5 ? t : t.padStart(5, "0");
}

export function transformBuryParkWebsiteData(html: string): PrayerTiming[] {
  const $ = cheerio.load(html);
  const timings: PrayerTiming[] = [];

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear());
  const dateStr = `${day}-${month}-${year}`;

  const rowSelector = "div.grid.grid-cols-3.border-t, div.grid.border-t.border-gray-700";
  const jamaahTimes: Record<string, string> = {};

  const inverseMap: Record<string, string> = {
    fajr: "fajr",
    zuhr: "zuhr",
    asr: "asr",
    maghrib: "magrib",
    isha: "isha",
  };

  $(rowSelector).each((_index, rowEl) => {
    const spans = $(rowEl).find("span");
    if (spans.length >= 3) {
      const prayerName = $(spans[0]).text().trim().toLowerCase();
      const jamaahTime = $(spans[2]).text().trim().replace("—", "").trim();
      const key = inverseMap[prayerName];
      if (key && jamaahTime) jamaahTimes[key] = jamaahTime.substring(0, 5);
    }
  });

  if (Object.keys(jamaahTimes).length >= 5) {
    timings.push({
      day: dayName,
      date: dateStr,
      fajr: jamaahTimes.fajr || "",
      zuhr: jamaahTimes.zuhr || "",
      asr: jamaahTimes.asr || "",
      magrib: jamaahTimes.magrib || "",
      isha: jamaahTimes.isha || "",
    });
  }

  return timings;
}

export function transformMasjidIrshadWebsiteData(html: string): PrayerTiming[] {
  const $ = cheerio.load(html);
  const timings: PrayerTiming[] = [];

  const prayerMap: Record<string, keyof PrayerTiming> = {
    fajr: "fajr",
    dhuhr: "zuhr",
    zuhr: "zuhr",
    asr: "asr",
    maghrib: "magrib",
    magrib: "magrib",
    isha: "isha",
  };

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear());
  const dateStr = `${day}-${month}-${year}`;

  const jamaahTimes: Partial<Record<keyof PrayerTiming, string>> = {};
  $("table tbody tr").each((_index, rowEl) => {
    const tds = $(rowEl).find("td");
    if (tds.length >= 3) {
      const prayerName = $(tds[0]).text().trim().toLowerCase();
      const iqamahSpan = $(tds[2]).find("span");
      let iqamahTime = iqamahSpan.text().trim().replace(/\s+/g, " ").trim();
      const key = prayerMap[prayerName];
      if (key && iqamahTime) {
        const time24 = convertTo24Hour(iqamahTime);
        if (time24) jamaahTimes[key] = time24;
      }
    }
  });

  if (Object.keys(jamaahTimes).length >= 5) {
    timings.push({
      day: dayName,
      date: dateStr,
      fajr: jamaahTimes.fajr || "",
      zuhr: jamaahTimes.zuhr || "",
      asr: jamaahTimes.asr || "",
      magrib: jamaahTimes.magrib || "",
      isha: jamaahTimes.isha || "",
    });
  }
  return timings;
}

export function transformMadinahMasjidWebsiteData(html: string): PrayerTiming[] {
  const $ = cheerio.load(html);
  const timings: PrayerTiming[] = [];

  const prayerKeyMap: Record<string, keyof PrayerTiming> = {
    fajr: "fajr",
    zuhr: "zuhr",
    asr: "asr",
    maghrib: "magrib",
    magrib: "magrib",
    isha: "isha",
  };

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear());
  const dateStr = `${day}-${month}-${year}`;

  const normalizeMadinahTimeStr = (rawStr: string, prayerKey: string): string => {
    const s = rawStr.replace(/\s+/g, " ").trim();
    if (/\d{1,2}:?\d{2}\s*(am|pm)/i.test(s)) return s;
    const timePart = s.match(/(\d{1,2})[.:](\d{2})/);
    if (timePart) {
      const normalized = `${timePart[1]}:${timePart[2]}`;
      return prayerKey === "fajr" ? `${normalized}am` : `${normalized}pm`;
    }
    return s;
  };

  const jamaahTimes: Partial<Record<keyof PrayerTiming, string>> = {};
  $("div.prayer-times h3").each((_index, el) => {
    const text = $(el).text().trim();
    const match = text.match(/^(\w+)\s*:\s*(.+)$/i);
    if (!match) return;
    const prayerName = match[1]?.trim().toLowerCase() ?? "";
    const rawTimeStr = match[2]?.trim() ?? "";
    const key = prayerKeyMap[prayerName];
    if (key && rawTimeStr) {
      const timeStr = normalizeMadinahTimeStr(rawTimeStr, key);
      const time24 = convertTo24Hour(timeStr);
      if (time24) jamaahTimes[key] = time24;
    }
  });

  if (Object.keys(jamaahTimes).length >= 5) {
    timings.push({
      day: dayName,
      date: dateStr,
      fajr: jamaahTimes.fajr || "",
      zuhr: jamaahTimes.zuhr || "",
      asr: jamaahTimes.asr || "",
      magrib: jamaahTimes.magrib || "",
      isha: jamaahTimes.isha || "",
    });
  }
  return timings;
}

export function transformFaizanEMushkilKushaWebsiteData(html: string): PrayerTiming[] {
  const $ = cheerio.load(html);
  const timings: PrayerTiming[] = [];
  const prayerToKey: Record<string, keyof PrayerTiming> = {
    fajr: "fajr",
    dhuhr: "zuhr",
    asr: "asr",
    maghrib: "magrib",
    isha: "isha",
  };

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear());
  const dateStr = `${day}-${month}-${year}`;

  const jamaatTimes: Partial<Record<keyof PrayerTiming, string>> = {};
  $("table tbody tr").each((_index, rowEl) => {
    const tds = $(rowEl).find("td");
    if (tds.length < 4) return;
    const prayerName = $(tds[0]).text().trim().toLowerCase();
    const jamaatTime = $(tds[3]).text().trim();
    if (!jamaatTime || !/^\d{1,2}:\d{2}$/.test(jamaatTime)) return;
    const key = prayerToKey[prayerName];
    if (key) jamaatTimes[key] = jamaatTime.length === 5 ? jamaatTime : jamaatTime.padStart(5, "0");
  });

  if (Object.keys(jamaatTimes).length >= 5) {
    timings.push({
      day: dayName,
      date: dateStr,
      fajr: jamaatTimes.fajr || "",
      zuhr: jamaatTimes.zuhr || "",
      asr: jamaatTimes.asr || "",
      magrib: jamaatTimes.magrib || "",
      isha: jamaatTimes.isha || "",
    });
  }
  return timings;
}

export function transformBaitUlAbrarWebsiteData(html: string): PrayerTiming[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const timings: PrayerTiming[] = [];

  $("table.st_hr_table tbody tr, table.st_hr_table tr").each((_index, rowEl) => {
    const cells = $(rowEl).find("td");
    if (cells.length < 6) return;
    const label = $(cells[0]).text().trim();
    if (!label.includes("Jama'ah")) return;
    const isToday = label.includes("Today");
    const isTomorrow = label.includes("Tomorrow");
    if (!isToday && !isTomorrow) return;

    const date = new Date();
    if (isTomorrow) date.setDate(date.getDate() + 1);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    const dateStr = `${day}-${month}-${year}`;
    if (seen.has(dateStr)) return;
    seen.add(dateStr);

    const fajr = normalizeTableTime($(cells[1]).text(), 0);
    const zuhr = normalizeTableTime($(cells[2]).text(), 1);
    const asr = normalizeTableTime($(cells[3]).text(), 2);
    const magrib = normalizeTableTime($(cells[4]).text(), 3);
    const isha = normalizeTableTime($(cells[5]).text(), 4);

    if (fajr || zuhr || asr || magrib || isha) {
      timings.push({ day: dayName, date: dateStr, fajr, zuhr, asr, magrib, isha });
    }
  });

  return timings;
}

export function transformMasjidEAliWebsiteData(html: string): PrayerTiming[] {
  const $ = cheerio.load(html);
  const timings: PrayerTiming[] = [];
  const nameToKey: Record<string, keyof PrayerTiming> = {
    fajr: "fajr",
    dhurain: "zuhr",
    dhuhr: "zuhr",
    zuhr: "zuhr",
    asr: "asr",
    maghrabain: "magrib",
    maghrib: "magrib",
    isha: "isha",
  };

  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear());
  const dateStr = `${day}-${month}-${year}`;

  const jamaahTimes: Partial<Record<keyof PrayerTiming, string>> = {};
  $("div.grid > div").each((_index, cardEl) => {
    const divs = $(cardEl).children("div");
    if (divs.length >= 2) {
      const prayerName = $(divs[0]).text().trim().toLowerCase().replace(/\s+/g, "");
      const timeStr = $(divs[1]).text().trim();
      const key = nameToKey[prayerName];
      if (key && timeStr && /^\d{1,2}:\d{2}$/.test(timeStr)) {
        jamaahTimes[key] = timeStr.length === 5 ? timeStr : timeStr.padStart(5, "0");
      }
    }
  });

  if (Object.keys(jamaahTimes).length >= 3) {
    timings.push({
      day: dayName,
      date: dateStr,
      fajr: jamaahTimes.fajr || "",
      zuhr: jamaahTimes.zuhr || "",
      asr: jamaahTimes.asr || "",
      magrib: jamaahTimes.magrib || "",
      isha: jamaahTimes.isha || "",
    });
  }

  return timings;
}

function normalizeSheetTime(timeStr: unknown, colIndex: number): string {
  if (!timeStr || !String(timeStr).trim()) return "";
  const t = String(timeStr).trim();
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "";
  const h = m[1];
  const min = m[2];
  if (!h || !min) return "";
  let hour = parseInt(h, 10);
  if (colIndex === 0) {
    if (hour === 12) hour = 0;
  } else if (hour >= 1 && hour <= 9) {
    hour += 12;
  }
  return `${String(hour).padStart(2, "0")}:${min}`;
}

export function transformGoogleSheetPrayerTimesCsv(csvContent: string): PrayerTiming[] {
  const timings: PrayerTiming[] = [];
  const records = parseCsv(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as AnyObj[];

  for (const row of records) {
    const dateStr = String(row.Date ?? row.date ?? "").trim();
    if (!dateStr) continue;
    const parts = dateStr.split("/");
    if (parts.length !== 3) continue;
    const month = parseInt(parts[0] ?? "", 10);
    const day = parseInt(parts[1] ?? "", 10);
    const year = parseInt(parts[2] ?? "", 10);
    if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) continue;

    const date = new Date(year, month - 1, day);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = String(date.getFullYear());
    const dateFormatted = `${dd}-${mm}-${yyyy}`;

    const fajr = normalizeSheetTime(row.Fajr, 0);
    const zuhr = normalizeSheetTime(row.Zuhr, 1);
    const asr = normalizeSheetTime(row.Asr, 2);
    const magrib = normalizeSheetTime(row.Maghrib, 3);
    const isha = normalizeSheetTime(row.Isha, 4);

    if (fajr || zuhr || asr || magrib || isha) {
      timings.push({
        day: dayName,
        date: dateFormatted,
        fajr: fajr || "",
        zuhr: zuhr || "",
        asr: asr || "",
        magrib: magrib || "",
        isha: isha || "",
      });
    }
  }

  return timings;
}

