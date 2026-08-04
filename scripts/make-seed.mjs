/* ---------------------------------------------------------------------------
   Builds the one-time import file from the private raw log.

   The personal fuel log is deliberately NOT in the repo or the build (so the
   public site and repo carry no personal data). This reads the gitignored
   `private/pa-log.txt` and writes `tai-tong-drive-seed.json` — the file you
   send to Pa's phone once and load via Settings -> Restore. Its shape matches
   the app's own backup/export format, so Restore accepts it directly.

   Run: npm run seed
--------------------------------------------------------------------------- */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(root, "private", "pa-log.txt");
const OUT = join(root, "tai-tong-drive-seed.json");

if (!existsSync(RAW)) {
  console.error(`Missing ${RAW}\nPut the raw log there — one line per fill-up: date|litres|trip-reading[|P]`);
  process.exit(1);
}

// date|litres|trip-odometer(km)[|P]  (trailing P marks a partial fill)
const fuel = readFileSync(RAW, "utf8").trim().split("\n").map((ln, i) => {
  const [date, l, r, flag] = ln.trim().split("|");
  const e = { id: "m" + (i + 1), createdAt: i + 1, date, litres: parseFloat(l), reading: parseFloat(r) };
  if (flag === "P") e.full = false;
  return e;
});

const payload = {
  version: 1,
  exportedAt: new Date().toISOString(),
  fuel,
  parking: null,
  hist: [],
  settings: { theme: "dark" },
};

writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");

// Quick sanity read-out so you can eyeball the numbers before sending it over.
let anchor = null, litres = 0, broken = false, prev = null;
const kmpls = [];
for (const e of fuel) {
  const isFull = e.full !== false;
  if (prev != null && e.reading < prev) broken = true;
  litres += e.litres;
  if (isFull) {
    if (anchor != null && !broken && e.reading > anchor && litres > 0) kmpls.push((e.reading - anchor) / litres);
    anchor = e.reading; litres = 0; broken = false;
  }
  prev = e.reading;
}
const avg = kmpls.reduce((a, b) => a + b, 0) / kmpls.length;
console.log(`Wrote ${OUT}`);
console.log(`  ${fuel.length} fill-ups · avg ${avg.toFixed(1)} km/L · best ${Math.max(...kmpls).toFixed(1)} · worst ${Math.min(...kmpls).toFixed(1)}`);
