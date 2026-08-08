/* ---------------------------------------------------------------------------
   DEMO SAMPLE DATA — fabricated, NOT anyone's real log.

   Used to auto-populate a brand-new visit (and the "Load sample data" button)
   so the app can be demoed on someone else's device. Generated relative to
   *today* so the dashboard always looks current, and from a fixed seed so the
   numbers are stable. Realistic for this app's scale: ~38 L full fills, km/L in
   the ~8–9.5 band, a couple of partial top-ups, and one trip-meter rollover
   near 10,000 km (whose distance is unwrapped across the wrap).
--------------------------------------------------------------------------- */

const DAY = 86400000;
const H = 3600 * 1000;

// Small deterministic PRNG so the sample is the same every time it's built.
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSample() {
  const rnd = mulberry32(0x7a17a11); // "TAI TT" ish — any fixed seed
  const N = 34;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fuel = [];
  let reading = 4200; // trip-meter start; rolls over once across the run

  for (let i = 0; i < N; i++) {
    // Newest entry lands ~3 days ago; ~11-day spacing with a little jitter.
    const daysAgo = Math.round((N - 1 - i) * 11 + (rnd() * 4 - 2)) + 3;
    const date = new Date(today.getTime() - daysAgo * DAY).toISOString().slice(0, 10);

    const partial = i % 12 === 7; // a few top-ups
    const litres = partial
      ? Math.round((20 + rnd() * 6) * 10) / 10
      : Math.round((36 + rnd() * 5) * 10) / 10;
    const kmpl = 8.2 + rnd() * 1.4; // ~8.2–9.6
    const dist = Math.round(litres * kmpl);

    reading += dist;
    if (reading > 9999) reading -= 10000; // wraps 9999 -> 0
    reading = Math.round(reading);

    const e = { id: "s" + (i + 1), createdAt: i + 1, date, litres, reading };
    if (partial) e.full = false;
    fuel.push(e);
  }

  const now = Date.now();
  const parking = { deck: "2A", note: "Lot 214, near lift B", ts: now - 5 * H };
  const hist = [
    { deck: "3B", note: "", ts: now - 30 * H },
    { deck: "1A", note: "Lot 88", ts: now - 54 * H },
    { deck: "2Ab", note: "", ts: now - 79 * H },
  ];

  return { fuel, parking, hist };
}
