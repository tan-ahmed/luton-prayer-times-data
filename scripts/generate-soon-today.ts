import path from "node:path";
import { ensureDataDirectory, generateSoonToday } from "../src/util";

/** Rebuild soon-today.json from existing data/ without scraping. */
function main() {
  const repoRoot = path.resolve(process.cwd());
  const dataDir = ensureDataDirectory(repoRoot);
  const out = generateSoonToday(repoRoot, dataDir);
  if (!out) {
    console.error("Failed to generate soon-today.json");
    process.exitCode = 1;
    return;
  }
  console.log(`Wrote ${out}`);
}

main();
