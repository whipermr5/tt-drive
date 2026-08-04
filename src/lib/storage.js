/* ---------------------------------------------------------------------------
   STORAGE — persists across sessions, degrades gracefully.

   The original artifact used the Claude-only async `window.storage` API, which
   does not exist on the open web. This is the production port: plain
   `localStorage`, which is perfect for a single-user app on his own phone (no
   backend needed). The keys and JSON shapes are unchanged, so the seeding logic
   in App.jsx is identical to the artifact's.

   Keys in use: tt:fuel, tt:parking, tt:hist, tt:settings, tt:seeded
--------------------------------------------------------------------------- */

export const hasStore = () => {
  try {
    const k = "tt:__probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
};

export const load = (k, fb) => {
  try {
    const r = localStorage.getItem(k);
    return r == null ? fb : JSON.parse(r);
  } catch {
    return fb;
  }
};

export const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* private-mode / quota — ignore, app keeps working in-memory this session */
  }
};

export const remove = (k) => {
  try {
    localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
};
