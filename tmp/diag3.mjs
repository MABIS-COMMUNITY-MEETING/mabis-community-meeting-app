import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const dist = "/app/dist-solid/assets";
const u = (f) => pathToFileURL(path.join(dist, f)).href;

const dom = new JSDOM("<!doctype html><html><head></head><body><div id='root'></div></body></html>", { url: "http://localhost/", pretendToBeVisual: true, runScripts: "outside-only" });
const { window } = dom;
window.matchMedia = (q) => ({ matches: false, media: q, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} });
window.requestIdleCallback = (fn) => setTimeout(fn, 0);
const noopFetch = () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(""), json: () => Promise.resolve({}) });
window.fetch = noopFetch;
globalThis.fetch = noopFetch;
class DeadXHR {
  open(){} setRequestHeader(){} abort(){}
  addEventListener(t,cb){ if (t==="error") this._onerror=cb; }
  removeEventListener(){} getAllResponseHeaders(){return "";}
  send(){ setTimeout(()=>{ this.status=0; this.readyState=4; this.onerror?.(new Error("offline")); this._onerror?.(new Error("offline")); this.onreadystatechange?.(); },0); }
}
window.XMLHttpRequest = DeadXHR;
globalThis.XMLHttpRequest = DeadXHR;
for (const k of ["window","document","navigator","localStorage","sessionStorage","requestAnimationFrame","cancelAnimationFrame","matchMedia","getComputedStyle","CustomEvent","Event","MutationObserver","IntersectionObserver","PerformanceObserver","location","history"]) {
  if (window[k] !== undefined) globalThis[k] = window[k];
}
for (const k of Object.getOwnPropertyNames(window)) {
  if (/^[A-Z]/.test(k) && globalThis[k] === undefined) {
    try { globalThis[k] = window[k]; } catch {}
  }
}
globalThis.self = window;

// Instrument: log every <link> appended to <head>, and whether load/error ever fires.
const origCreateElement = window.document.createElement.bind(window.document);
window.document.createElement = function (tag, ...rest) {
  const el = origCreateElement(tag, ...rest);
  if (String(tag).toLowerCase() === "link") {
    const origAddEventListener = el.addEventListener.bind(el);
    let gotLoadListener = false, gotErrorListener = false;
    el.addEventListener = function (type, cb, ...r) {
      if (type === "load") gotLoadListener = true;
      if (type === "error") gotErrorListener = true;
      return origAddEventListener(type, cb, ...r);
    };
    setTimeout(() => {
      console.log("[LINK]", el.rel, el.href, "hasLoadListener=", gotLoadListener, "hasErrorListener=", gotErrorListener);
    }, 50);
  }
  return el;
};

console.log("importing MeetingMinutes chunk directly (fresh CSS, nothing preloaded yet)...");
const t0 = Date.now();
try {
  const mod = await Promise.race([
    import(u("MeetingMinutes-BgeUkn_4.js")),
    new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT MeetingMinutes")), 4000)),
  ]);
  console.log("MeetingMinutes OK", Date.now() - t0, Object.keys(mod));
} catch (e) {
  console.log("MeetingMinutes FAILED/TIMEOUT", Date.now() - t0, String(e));
}
console.log("head links now:", [...window.document.head.querySelectorAll("link")].map(l => l.href));
process.exit(0);
