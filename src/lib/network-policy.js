export const NETWORK_EVENT = "mabis-network-policy";
export const DATA_SAVER_KEY = "mabis_data_saver_mode";

const VALID_MODES = new Set(["auto", "on", "off"]);
let monitoring = false;
let lastSignature = "";

function connectionInfo() {
  if (typeof navigator === "undefined") return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

export function getDataSaverMode() {
  if (typeof localStorage === "undefined") return "auto";
  const stored = localStorage.getItem(DATA_SAVER_KEY);
  return VALID_MODES.has(stored) ? stored : "auto";
}

export function networkState() {
  if (typeof navigator === "undefined") {
    return { mode: "full", constrained: false, severe: false, offline: false, saveData: false, effectiveType: "unknown", downlink: null, rtt: null };
  }

  const preference = getDataSaverMode();
  const connection = connectionInfo();
  const offline = navigator.onLine === false;
  const saveData = connection?.saveData === true;
  const effectiveType = connection?.effectiveType || "unknown";
  const downlink = typeof connection?.downlink === "number" ? connection.downlink : null;
  const rtt = typeof connection?.rtt === "number" ? connection.rtt : null;
  const verySlowType = effectiveType === "slow-2g" || effectiveType === "2g";
  const slowType = verySlowType || effectiveType === "3g";
  const weakBandwidth = downlink !== null && downlink > 0 && downlink < 1.5;
  const severeBandwidth = downlink !== null && downlink > 0 && downlink < 0.75;
  const highLatency = rtt !== null && rtt >= 550;
  const severeLatency = rtt !== null && rtt >= 1000;

  const autoConstrained = offline || saveData || verySlowType || weakBandwidth || highLatency;
  const constrained = preference === "on" || (preference === "auto" && autoConstrained);
  const severe = offline || saveData || effectiveType === "slow-2g" || severeBandwidth || severeLatency;

  return {
    preference,
    mode: constrained ? "lite" : "full",
    constrained,
    severe,
    offline,
    saveData,
    effectiveType,
    downlink,
    rtt,
    slowType,
  };
}

export function applyNetworkPreference({ notify = true } = {}) {
  const state = networkState();
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.classList.toggle("network-lite", state.constrained);
    root.classList.toggle("network-severe", state.severe);
    root.dataset.networkMode = state.mode;
    root.dataset.connectionType = state.effectiveType;
  }

  const signature = JSON.stringify(state);
  if (notify && signature !== lastSignature && typeof window !== "undefined") {
    lastSignature = signature;
    window.dispatchEvent(new CustomEvent(NETWORK_EVENT, { detail: state }));
  } else {
    lastSignature = signature;
  }
  return state;
}

export function setDataSaverMode(mode) {
  const next = VALID_MODES.has(mode) ? mode : "auto";
  localStorage.setItem(DATA_SAVER_KEY, next);
  return applyNetworkPreference();
}

export function allowSpeculativeFetch() {
  return !networkState().constrained;
}

export function allowRichEffects() {
  const state = networkState();
  return !state.constrained && !state.offline;
}

export function startNetworkMonitoring() {
  if (monitoring || typeof window === "undefined") return () => {};
  monitoring = true;
  const connection = connectionInfo();
  const update = () => applyNetworkPreference();
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  connection?.addEventListener?.("change", update);
  applyNetworkPreference({ notify: false });

  return () => {
    monitoring = false;
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
    connection?.removeEventListener?.("change", update);
  };
}
