import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const dist = "/app/dist-solid/assets";
const u = (f) => pathToFileURL(path.join(dist, f)).href;

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
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

async function tryImport(name, file, ms = 5000) {
  console.log(`importing ${name}...`);
  const t0 = Date.now();
  try {
    const mod = await Promise.race([
      import(u(file)),
      new Promise((_, rej) => setTimeout(() => rej(new Error(`TIMEOUT ${name}`)), ms)),
    ]);
    console.log(`${name} OK`, Date.now() - t0, "exports:", Object.keys(mod));
  } catch (e) {
    console.log(`${name} FAILED`, Date.now() - t0, String(e && e.stack || e));
  }
}

await tryImport("Home", "Home-ghFwrGVs.js");
await tryImport("DocsEditor", "DocsEditor-CtVA_p5i.js");
await tryImport("MeetingMinutes", "MeetingMinutes-BgeUkn_4.js");
