import path from "node:path";
import { pathToFileURL } from "node:url";

const dist = "/app/dist-solid/assets";
const u = (f) => pathToFileURL(path.join(dist, f)).href;

console.log("importing Home chunk directly...");
const t0 = Date.now();
try {
  const home = await Promise.race([
    import(u("Home-ghFwrGVs.js")),
    new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT Home")), 5000)),
  ]);
  console.log("Home OK", Date.now() - t0, Object.keys(home));
} catch (e) {
  console.log("Home FAILED", Date.now() - t0, String(e));
}

console.log("importing DocsEditor chunk directly...");
const t1 = Date.now();
try {
  const de = await Promise.race([
    import(u("DocsEditor-CtVA_p5i.js")),
    new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT DocsEditor")), 5000)),
  ]);
  console.log("DocsEditor OK", Date.now() - t1, Object.keys(de));
} catch (e) {
  console.log("DocsEditor FAILED", Date.now() - t1, String(e));
}

console.log("importing MeetingMinutes chunk directly...");
const t2 = Date.now();
try {
  const mm = await Promise.race([
    import(u("MeetingMinutes-BgeUkn_4.js")),
    new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT MeetingMinutes")), 5000)),
  ]);
  console.log("MeetingMinutes OK", Date.now() - t2, Object.keys(mm));
} catch (e) {
  console.log("MeetingMinutes FAILED", Date.now() - t2, String(e));
}
