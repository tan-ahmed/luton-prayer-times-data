import { httpClient } from "./util";
import type { ScrapeOutcome, ScrapeSource, ScrapeStatus } from "./types";

const TELEGRAM_MAX_LENGTH = 4096;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatUkDateTime(date: Date): string {
  return date.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function humanReason(reason: string): string {
  const map: Record<string, string> = {
    "Source blocked (HTTP 403)": "The mosque website blocked our automatic check",
    "Source timed out": "The website took too long to respond",
    "Source returned invalid response": "The website sent data we could not read",
    "Source rate limited (HTTP 429)": "The website asked us to slow down — we will try again tomorrow",
    "Source server error": "The mosque website had a temporary error",
    "No new data available for current month": "No times have been published for this month yet",
  };
  if (map[reason]) return map[reason];

  const upper = reason.toUpperCase();
  if (upper.includes("TIMEOUT") || upper.includes("ETIMEDOUT") || upper.includes("ECONNABORTED")) {
    return "The website took too long to respond";
  }
  if (upper.includes("ENOTFOUND") || upper.includes("ECONNREFUSED") || upper.includes("ECONNRESET")) {
    return "Could not connect to the website";
  }
  if (upper.includes("HTTP 403")) return "The mosque website blocked our automatic check";
  if (upper.includes("HTTP 5")) return "The mosque website had a temporary error";

  return reason || "Something went wrong while fetching times";
}

function humanSource(source: ScrapeSource | undefined): string | null {
  if (!source) return null;
  const map: Record<ScrapeSource, string> = {
    WordPress: "mosque website",
    Jina: "backup fetch (direct website was blocked)",
    InspireFM: "Inspire FM listing",
    MasjidBox: "MasjidBox",
    Mawaqit: "Mawaqit",
    Supabase: "mosque database",
    Website: "mosque website",
    "Google Sheet": "shared timetable sheet",
    Preserved: "last saved copy (could not refresh today)",
  };
  return map[source] ?? source;
}

function statusShort(status: ScrapeStatus): string {
  if (status === "ok") return "✅";
  if (status === "stale") return "⚠️";
  return "❌";
}

function buildTable(outcomes: ScrapeOutcome[]): string {
  const sorted = [...outcomes].sort((a, b) => a.name.localeCompare(b.name));
  const nameWidth = Math.min(
    28,
    Math.max("Mosque".length, ...sorted.map((o) => o.name.length)),
  );
  const statusWidth = "Status".length;

  const pad = (text: string, width: number) =>
    text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width);

  const header = `${pad("Mosque", nameWidth)}  ${pad("Status", statusWidth)}`;
  const rule = "─".repeat(header.length);
  const rows = sorted.map((o) => `${pad(o.name, nameWidth)}  ${statusShort(o.status)}`);

  return [header, rule, ...rows].join("\n");
}

function formatProblemDetails(outcomes: ScrapeOutcome[], status: "stale" | "failed"): string[] {
  const items = outcomes
    .filter((o) => o.status === status)
    .sort((a, b) => a.name.localeCompare(b.name));

  return items.map((o) => {
    const reason = humanReason(o.reason ?? "");
    const source = humanSource(o.source);
    const bits = [reason];
    if (source && status === "stale") bits.push(`using ${source}`);
    return `• <b>${escapeHtml(o.name)}</b> — ${escapeHtml(bits.join("; "))}`;
  });
}

export function formatRefreshDump(outcomes: ScrapeOutcome[], completedAt: Date = new Date()): string {
  const ok = outcomes.filter((o) => o.status === "ok");
  const stale = outcomes.filter((o) => o.status === "stale");
  const failed = outcomes.filter((o) => o.status === "failed");
  const total = outcomes.length;

  const lines: string[] = [
    "<b>🕌 Luton Prayer Times</b>",
    `Checked: ${escapeHtml(formatUkDateTime(completedAt))}`,
    "",
  ];

  if (stale.length === 0 && failed.length === 0) {
    lines.push(`<b>All ${total} mosque${total === 1 ? "" : "s"} are up to date.</b> ✅`);
  } else {
    const parts: string[] = [];
    if (ok.length > 0) parts.push(`${ok.length} up to date`);
    if (stale.length > 0) parts.push(`${stale.length} showing old times`);
    if (failed.length > 0) parts.push(`${failed.length} with no data`);
    lines.push(`<b>Summary:</b> ${parts.join(" · ")}`);
  }

  lines.push("");
  lines.push("<pre>");
  lines.push(escapeHtml(buildTable(outcomes)));
  lines.push("</pre>");

  if (stale.length > 0) {
    lines.push("");
    lines.push(`<b>⚠️ Showing old times (${stale.length})</b>`);
    lines.push("The app may still show last month's prayer times for these mosques.");
    lines.push(...formatProblemDetails(outcomes, "stale"));
  }

  if (failed.length > 0) {
    lines.push("");
    lines.push(`<b>❌ No prayer times (${failed.length})</b>`);
    lines.push("These mosques have nothing to show in the app right now.");
    lines.push(...formatProblemDetails(outcomes, "failed"));
  }

  lines.push("");
  lines.push(
    "<i>✅ = fresh times loaded · ⚠️ = kept older saved times · ❌ = nothing available</i>",
  );

  return lines.join("\n").trimEnd();
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf("\n\n", maxLength);
    if (splitAt <= 0) splitAt = remaining.lastIndexOf("\n", maxLength);
    if (splitAt <= 0) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

export async function sendRefreshDump(outcomes: ScrapeOutcome[]): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    console.log("[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set; skipping notification");
    return;
  }

  const text = formatRefreshDump(outcomes);
  const chunks = splitMessage(text, TELEGRAM_MAX_LENGTH);

  try {
    for (const chunk of chunks) {
      await httpClient.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: chunk,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    }
    console.log(`[Telegram] Sent refresh summary (${outcomes.length} mosque(s))`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Telegram] Failed to send notification: ${msg}`);
  }
}
