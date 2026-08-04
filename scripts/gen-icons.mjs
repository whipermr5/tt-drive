/* ---------------------------------------------------------------------------
   Generates the PWA icons from one source: a scaled-up version of the in-app
   MiniGauge (violet dial, hot-red top ticks, amber needle, cream hub). Writes
   the SVG favicon plus rasterised PNGs. Committed outputs mean CI needs no image
   toolchain — re-run `npm run icons` only when the mark changes.
--------------------------------------------------------------------------- */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

// Build the gauge as an SVG. `pad` shrinks the dial toward the centre so a
// maskable icon keeps its content inside the platform's ~80% safe zone.
function gauge({ size = 512, rounded = true, pad = 0 } = {}) {
  const c = size / 2;
  const R = size * 0.34 - pad; // dial radius
  const start = 150, end = 390;
  const ticks = [];
  for (let i = 0; i <= 12; i++) {
    const a = ((start + (i * (end - start)) / 12) * Math.PI) / 180;
    const hot = i > 9;
    const outer = R * 0.86;
    const inner = hot ? R * 0.68 : R * 0.72;
    const x1 = c + Math.cos(a) * inner, y1 = c + Math.sin(a) * inner;
    const x2 = c + Math.cos(a) * outer, y2 = c + Math.sin(a) * outer;
    ticks.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" ` +
      `stroke="${hot ? "#ff6a4a" : "#9d8fff"}" stroke-width="${(hot ? R * 0.05 : R * 0.038).toFixed(1)}" ` +
      `stroke-linecap="round" opacity="${hot ? 1 : 0.9}"/>`
    );
  }
  const na = ((start + (2.4 * (end - start)) / 12) * Math.PI) / 180;
  const nx = c + Math.cos(na) * R * 0.82, ny = c + Math.sin(na) * R * 0.82;
  const bg = rounded
    ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>`
    : `<rect width="${size}" height="${size}" fill="url(#bg)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="80%">
      <stop offset="0%" stop-color="#2a1f57"/>
      <stop offset="55%" stop-color="#141122"/>
      <stop offset="100%" stop-color="#08070f"/>
    </radialGradient>
    <radialGradient id="dial" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#443891"/>
      <stop offset="100%" stop-color="#16112e"/>
    </radialGradient>
  </defs>
  ${bg}
  <circle cx="${c}" cy="${c}" r="${R}" fill="url(#dial)" stroke="#9d8fff" stroke-opacity="0.35" stroke-width="${(R * 0.02).toFixed(1)}"/>
  ${ticks.join("\n  ")}
  <line x1="${c}" y1="${c}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#ffd79a" stroke-width="${(R * 0.06).toFixed(1)}" stroke-linecap="round"/>
  <circle cx="${c}" cy="${c}" r="${(R * 0.1).toFixed(1)}" fill="#fbeed6"/>
</svg>`;
}

const faviconSvg = gauge({ size: 512, rounded: true });
writeFileSync(join(PUBLIC, "favicon.svg"), faviconSvg + "\n");

const targets = [
  { file: "icon-192.png", size: 192, svg: gauge({ size: 512, rounded: true }) },
  { file: "icon-512.png", size: 512, svg: gauge({ size: 512, rounded: true }) },
  // Maskable: full-bleed background, dial pulled in to survive the safe-zone crop.
  { file: "icon-512-maskable.png", size: 512, svg: gauge({ size: 512, rounded: false, pad: 44 }) },
  // iOS apple-touch-icon: 180×180, no transparency (iOS adds its own mask).
  { file: "apple-touch-icon.png", size: 180, svg: gauge({ size: 512, rounded: false }) },
];

for (const t of targets) {
  await sharp(Buffer.from(t.svg))
    .resize(t.size, t.size)
    .png()
    .toFile(join(PUBLIC, t.file));
  console.log("wrote", t.file, `(${t.size}px)`);
}
console.log("wrote favicon.svg");
