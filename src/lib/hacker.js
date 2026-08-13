const KEY = "mabis_hacker_mode";

export const HACKER_USER = {
  id: "hacker",
  full_name: "hacker",
  email: "hacker@localhost",
  role: "user",
};

export function isHackerMode() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function enableHackerMode() {
  try {
    localStorage.setItem(KEY, "1");
    // Hacker mode is an explicit alternate session, never an overlay on top of
    // a real MABIS account. Clearing the stored SDK token keeps the two modes
    // mutually exclusive and prevents ambiguous identity state after reload.
    localStorage.removeItem("base44_access_token");
    localStorage.removeItem("token");
  } catch { /* ignore */ }
}

export function disableHackerMode() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export const KONAMI = [
  "up", "up", "down", "down", "left", "right", "left", "right", "b", "a",
];