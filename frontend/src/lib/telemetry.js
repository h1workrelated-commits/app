import { api } from "./api";

const SESSION_KEY = "stand_session_id";

export function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function track(event, opts = {}) {
  try {
    await api.post("/track", {
      event,
      session_id: getSessionId(),
      item_id: opts.item_id || null,
      board_username: opts.board_username || null,
      time_ms: opts.time_ms || null,
      source: document.referrer || null,
      path: window.location.pathname,
    });
  } catch {}
}

export function trackBeacon(event, opts = {}) {
  // Use sendBeacon for unload; fall back to fetch keepalive
  const body = JSON.stringify({
    event,
    session_id: getSessionId(),
    item_id: opts.item_id || null,
    board_username: opts.board_username || null,
    time_ms: opts.time_ms || null,
    source: document.referrer || null,
    path: window.location.pathname,
  });
  const url = `${process.env.REACT_APP_BACKEND_URL}/api/track`;
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }
  } catch {}
  try { fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, credentials: "include" }); } catch {}
}
