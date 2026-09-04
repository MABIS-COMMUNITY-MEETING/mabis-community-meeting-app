const KEY = "mabis_hacker_mode";

export function disableHackerMode() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
