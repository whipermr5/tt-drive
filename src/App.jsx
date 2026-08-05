import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Fuel, MapPin, TrendingUp, Plus, Trash2, X, Settings, Check, Pencil,
  Sun, Moon, Monitor, ChevronLeft, ChevronRight, Download, Upload,
} from "lucide-react";

import { makeTheme, ThemeCtx, useTheme, lcdFont, uiFont, DECKS } from "./lib/theme.js";
import { compute, f1, shortDate, timeAgo } from "./lib/compute.js";
import { hasStore, load, save } from "./lib/storage.js";

/* ---------------------------------------------------------------------------
   TAI TONG · DRIVE
   A private fuel + parking companion, themed after his Civic's dashboard:
   violet gauge glow, warm numerals, and a blue LCD readout for the deck.
   Tuned for easy reading: high contrast, larger + bolder secondary text.

   Data lives only in this browser (localStorage) — no account, no server, and
   deliberately no personal data baked into the app. A fresh install starts
   empty; load an existing history in one step via Settings -> Restore.
--------------------------------------------------------------------------- */

/* ---------------- smooth scroll to top ------------------------------------- */
const scrollWindowTop = () => {
  try { window.scrollTo({ top: 0, behavior: "smooth" }); }
  catch { try { window.scrollTo(0, 0); } catch {} }
};

/* ---------------- mini tachometer logo (echoes his gauge) ------------------ */
function MiniGauge({ size = 46 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const ticks = [];
  const start = 150, end = 390;
  for (let i = 0; i <= 12; i++) {
    const a = ((start + (i * (end - start)) / 12) * Math.PI) / 180;
    const inner = i > 9 ? r - 3 : r - 4;
    ticks.push(
      <line key={i}
        x1={cx + Math.cos(a) * (r - 8)} y1={cy + Math.sin(a) * (r - 8)}
        x2={cx + Math.cos(a) * inner} y2={cy + Math.sin(a) * inner}
        stroke={i > 9 ? "#ff6a4a" : "#9d8fff"} strokeWidth={i > 9 ? 2.2 : 1.6}
        strokeLinecap="round" opacity={i > 9 ? 1 : 0.9} />
    );
  }
  const na = ((start + (2.4 * (end - start)) / 12) * Math.PI) / 180;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="gg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#443891" />
          <stop offset="100%" stopColor="#16112e" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r - 1} fill="url(#gg)" />
      {ticks}
      <line x1={cx} y1={cy} x2={cx + Math.cos(na) * (r - 9)} y2={cy + Math.sin(na) * (r - 9)}
        stroke="#ffd79a" strokeWidth={2} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={2.6} fill="#fbeed6" />
    </svg>
  );
}

/* ---------------- efficiency trend chart ----------------------------------- */
function Chart({ data }) {
  const T = useTheme();
  const W = 320, Hh = 152, padL = 8, padR = 8, padT = 18, padB = 24;
  const pts = data.filter((d) => d.kmpl != null);
  if (pts.length < 2)
    return (
      <div style={{ color: T.muted, fontSize: 14, fontWeight: 500, padding: "28px 4px", textAlign: "center", fontFamily: uiFont }}>
        Log two fill-ups and your efficiency trend appears here.
      </div>
    );
  const ys = pts.map((p) => p.kmpl);
  let min = Math.min(...ys), max = Math.max(...ys);
  const span = max - min || 1;
  min -= span * 0.35; max += span * 0.35;
  const avg = ys.reduce((a, b) => a + b, 0) / ys.length;
  const px = (i) => padL + (i * (W - padL - padR)) / (pts.length - 1);
  const py = (v) => padT + (1 - (v - min) / (max - min)) * (Hh - padT - padB);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(p.kmpl).toFixed(1)}`).join(" ");
  const area = `${line} L${px(pts.length - 1)},${Hh - padB} L${px(0)},${Hh - padB} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${Hh}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.violet} stopOpacity="0.45" />
          <stop offset="100%" stopColor={T.violet} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={padL} y1={py(avg)} x2={W - padR} y2={py(avg)} stroke={T.mutedDim} strokeWidth="1.2" strokeDasharray="3 4" />
      <text x={W - padR} y={py(avg) - 5} fill={T.muted} fontSize="11" fontWeight="600" textAnchor="end" fontFamily={uiFont}>avg {f1(avg)}</text>
      <path d={area} fill="url(#fill)" />
      <path d={line} fill="none" stroke={T.amberHot} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={p.id}>
          <circle cx={px(i)} cy={py(p.kmpl)} r={i === pts.length - 1 ? 4.5 : 3} fill={T.amberHot} />
          {i === pts.length - 1 && <circle cx={px(i)} cy={py(p.kmpl)} r={7.5} fill="none" stroke={T.amberHot} strokeOpacity="0.4" />}
        </g>
      ))}
      <text x={px(0)} y={Hh - 6} fill={T.muted} fontSize="11" fontWeight="600" fontFamily={uiFont}>{shortDate(pts[0].date)}</text>
      <text x={px(pts.length - 1)} y={Hh - 6} fill={T.muted} fontSize="11" fontWeight="600" textAnchor="end" fontFamily={uiFont}>{shortDate(pts[pts.length - 1].date)}</text>
    </svg>
  );
}

/* ---------------- shared bits ---------------------------------------------- */
const Panel = ({ children, style }) => {
  const T = useTheme();
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 20, padding: 16, ...style }}>
      {children}
    </div>
  );
};
const Label = ({ children, color }) => {
  const T = useTheme();
  return (
    <div style={{ fontSize: 12.5, letterSpacing: 0.8, textTransform: "uppercase", color: color || T.muted, fontWeight: 800, fontFamily: uiFont }}>
      {children}
    </div>
  );
};

/* ---------------- add / edit fuel form ------------------------------------- */
function FuelForm({ initial, entries, onSave, onCancel }) {
  const T = useTheme();
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [litres, setLitres] = useState(initial ? String(initial.litres) : "");
  const [reading, setReading] = useState(initial ? String(initial.reading) : "");
  const [full, setFull] = useState(initial?.full !== false);

  const L = parseFloat(litres);
  const R = parseFloat(reading);
  const valid = !isNaN(L) && L > 0 && !isNaN(R);

  // Live preview reuses the real compute() so it always matches the saved result.
  let preview = null;
  if (valid) {
    const cand = {
      id: initial?.id || "__preview__",
      createdAt: initial?.createdAt ?? Number.MAX_SAFE_INTEGER,
      date, litres: L, reading: R, full,
    };
    const base = entries.filter((e) => e.id !== initial?.id);
    preview = compute([...base, cand]).find((e) => e.id === cand.id) || null;
  }

  // Placeholder for the trip reading: an estimated odometer = last reading +
  // (average km/L x litres entered). Falls back to the last reading, then a sample.
  const hist = useMemo(() => {
    const s = compute(entries.filter((e) => e.id !== initial?.id));
    const m = s.filter((e) => e.kmpl != null);
    return {
      last: s.length ? s[s.length - 1].reading : null,
      avg: m.length ? m.reduce((a, e) => a + e.kmpl, 0) / m.length : null,
    };
  }, [entries, initial]);
  let readingPlaceholder = "3346.6";
  if (hist.last != null) {
    readingPlaceholder = (!isNaN(L) && L > 0 && hist.avg)
      ? String(Math.round((hist.last + hist.avg * L) % 10000))
      : String(hist.last);
  }

  const field = {
    width: "100%", background: T.inputBg, border: `1.5px solid ${T.line}`, borderRadius: 12,
    padding: "14px 14px", color: T.amber, fontSize: 18, fontWeight: 600, fontFamily: lcdFont, outline: "none", boxSizing: "border-box",
  };

  return (
    <Panel style={{ borderColor: T.violet }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ color: T.amber, fontWeight: 800, fontSize: 17, fontFamily: uiFont }}>{initial ? "Edit fill-up" : "New fill-up"}</div>
        {onCancel && <button onClick={onCancel} style={{ background: "none", border: "none", color: T.muted, padding: 4 }}><X size={22} /></button>}
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <Label>Date</Label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...field, marginTop: 7 }} />
        </div>
        <div>
          <Label>Litres pumped</Label>
          <input type="number" inputMode="decimal" step="0.1" placeholder="38.9" value={litres}
            onChange={(e) => setLitres(e.target.value)} style={{ ...field, marginTop: 7 }} />
        </div>
        <div>
          <Label>Trip meter reading (km)</Label>
          <input type="number" inputMode="decimal" step="0.1" placeholder={readingPlaceholder} value={reading}
            onChange={(e) => setReading(e.target.value)} style={{ ...field, marginTop: 7 }} />
          <div style={{ color: T.muted, fontSize: 13.5, fontWeight: 500, marginTop: 7, fontFamily: uiFont, lineHeight: 1.4 }}>
            Read straight off the dash — the app works out the distance since your last full tank.
          </div>
        </div>

        <button type="button" onClick={() => setFull(!full)}
          style={{ display: "flex", alignItems: "center", gap: 11, background: "none", border: "none", padding: "2px 0", textAlign: "left", marginTop: 2 }}>
          <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 7, border: `2px solid ${full ? T.violet : T.line}`, background: full ? T.violet : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {full && <Check size={16} color="#fff" strokeWidth={3} />}
          </span>
          <span style={{ color: T.muted, fontSize: 14.5, fontWeight: 600, fontFamily: uiFont }}>Filled up the tank</span>
        </button>
      </div>

      <div style={{ marginTop: 16, padding: "15px 16px", borderRadius: 14, background: T.effPreviewBg, border: `1.5px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Label>{full ? "This tank" : "Partial fill"}</Label>
          <div style={{ color: T.amberHot, fontSize: 30, fontFamily: lcdFont, fontWeight: 700, lineHeight: 1.1, marginTop: 2 }}>
            {preview && preview.kmpl ? f1(preview.kmpl) : "—"}<span style={{ fontSize: 14, color: T.muted, fontWeight: 700, marginLeft: 6 }}>km/L</span>
          </div>
        </div>
        <div style={{ textAlign: "right", color: T.muted, fontSize: 13.5, fontWeight: 600, fontFamily: uiFont }}>
          {!valid
            ? "enter litres & reading"
            : !full
              ? "counts toward your next full tank"
              : preview && preview.kmpl
                ? `${f1(preview.distance)} km since last full`
                : "new baseline — measures from here"}
          {full && preview && preview.kmpl ? <div style={{ color: T.mutedDim, marginTop: 2 }}>{f1(100 / preview.kmpl)} L / 100 km</div> : null}
        </div>
      </div>

      <button disabled={!valid}
        onClick={() => onSave({
          id: initial?.id || (crypto?.randomUUID?.() || String(Math.random())),
          createdAt: initial?.createdAt ?? Date.now(),
          date, litres: Math.round(L * 10) / 10, reading: Math.round(R * 10) / 10,
          full: full ? undefined : false,
        })}
        style={{
          marginTop: 16, width: "100%", padding: "16px", borderRadius: 14, border: "none", fontSize: 17, fontWeight: 800, fontFamily: uiFont,
          color: valid ? T.onAmber : T.mutedDim,
          background: valid ? `linear-gradient(135deg, ${T.amberHot}, ${T.amber2})` : T.panelSolid, opacity: valid ? 1 : 0.6,
        }}>
        {initial ? "Update fill-up" : "Save fill-up"}
      </button>
    </Panel>
  );
}

/* ================================ APP ===================================== */
export default function App() {
  const [tab, setTab] = useState("home");
  const [loaded, setLoaded] = useState(false);
  const [fuel, setFuel] = useState([]);
  const [parking, setParking] = useState(null);
  const [hist, setHist] = useState([]);
  const [settings, setSettings] = useState({ theme: "dark" });
  const [editing, setEditing] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState("");
  const [toastShow, setToastShow] = useState(false);
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg); setToastShow(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2400);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : true
  );

  // follow the device setting when "Match device" is chosen
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemDark(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else if (mq.addListener) mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else if (mq.removeListener) mq.removeListener(handler);
    };
  }, []);

  const themePref = settings.theme || "dark";
  const resolvedMode = themePref === "system" ? (systemDark ? "dark" : "light") : themePref;
  const T = useMemo(() => makeTheme(resolvedMode), [resolvedMode]);

  // Keep the browser/OS chrome (status bar, PWA splash) in step with the theme.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", T.mode === "dark" ? "#08070f" : "#f1eff9");
  }, [T.mode]);

  // Initial load — synchronous localStorage. A fresh install starts empty;
  // an existing history is brought in via Settings -> Restore (import).
  useEffect(() => {
    const store = hasStore();
    setFuel(store ? load("tt:fuel", []) : []);
    setParking(store ? load("tt:parking", null) : null);
    setHist(store ? load("tt:hist", []) : []);
    const s = store ? load("tt:settings", null) : null;
    setSettings(s && s.theme ? s : { theme: "dark" });
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) save("tt:fuel", fuel); }, [fuel, loaded]);
  useEffect(() => { if (loaded) save("tt:parking", parking); }, [parking, loaded]);
  useEffect(() => { if (loaded) save("tt:hist", hist); }, [hist, loaded]);
  useEffect(() => { if (loaded) save("tt:settings", settings); }, [settings, loaded]);

  useEffect(() => { scrollWindowTop(); }, [tab]);
  useEffect(() => { if (editing) scrollWindowTop(); }, [editing]);

  const computed = useMemo(() => compute(fuel), [fuel]);
  const withEff = computed.filter((e) => e.kmpl != null);
  const latest = withEff[withEff.length - 1] || null;
  const prev = withEff[withEff.length - 2] || null;
  const stats = useMemo(() => {
    if (!withEff.length) return null;
    const vals = withEff.map((e) => e.kmpl);
    return {
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      totalKm: computed.reduce((a, e) => a + (e.distance || 0), 0),
      totalL: fuel.reduce((a, e) => a + (e.litres || 0), 0),
      count: fuel.length,
    };
  }, [computed, withEff, fuel]);

  const saveFuel = (entry) => {
    const exists = fuel.some((e) => e.id === entry.id);
    const next = exists ? fuel.map((e) => (e.id === entry.id ? entry : e)) : [...fuel, entry];
    setFuel(next);
    setEditing(null);
    const c = compute(next).find((e) => e.id === entry.id);
    const msg = c && c.partial
      ? "Partial fill saved"
      : c && c.kmpl
        ? `Fill-up saved · ${c.kmpl.toFixed(1)} km/L`
        : "Fill-up saved";
    showToast(msg);
    scrollWindowTop();
  };
  const delFuel = (id) => setFuel((p) => p.filter((e) => e.id !== id));

  // ---- data export / import (protects his 10-year history) ------------------
  const exportData = () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), fuel, parking, hist, settings };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tai-tong-drive-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(`Saved a backup of ${fuel.length} fill-ups`);
    } catch {
      showToast("Couldn't export on this device");
    }
  };

  const importData = (obj) => {
    if (!obj || !Array.isArray(obj.fuel)) {
      showToast("That file didn't look right");
      return;
    }
    setFuel(obj.fuel);
    setParking(obj.parking ?? null);
    setHist(Array.isArray(obj.hist) ? obj.hist : []);
    if (obj.settings && obj.settings.theme) setSettings(obj.settings);
    setShowSettings(false);
    setTab("home");
    showToast(`Restored ${obj.fuel.length} fill-ups`);
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  const wrap = { minHeight: "100vh", background: T.wrapBg, color: T.amber, fontFamily: uiFont, paddingBottom: 92, transition: "background 0.3s" };
  const container = { maxWidth: 440, margin: "0 auto", padding: "0 16px" };

  if (!loaded)
    return (
      <ThemeCtx.Provider value={T}>
        <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <MiniGauge size={64} />
            <div style={{ color: T.muted, marginTop: 12, letterSpacing: 3, fontSize: 13, fontWeight: 700 }}>WARMING UP…</div>
          </div>
        </div>
      </ThemeCtx.Provider>
    );

  return (
    <ThemeCtx.Provider value={T}>
      <div style={wrap}>
        <div style={{ position: "fixed", top: 14, left: 0, right: 0, display: "flex", justifyContent: "center", padding: "0 16px", zIndex: 60, pointerEvents: "none" }}>
          {toast && (
            <div style={{ maxWidth: 408, width: "100%", background: T.toastBg, color: T.toastInk, border: `1.5px solid ${T.line}`, borderRadius: 14, padding: "14px 16px", fontSize: 15, fontWeight: 800, fontFamily: uiFont, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", opacity: toastShow ? 1 : 0, transform: toastShow ? "translateY(0)" : "translateY(-14px)", transition: "opacity 0.28s, transform 0.28s" }}>
              <Check size={20} /> {toast}
            </div>
          )}
        </div>
        <div style={{ ...container, paddingTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <MiniGauge />
          <div style={{ flex: 1 }}>
            <div style={{ color: T.muted, fontSize: 14, fontWeight: 600, letterSpacing: 0.5 }}>{greeting},</div>
            <div style={{ fontSize: 23, fontWeight: 800, color: T.amber, letterSpacing: 0.3 }}>Tai Tong</div>
          </div>
          <button onClick={() => setShowSettings(true)}
            style={{ background: T.panel, border: `1.5px solid ${T.line}`, borderRadius: 12, padding: 10, color: T.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Settings size={20} />
          </button>
        </div>

        <div style={{ ...container, marginTop: 18 }}>
          {tab === "home" && (
            <Home parking={parking} latest={latest} prev={prev} trend={withEff}
              onGoFuel={() => setTab("fuel")} onGoPark={() => setTab("parking")}
              onLogFuel={() => { setEditing("new"); setTab("fuel"); }} />
          )}
          {tab === "fuel" && (
            <FuelPage computed={computed} stats={stats} editing={editing} setEditing={setEditing}
              entries={fuel} saveFuel={saveFuel} delFuel={delFuel} />
          )}
          {tab === "parking" && (
            <ParkingPage parking={parking} hist={hist}
              onSave={(p) => {
                if (parking) setHist((h) => [parking, ...h].slice(0, 6));
                setParking(p);
                showToast(`Saved — car is at ${p.deck}${p.note ? ` · ${p.note}` : ""}`);
                setTab("home");
              }} />
          )}
        </div>

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: T.mode === "dark" ? "#0b0916" : "#f6f4fc", borderTop: `1px solid ${T.line}` }}>
          <div style={{ maxWidth: 440, margin: "0 auto", display: "flex", padding: "10px 16px 22px" }}>
            {[
              { k: "home", label: "At a glance", icon: TrendingUp },
              { k: "fuel", label: "Fuel", icon: Fuel },
              { k: "parking", label: "Parking", icon: MapPin },
            ].map(({ k, label, icon: Icon }) => {
              const on = tab === k;
              return (
                <button key={k} onClick={() => setTab(k)}
                  style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, color: on ? T.amberHot : T.mutedDim }}>
                  <Icon size={23} strokeWidth={on ? 2.6 : 2} />
                  <span style={{ fontSize: 12, fontWeight: on ? 800 : 600 }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {showSettings && (
          <SettingsSheet settings={settings} setSettings={setSettings} onClose={() => setShowSettings(false)}
            onExport={exportData} onImport={importData}
            onReset={() => { setFuel([]); setParking(null); setHist([]); setShowSettings(false); setTab("home"); showToast("Data cleared"); }} />
        )}
      </div>
    </ThemeCtx.Provider>
  );
}

/* ---------------- HOME ----------------------------------------------------- */
function Home({ parking, latest, prev, trend, onGoFuel, onGoPark, onLogFuel }) {
  const T = useTheme();
  const delta = latest && prev ? latest.kmpl - prev.kmpl : null;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div onClick={onGoPark} style={{ borderRadius: 22, padding: 20, background: T.homeParkBg, border: `1px solid ${T.line}`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -30, top: -30, width: 140, height: 140, borderRadius: "50%", background: `radial-gradient(circle, ${T.glow}, transparent 70%)` }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.lcd }}>
          <MapPin size={17} /><Label color={T.lcd}>Car is parked at</Label>
        </div>
        {parking ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 10, fontFamily: lcdFont }}>
              <span style={{ fontSize: 52, fontWeight: 700, color: T.lcd, letterSpacing: 1, lineHeight: 1 }}>{parking.deck}</span>
            </div>
            {parking.note && <div style={{ color: T.muted, fontWeight: 600, marginTop: 9, fontSize: 15.5 }}>{parking.note}</div>}
            <div style={{ color: T.muted, fontWeight: 600, marginTop: 6, fontSize: 14 }}>Parked {timeAgo(parking.ts)}</div>
          </>
        ) : (
          <div style={{ marginTop: 12, color: T.muted, fontWeight: 600, fontSize: 16 }}>No spot saved yet. Tap to note where you parked.</div>
        )}
      </div>

      <div onClick={onGoFuel} style={{ borderRadius: 22, padding: 20, background: T.homeFuelBg, border: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.violet }}>
          <Fuel size={17} /><Label color={T.violet}>Latest efficiency</Label>
        </div>
        {latest ? (
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ fontFamily: lcdFont }}>
              <span style={{ fontSize: 52, fontWeight: 700, color: T.amberHot, lineHeight: 1 }}>{f1(latest.kmpl)}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: T.muted, marginLeft: 8 }}>km/L</span>
              {delta != null && Math.abs(delta) >= 0.05 && (
                <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 6, color: delta >= 0 ? T.green : T.red }}>
                  {delta >= 0 ? "▲" : "▼"} {f1(Math.abs(delta))} vs last fill
                </div>
              )}
            </div>
            <div style={{ width: 96, opacity: 0.95 }}><MiniSpark data={trend} /></div>
          </div>
        ) : (
          <div style={{ marginTop: 12, color: T.muted, fontWeight: 600, fontSize: 16 }}>Log your first fill-up to begin tracking.</div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <QuickBtn icon={Plus} label="Log fuel" onClick={onLogFuel} />
        <QuickBtn icon={MapPin} label="Set parking" onClick={onGoPark} />
      </div>
    </div>
  );
}

function QuickBtn({ icon: Icon, label, onClick }) {
  const T = useTheme();
  return (
    <button onClick={onClick}
      style={{ flex: 1, padding: "17px 12px", borderRadius: 16, border: `1.5px solid ${T.line}`, background: T.panel, color: T.amber, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 800, fontFamily: uiFont }}>
      <Icon size={24} color={T.violet} strokeWidth={2.4} />{label}
    </button>
  );
}

function MiniSpark({ data }) {
  const T = useTheme();
  const pts = data.filter((d) => d.kmpl != null).slice(-8);
  if (pts.length < 2) return null;
  const W = 96, Hh = 42;
  const ys = pts.map((p) => p.kmpl);
  const min = Math.min(...ys), max = Math.max(...ys), span = max - min || 1;
  const px = (i) => (i * W) / (pts.length - 1);
  const py = (v) => 4 + (1 - (v - min) / span) * (Hh - 8);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(p.kmpl).toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={Hh}>
      <path d={d} fill="none" stroke={T.violet} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={px(pts.length - 1)} cy={py(pts[pts.length - 1].kmpl)} r="3.2" fill={T.amberHot} />
    </svg>
  );
}

/* ---------------- FUEL ----------------------------------------------------- */
function FuelPage({ computed, stats, editing, setEditing, entries, saveFuel, delFuel }) {
  const T = useTheme();
  const editEntry = editing && editing !== "new" ? computed.find((e) => e.id === editing) : null;
  const rows = [...computed].reverse();

  // Efficiency trend paginated into N-month windows (page 0 = most recent).
  const N = 12;
  const [page, setPage] = useState(0);
  const measured = useMemo(() => computed.filter((e) => e.kmpl != null), [computed]);
  const monthYr = (d) => d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  let windowData = measured, periodLabel = "", canPrev = false, canNext = false, paged = false;
  if (measured.length) {
    const latest = new Date(measured[measured.length - 1].date + "T00:00:00");
    const upper = new Date(latest); upper.setMonth(upper.getMonth() - page * N);
    const lower = new Date(upper); lower.setMonth(lower.getMonth() - N);
    windowData = measured.filter((e) => { const d = new Date(e.date + "T00:00:00"); return d > lower && d <= upper; });
    const start = new Date(upper); start.setMonth(start.getMonth() - (N - 1));
    periodLabel = `${monthYr(start)} – ${monthYr(upper)}`;
    canPrev = measured.some((e) => new Date(e.date + "T00:00:00") <= lower);
    canNext = page > 0;
    paged = canPrev || page > 0;
  }
  const navBtn = (enabled) => ({
    display: "flex", alignItems: "center", justifyContent: "center", width: 42, height: 38,
    borderRadius: 11, border: `1.5px solid ${T.line}`, background: T.inputBg,
    color: enabled ? T.violet : T.mutedDim, opacity: enabled ? 1 : 0.4,
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {editing ? (
        <FuelForm key={editing} initial={editEntry || null} entries={entries} onSave={saveFuel} onCancel={() => setEditing(null)} />
      ) : (
        <button onClick={() => setEditing("new")}
          style={{ padding: "17px", borderRadius: 16, border: "none", background: `linear-gradient(135deg, ${T.violetDeep}, ${T.violet})`, color: "#fff", fontSize: 17, fontWeight: 800, fontFamily: uiFont, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Plus size={22} /> Log a fill-up
        </button>
      )}

      {stats && (
        <>
          <Panel>
            <Label>Efficiency trend · km/L</Label>
            {paged && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0 2px" }}>
                <button onClick={() => canPrev && setPage(page + 1)} disabled={!canPrev} style={navBtn(canPrev)}>
                  <ChevronLeft size={22} strokeWidth={2.6} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.amber, fontFamily: uiFont }}>{periodLabel}</span>
                <button onClick={() => canNext && setPage(page - 1)} disabled={!canNext} style={navBtn(canNext)}>
                  <ChevronRight size={22} strokeWidth={2.6} />
                </button>
              </div>
            )}
            <div style={{ marginTop: paged ? 4 : 10 }}>
              <Chart data={windowData} />
            </div>
          </Panel>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Stat label="Average" value={f1(stats.avg)} unit="km/L" hot />
            <Stat label="Distance logged" value={Math.round(stats.totalKm).toLocaleString()} unit="km" />
            <Stat label="Fuel pumped" value={f1(stats.totalL)} unit="L" />
            <Stat label="Fill-ups logged" value={stats.count.toLocaleString()} unit="" />
          </div>
        </>
      )}

      {rows.length > 0 && (
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 8px" }}><Label>History</Label></div>
          {rows.map((e, i) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: i === 0 ? "none" : `1px solid ${T.line}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5, color: T.amber, fontWeight: 800 }}>{shortDate(e.date)}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.muted, fontFamily: lcdFont, marginTop: 3 }}>
                  {f1(e.litres)} L{e.partial ? " · partial" : e.distance != null ? ` · ${f1(e.distance)} km` : " · baseline"}
                </div>
              </div>
              <div style={{ fontFamily: lcdFont, fontSize: 21, fontWeight: 700, color: e.kmpl ? T.amberHot : T.mutedDim, minWidth: 66, textAlign: "right" }}>
                {e.kmpl ? f1(e.kmpl) : "—"}{e.kmpl && <span style={{ fontSize: 11, fontWeight: 700, color: T.muted }}> km/L</span>}
              </div>
              <button onClick={() => setEditing(e.id)} style={{ background: "none", border: "none", color: T.muted, padding: 5 }}><Pencil size={18} /></button>
              <button onClick={() => delFuel(e.id)} style={{ background: "none", border: "none", color: T.muted, padding: 5 }}><Trash2 size={18} /></button>
            </div>
          ))}
        </Panel>
      )}

      {!stats && !editing && (
        <div style={{ color: T.muted, fontWeight: 600, textAlign: "center", fontSize: 15, padding: "12px 0" }}>No fill-ups yet.</div>
      )}
    </div>
  );
}

function Stat({ label, value, unit, hot }) {
  const T = useTheme();
  return (
    <Panel style={{ padding: 15 }}>
      <Label>{label}</Label>
      <div style={{ fontFamily: lcdFont, marginTop: 7 }}>
        <span style={{ fontSize: 27, fontWeight: 700, color: hot ? T.amberHot : T.amber }}>{value}</span>
        {unit && <span style={{ fontSize: 13.5, fontWeight: 700, color: T.muted, marginLeft: 5 }}>{unit}</span>}
      </div>
    </Panel>
  );
}

/* ---------------- PARKING -------------------------------------------------- */
function ParkingPage({ parking, hist, onSave }) {
  const T = useTheme();
  // Start with nothing selected — saving parking always records a NEW spot, so
  // pre-highlighting the last deck made it look like you were editing that entry.
  const [deck, setDeck] = useState(null);
  const [customText, setCustomText] = useState("");
  const [otherOpen, setOtherOpen] = useState(false);
  const [detail, setDetail] = useState("");
  const otherRef = useRef(null);

  useEffect(() => { if (otherOpen && otherRef.current) otherRef.current.focus(); }, [otherOpen]);

  const field = {
    width: "100%", background: T.inputBg, border: `1.5px solid ${T.line}`, borderRadius: 12,
    padding: "14px 14px", color: T.amber, fontSize: 17, fontWeight: 600, fontFamily: uiFont, outline: "none", boxSizing: "border-box",
  };

  const handleSave = () => {
    if (!deck) return;
    onSave({ deck, note: detail.trim(), ts: Date.now() });
    setDetail("");
  };

  // Show where the car is now (if known) at the top of the list, then history.
  const recent = parking ? [parking, ...hist] : hist;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Panel>
        <Label>Pick the deck</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
          {DECKS.map((d) => {
            const on = deck === d && !otherOpen;
            return (
              <button key={d} onClick={() => { setDeck(d); setCustomText(""); setOtherOpen(false); }}
                style={{ padding: "17px 4px", borderRadius: 14, border: on ? `2px solid ${T.lcd}` : `1.5px solid ${T.line}`, background: on ? T.deckOnBg : T.inputBg, color: on ? T.lcd : T.muted, fontSize: 19, fontWeight: 800, fontFamily: lcdFont }}>
                {d}
              </button>
            );
          })}
          <button key="__other" onClick={() => { setOtherOpen(true); setDeck(customText.trim() ? customText.trim() : null); }}
            style={{ padding: "17px 4px", borderRadius: 14, border: otherOpen ? `2px solid ${T.lcd}` : `1.5px solid ${T.line}`, background: otherOpen ? T.deckOnBg : T.inputBg, color: otherOpen ? T.lcd : T.muted, fontSize: 16, fontWeight: 800, fontFamily: uiFont }}>
            Other
          </button>
        </div>

        {otherOpen && (
          <div style={{ marginTop: 14 }}>
            <Label>Which deck? Type it in</Label>
            <input ref={otherRef} value={customText}
              onChange={(e) => { const v = e.target.value; setCustomText(v); setDeck(v.trim() ? v.trim() : null); }}
              placeholder="e.g. 4A, B2, P3, Level 5"
              style={{ ...field, marginTop: 7 }} />
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Label>Lot or note — optional</Label>
          <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. 137, near lift lobby B" style={{ ...field, marginTop: 7 }} />
        </div>

        <button disabled={!deck} onClick={handleSave}
          style={{
            marginTop: 16, width: "100%", padding: 16, borderRadius: 14, border: "none", fontSize: 17, fontWeight: 800, fontFamily: uiFont,
            color: deck ? T.onAccentInk : T.mutedDim,
            background: deck ? `linear-gradient(135deg, ${T.lcd}, ${T.lcd2})` : T.panelSolid,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          <Check size={21} /> Save this spot
        </button>
      </Panel>

      {recent.length > 0 && (
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px 8px" }}><Label>Recent spots</Label></div>
          {recent.map((h, i) => {
            const isCurrent = !!parking && i === 0;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderTop: i === 0 ? "none" : `1px solid ${T.line}` }}>
                <span style={{ fontSize: 21, fontWeight: 800, color: T.lcd, fontFamily: lcdFont, minWidth: 46 }}>{h.deck}</span>
                <div style={{ flex: 1, fontSize: 14.5, fontWeight: 600, color: T.muted }}>{h.note || "—"}</div>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isCurrent && (
                    <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, color: T.lcd, background: T.deckOnBg, padding: "3px 7px", borderRadius: 6 }}>NOW</span>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.mutedDim }}>{timeAgo(h.ts)}</span>
                </span>
              </div>
            );
          })}
        </Panel>
      )}
    </div>
  );
}

/* ---------------- SETTINGS ------------------------------------------------- */
function SettingsSheet({ settings, setSettings, onClose, onReset, onExport, onImport }) {
  const T = useTheme();
  const [confirm, setConfirm] = useState(false);
  const fileRef = useRef(null);
  const pref = settings.theme || "dark";
  const options = [
    { k: "dark", t: "Dark", icon: Moon, d: "Night dashboard" },
    { k: "light", t: "Light", icon: Sun, d: "Bright daytime" },
    { k: "system", t: "Match device", icon: Monitor, d: "Follows your phone's setting" },
  ];

  const onFilePicked = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // let the same file be re-picked later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { onImport(JSON.parse(reader.result)); }
      catch { onImport(null); }
    };
    reader.onerror = () => onImport(null);
    reader.readAsText(file);
  };

  const dataBtn = {
    flex: 1, padding: 14, borderRadius: 12, border: `1.5px solid ${T.line}`, background: T.inputBg,
    color: T.violet, fontSize: 15, fontWeight: 800, fontFamily: uiFont,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: T.overlay, display: "flex", alignItems: "flex-end", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, margin: "0 auto", background: T.bg2, borderTop: `1px solid ${T.line}`, borderRadius: "24px 24px 0 0", padding: "20px 18px 34px", maxHeight: "88vh", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: T.amber }}>Settings</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted }}><X size={24} /></button>
        </div>

        <Label>Appearance</Label>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {options.map((o) => {
            const on = pref === o.k;
            const Icon = o.icon;
            return (
              <button key={o.k} onClick={() => setSettings((s) => ({ ...s, theme: o.k }))}
                style={{ textAlign: "left", padding: 15, borderRadius: 14, border: on ? `2px solid ${T.violet}` : `1.5px solid ${T.line}`, background: on ? T.selVioletBg : T.inputBg, color: T.amber, display: "flex", alignItems: "center", gap: 12 }}>
                <Icon size={22} color={on ? T.violet : T.muted} strokeWidth={2.2} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{o.t}</div>
                  <div style={{ color: T.muted, fontSize: 13.5, fontWeight: 500, marginTop: 2 }}>{o.d}</div>
                </div>
                {on && <Check size={20} color={T.violet} />}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 22, borderTop: `1px solid ${T.line}`, paddingTop: 18 }}>
          <Label>Your data</Label>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={onExport} style={dataBtn}>
              <Download size={18} /> Back up
            </button>
            <button onClick={() => fileRef.current && fileRef.current.click()} style={dataBtn}>
              <Upload size={18} /> Restore
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFilePicked} style={{ display: "none" }} />
          </div>
          <div style={{ color: T.muted, fontSize: 13, fontWeight: 500, marginTop: 8, textAlign: "center", lineHeight: 1.4 }}>
            "Back up" saves all your fill-ups and parking to a file. "Restore" loads them back on a new phone or after clearing the browser.
          </div>
        </div>

        <div style={{ marginTop: 18, borderTop: `1px solid ${T.line}`, paddingTop: 18 }}>
          {!confirm ? (
            <button onClick={() => setConfirm(true)}
              style={{ width: "100%", padding: 14, borderRadius: 12, border: `1.5px solid ${T.line}`, background: "none", color: T.red, fontSize: 15, fontWeight: 700 }}>
              Erase all my data & start fresh
            </button>
          ) : (
            <>
              <div style={{ color: T.muted, fontSize: 13.5, fontWeight: 600, marginBottom: 10, textAlign: "center", lineHeight: 1.4 }}>
                This deletes every fill-up and parking note on this phone. Back up first if you want to keep them.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirm(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1.5px solid ${T.line}`, background: "none", color: T.muted, fontWeight: 700 }}>Keep it</button>
                <button onClick={onReset} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: T.red, color: "#fff", fontWeight: 800 }}>Yes, erase all</button>
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: "center", color: T.muted, fontSize: 12.5, fontWeight: 600, marginTop: 20, letterSpacing: 0.5 }}>Made for Pa · Tai Tong 🚗</div>
      </div>
    </div>
  );
}
