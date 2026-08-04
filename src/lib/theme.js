import React from "react";

/* ---------------------------------------------------------------------------
   THEME + shared constants
   High-contrast palettes tuned for easy reading (larger, bolder secondary
   text). Two concrete palettes (dark / light); "Match device" resolves to one
   of them at runtime. No `backdrop-filter: blur` — panels use solid/translucent
   fills instead (blur left blank rows on Android WebView).
--------------------------------------------------------------------------- */

export const lcdFont = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
export const uiFont = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const DECKS = ["1A", "1B", "2A", "2Ab", "2B", "3A", "3Ab", "3B"];

export function makeTheme(mode) {
  if (mode === "light") {
    return {
      mode: "light",
      bg: "#f1eff9", bg2: "#e4e0f2",
      panel: "rgba(255,255,255,0.9)", panelSolid: "#ffffff",
      line: "rgba(74,58,192,0.34)",
      violet: "#4a3ac0", violetDeep: "#3d30a6",
      amber: "#181334", amberHot: "#8f430b", amber2: "#77380a",
      lcd: "#0c5f90", lcd2: "#08425f",
      red: "#c22f18", green: "#12603a",
      muted: "#3d3960", mutedDim: "#5f5a83",
      inputBg: "#ffffff",
      onAmber: "#ffffff", onAccentInk: "#ffffff",
      deckOnBg: "rgba(12,95,144,0.16)", selVioletBg: "rgba(74,58,192,0.14)",
      toastBg: "#d6f3e2", toastInk: "#12603a",
      wrapBg: "radial-gradient(120% 60% at 50% -10%, #ddd4f7 0%, #e8e3f5 45%, #f1eff9 100%)",
      homeParkBg: "linear-gradient(135deg, #ffffff, #e9e4f6)",
      homeFuelBg: "linear-gradient(135deg, #efeafb, #ffffff)",
      effPreviewBg: "linear-gradient(135deg, rgba(74,58,192,0.16), rgba(143,67,11,0.10))",

      overlay: "rgba(40,30,70,0.5)",
      glow: "rgba(12,95,144,0.14)",
    };
  }
  return {
    mode: "dark",
    bg: "#08070f", bg2: "#141122",
    panel: "rgba(38,33,70,0.78)", panelSolid: "#221d3e",
    line: "rgba(157,143,255,0.34)",
    violet: "#a99bff", violetDeep: "#8b7bff",
    amber: "#fbeed6", amberHot: "#ffd79a", amber2: "#eeb072",
    lcd: "#86d8ff", lcd2: "#4a9fd0",
    red: "#ff7355", green: "#8bf0b4",
    muted: "#cec9ec", mutedDim: "#a49ecb",
    inputBg: "#100d20",
    onAmber: "#160f04", onAccentInk: "#04121a",
    deckOnBg: "rgba(134,216,255,0.20)", selVioletBg: "rgba(169,155,255,0.18)",
    toastBg: "#1c4a34", toastInk: "#b6f5d1",
    wrapBg: "radial-gradient(120% 60% at 50% -10%, #2a1f57 0%, #141122 45%, #08070f 100%)",
    homeParkBg: "linear-gradient(135deg, rgba(40,36,74,0.95), rgba(24,18,46,0.95))",
    homeFuelBg: "linear-gradient(135deg, rgba(46,33,92,0.92), rgba(24,18,46,0.95))",
    effPreviewBg: "linear-gradient(135deg, rgba(139,123,255,0.28), rgba(255,215,154,0.12))",
    overlay: "rgba(4,3,10,0.74)",
    glow: "rgba(134,216,255,0.22)",
  };
}

export const ThemeCtx = React.createContext(makeTheme("dark"));
export const useTheme = () => React.useContext(ThemeCtx);
