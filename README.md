# Tai Tong · Drive 🚗

A private fuel-economy and parking companion, made for Pa. Log each fill-up and
see your **km/L** trend; note which HDB carpark deck the car is on. Big text,
high contrast, few taps — built to be easy to read and hard to get lost in.

It's a single-user progressive web app: all data lives in your phone's browser
(`localStorage`), no account and no server. **No personal data is baked into the
app or the repo** — a fresh install starts empty, and an existing history is
loaded in one step via **Settings → Restore** (see below). That keeps the public
code and the deployed site free of anyone's fuel log.

## Running it

```bash
npm install
npm run dev       # local dev server (Vite)
npm test          # unit tests for the efficiency maths (Vitest)
npm run build     # production build -> dist/
npm run preview   # serve the production build locally
```

Requires Node 18+.

## How the numbers work (full-to-full method)

- The number you type is the **trip odometer** — it counts up and rolls over near
  10,000 km back to 0. When the reading drops (rollover or a manual reset), that
  fill becomes a *baseline*: no distance is claimed, and the next fill measures
  from it.
- Efficiency is only computed at **full** tanks. Between two full tanks the fuel
  burned is every litre added in between (any partial top-ups + the closing fill),
  and km/L = distance since the last full tank ÷ that total. Partial fills carry
  no km/L of their own — their fuel folds into the next full tank.
- Default is **full**. Mis-marking is asymmetric: calling a full fill "partial" is
  harmless (spans merge), but calling a partial "full" corrupts a span. Any entry's
  full/partial state can be toggled by editing it.

The logic lives in `src/lib/compute.js` and is covered by `src/lib/compute.test.js`
(rollover, baseline, full-to-full partials, same-day sort order, and sanity checks
against the real seed data).

## First-run setup (loading the history) — privacy model

The fuel log is personal, so it is deliberately kept **out of the repo and out of
the build**. It lives only in two private places: the phone (localStorage, after a
one-time import) and a backup JSON file you keep. Nothing on the public internet
ever holds it.

To prepare the import file:

1. Put the raw log at `private/pa-log.txt` — one line per fill-up,
   `date|litres|trip-reading[|P]` (a trailing `P` marks a partial fill). This
   folder is gitignored and never committed.
2. Run `npm run seed`. It writes `tai-tong-drive-seed.json` (also gitignored) — the
   same JSON shape the app's own **Back up** produces — and prints a sanity summary
   (count · avg · best · worst).
3. Send that file to the phone privately (AirDrop / WhatsApp / email to yourself),
   open the app, and go **Settings → Restore** to load it. Done once, forever.

## Backing up the data (important)

The data is 10 years of hand-kept history — protect it. In **Settings → Your data**:

- **Back up** downloads everything (fill-ups, parking, settings) as one JSON file.
- **Restore** loads a backup back in — use it on a new phone, after a browser clear,
  or for the first-run setup above.

Do a backup now and then, and keep the file somewhere safe (email it to yourself,
save to cloud storage).

## Project layout

```
src/
  App.jsx            all the React UI (Home / Fuel / Parking / Settings)
  main.jsx           React entry point
  global.css         minimal reset (no backdrop blur — it broke Android WebView)
  lib/
    compute.js       efficiency maths + format helpers (pure, tested)
    theme.js         dark / light palettes, fonts, deck list
    storage.js       localStorage load/save helpers
    compute.test.js  unit tests
public/
  manifest.webmanifest, favicon.svg, icon-*.png, apple-touch-icon.png
scripts/
  gen-icons.mjs      regenerates the icons from the gauge mark
  make-seed.mjs      builds the private import file from private/pa-log.txt
private/             (gitignored) the raw personal log — never committed
```

## Install it on a phone (Add to Home Screen)

Once deployed, open the site on the phone:

- **iOS (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** menu → *Install app* / *Add to Home screen*.

It launches fullscreen with the gauge icon — no browser chrome.

## Deploying (GitHub Pages)

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and publishes on
every push to `claude/productionise-jo80kf` (and `main`). **One-time setup:** in the
repo, go to **Settings → Pages → Build and deployment → Source** and choose
**GitHub Actions**. After the next push the site is live at:

```
https://whipermr5.github.io/tt-drive/
```

The project is served from the `/tt-drive/` sub-path, set via `base` in
`vite.config.js`. If you ever move it to a root domain (custom domain or a
`*.github.io` user site), change `base` to `"/"`.

### Regenerating icons

Icons are committed, so CI doesn't need an image toolchain. If you change the mark,
run `npm run icons` (uses `sharp`) and commit the updated PNGs + `favicon.svg`.

---

*Made for Pa · Tai Tong* 🚗
