import path from "node:path";
import { runScraper } from "../src/scraper";

function parseArgs(argv: string[]): { slugs?: string[] } {
  const mosqueArg = argv.find((a) => a.startsWith("--mosque="));
  if (mosqueArg) {
    const slugs = mosqueArg
      .replace("--mosque=", "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (slugs.length > 0) return { slugs };
  }
  return {};
}

async function main() {
  const { slugs } = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  // Ensure consistent path even if invoked elsewhere.
  process.chdir(path.resolve(repoRoot));
  await runScraper({
    repoRoot: process.cwd(),
    ...(slugs ? { slugs } : {}),
  });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

