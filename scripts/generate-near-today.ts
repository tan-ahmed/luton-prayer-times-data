import path from "node:path";
import { ensureDataDirectory, generateNearToday } from "../src/util";

/** Rebuild near-today.json from existing data/ without scraping. */
function main() {
  const repoRoot = path.resolve(process.cwd());
  const dataDir = ensureDataDirectory(repoRoot);
  const out = generateNearToday(repoRoot, dataDir);
  if (!out) {
    console.error("Failed to generate near-today.json");
    process.exitCode = 1;
    return;
  }
  console.log(`Wrote ${out}`);
}

main();
