/* ---------------------------------------------------------------------------
   EFFICIENCY MATHS (full-to-full method) + format helpers.  Pure, unit-tested.

   The reading logged is the car's TRIP odometer, which accumulates and rolls
   over near 10,000 km back to 0 (it is NOT the master odometer). Distance for a
   fill = current reading − previous reading. If the reading DROPS (rollover or a
   manual reset), that entry becomes a BASELINE — no distance/efficiency is
   claimed — and the next fill measures from it.

   Between two FULL tanks the tank starts and ends full, so fuel burned = all
   fuel added in between (the partials) plus this fill's litres. km/L =
   (odometer distance since the last full) ÷ (that summed litres). Partial fills
   carry no km/L of their own; their fuel folds into the next full tank.

   Sort is by date, then createdAt (insertion order), then reading — so same-day
   entries keep the order they were entered. Do NOT sort by reading alone.
--------------------------------------------------------------------------- */
export function compute(entries) {
  const sorted = [...entries].sort(
    (a, b) =>
      new Date(a.date) - new Date(b.date) ||
      (a.createdAt || 0) - (b.createdAt || 0) ||
      a.reading - b.reading
  );
  let anchor = null; // odometer at last full fill (start of current span)
  let litres = 0; // litres accumulated since anchor (partials + this fill)
  let broken = false; // a meter reset happened somewhere in the current span
  let prev = null; // previous reading, for reset detection
  return sorted.map((e) => {
    const isFull = e.full !== false; // default full
    if (prev != null && e.reading < prev) broken = true;
    litres += e.litres;
    let distance = null;
    let kmpl = null;
    if (isFull) {
      if (anchor != null && !broken && e.reading > anchor && litres > 0) {
        distance = e.reading - anchor;
        kmpl = distance / litres;
      }
      anchor = e.reading;
      litres = 0;
      broken = false;
    }
    prev = e.reading;
    return { ...e, full: isFull, partial: !isFull, distance, kmpl };
  });
}

/* ---------------- format helpers ------------------------------------------- */
export const f1 = (n) => (n == null ? "—" : n.toFixed(1));

export const shortDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

// Like shortDate, but adds the year when the entry isn't from the current year —
// so scrolling into past years in the history stays unambiguous.
export const historyDate = (iso) => {
  const d = new Date(iso + "T00:00:00");
  const opts = { day: "numeric", month: "short" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("en-GB", opts);
};

export const timeAgo = (ts) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
};
