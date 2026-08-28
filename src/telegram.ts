import { httpClient } from "./util";
import type { ScrapeOutcome } from "./types";

const TELEGRAM_MAX_LENGTH = 4096;

function formatTimestamp(date: Date): string {
  return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function formatOutcomeLine(outcome: ScrapeOutcome): string {
  if (outcome.status === "ok") {
    const detail = [
      outcome.source,
      outcome.dayCount !== undefined ? `${outcome.dayCount} days` : null,
    ]
      .filter(Boolean)
      .join(", ");
    return `- ${outcome.name}${detail ? ` — ${detail}` : ""}`;
  }
  if (outcome.status === "stale") {
    return `- ${outcome.name} — ${outcome.reason ?? "stale data preserved"}`;
  }
  return `- ${outcome.name} — ${outcome.reason ?? "unknown error"}`;
}

export function formatRefreshDump(outcomes: ScrapeOutcome[], completedAt: Date = new Date()): string {
  const total = outcomes.length;
  const ok = outcomes.filter((o) => o.status === "ok").sort((a, b) => a.name.localeCompare(b.name));
  const stale = outcomes
    .filter((o) => o.status === "stale")
    .sort((a, b) => a.name.localeCompare(b.name));
  const failed = outcomes
    .filter((o) => o.status === "failed")
    .sort((a, b) => a.name.localeCompare(b.name));

  const lines = [
    `Luton prayer times · ${formatTimestamp(completedAt)} · ${total} mosque${total === 1 ? "" : "s"}`,
    "",
  ];

  if (ok.length > 0) {
    lines.push(`OK (${ok.length})`);
    lines.push(...ok.map(formatOutcomeLine));
    lines.push("");
  }
  if (stale.length > 0) {
    lines.push(`STALE (${stale.length})`);
    lines.push(...stale.map(formatOutcomeLine));
    lines.push("");
  }
  if (failed.length > 0) {
    lines.push(`FAILED (${failed.length})`);
    lines.push(...failed.map(formatOutcomeLine));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    let splitAt = remaining.lastIndexOf("\n", maxLength);
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
        disable_web_page_preview: true,
      });
    }
    console.log(`[Telegram] Sent refresh summary (${outcomes.length} mosque(s))`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Telegram] Failed to send notification: ${msg}`);
  }
}
