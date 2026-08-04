import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compute } from "./compute.js";

// The real fuel log is kept out of the repo (see .gitignore / README). When
// it's been generated locally (`npm run seed`) these checks run against it;
// on CI / a clean clone the file is absent and the block is skipped.
const SEED_JSON = join(dirname(fileURLToPath(import.meta.url)), "../../tai-tong-drive-seed.json");
const hasSeed = existsSync(SEED_JSON);
const seedFuel = hasSeed ? JSON.parse(readFileSync(SEED_JSON, "utf8")).fuel : [];

/* Small builder so tests read like the data model: date|litres|reading[,partial]. */
let seq = 0;
const e = (date, litres, reading, opts = {}) => ({
  id: "t" + ++seq,
  createdAt: opts.createdAt ?? ++seq,
  date,
  litres,
  reading,
  ...(opts.partial ? { full: false } : {}),
});

const find = (rows, entry) => rows.find((r) => r.id === entry.id);

describe("compute() — baselines", () => {
  it("the first full fill can't be measured — it's a baseline", () => {
    const rows = compute([e("2020-01-01", 40, 500)]);
    expect(rows[0].kmpl).toBeNull();
    expect(rows[0].distance).toBeNull();
    expect(rows[0].full).toBe(true);
  });

  it("a trip-meter rollover (reading drops) starts a new baseline, no negative distance", () => {
    const rows = compute([
      e("2018-05-13", 36, 9573),
      e("2018-05-21", 38.3, 9904), // measured from 9573
      e("2018-05-28", 39, 205), // rollover near 10,000 -> baseline
      e("2018-06-04", 39.9, 543), // measured from 205
    ]);
    expect(rows[1].kmpl).toBeCloseTo((9904 - 9573) / 38.3, 5);
    expect(rows[2].kmpl).toBeNull(); // the rollover fill
    expect(rows[2].distance).toBeNull();
    expect(rows[3].distance).toBe(543 - 205);
    expect(rows.every((r) => r.distance == null || r.distance >= 0)).toBe(true);
  });
});

describe("compute() — full-to-full method with partials", () => {
  it("partials carry no km/L; their litres fold into the next full tank", () => {
    const first = e("2020-01-01", 40, 0); // baseline (first full)
    const part = e("2020-01-10", 20, 400, { partial: true }); // partial, no kmpl
    const close = e("2020-01-20", 30, 800); // full: distance 800, litres 20+30 = 50
    const rows = compute([first, part, close]);
    expect(find(rows, first).kmpl).toBeNull();
    const partial = find(rows, part);
    expect(partial.kmpl).toBeNull();
    expect(partial.distance).toBeNull();
    const closing = find(rows, close);
    expect(closing.distance).toBe(800);
    expect(closing.kmpl).toBeCloseTo(800 / (20 + 30), 5); // = 16.0
  });

  it("a plain full-to-full span divides distance by that fill's litres", () => {
    const rows = compute([
      e("2020-01-01", 40, 0),
      e("2020-01-10", 38, 380),
    ]);
    expect(rows[1].kmpl).toBeCloseTo(380 / 38, 5); // 10.0
  });
});

describe("compute() — sort stability", () => {
  it("same-day entries keep insertion (createdAt) order, not reading order", () => {
    // Entered high-reading first, then low — but on the same date.
    const rows = compute([
      e("2020-01-01", 40, 0, { createdAt: 1 }),
      e("2020-02-01", 30, 900, { createdAt: 2 }), // entered first for 01 Feb
      e("2020-02-01", 30, 300, { createdAt: 3 }), // entered second, lower reading
    ]);
    // Order must follow createdAt: [0, 900, 300], NOT reading-sorted [0,300,900].
    expect(rows.map((r) => r.reading)).toEqual([0, 900, 300]);
    // Because 900 comes before 300, the last entry is a reading drop -> baseline.
    expect(rows[2].kmpl).toBeNull();
  });
});

describe.skipIf(!hasSeed)("compute() — real seed data sanity", () => {
  const rows = compute(seedFuel);
  const measured = rows.filter((r) => r.kmpl != null);

  it("has the full 385-entry log", () => {
    expect(seedFuel.length).toBe(385);
  });

  it("lifetime average is ~8.6 km/L", () => {
    const avg = measured.reduce((a, r) => a + r.kmpl, 0) / measured.length;
    expect(avg).toBeGreaterThan(8.3);
    expect(avg).toBeLessThan(8.9);
  });

  it("best ~24.2 and worst ~6.3, with no implausible outliers", () => {
    const vals = measured.map((r) => r.kmpl);
    const best = Math.max(...vals);
    const worst = Math.min(...vals);
    expect(best).toBeGreaterThan(20);
    expect(best).toBeLessThan(26);
    expect(worst).toBeGreaterThan(5.5);
    expect(worst).toBeLessThan(7);
    // Every measured value stays in a physically sane band for this car.
    expect(vals.every((v) => v > 5 && v < 26)).toBe(true);
  });

  it("never reports a negative distance", () => {
    expect(rows.every((r) => r.distance == null || r.distance >= 0)).toBe(true);
  });

  it("partial fills never carry their own km/L", () => {
    expect(rows.filter((r) => r.partial).every((r) => r.kmpl == null)).toBe(true);
  });
});
