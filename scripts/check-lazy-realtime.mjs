/**
 * Contract test for the lazy realtime shims.
 *
 * src/lib/lazy-socket-io.js and src/lib/lazy-partysocket.js keep socket.io and
 * partysocket off the boot path by handing @base44/sdk a connection-shaped
 * object immediately and fetching the real library behind it. That trade only
 * holds if the object behaves like the real one, and the part that can quietly
 * break is the window between construction and the import resolving:
 * registrations and sends made in that window have to arrive, in order, and a
 * disconnect made in that window has to stick.
 *
 * The real libraries are not the unit under test — they are unchanged and the
 * SDK already exercised them. What is tested is the queue, the replay and the
 * disconnect latch, against a fake standing in for the real module. It is
 * built with the same alias mechanism the app build uses, so the `real:` hop
 * is covered too: if lazy-realtime-aliases.mjs stops resolving, this fails.
 *
 * Run: node scripts/check-lazy-realtime.mjs
 */
import { build } from "vite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const results = [];
function check(label, ok, detail = "") {
  results.push({ label, ok: Boolean(ok), detail });
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), "lazy-realtime-"));

/* Records every interaction so the assertions can look at ordering, not just
   whether a call arrived. */
fs.writeFileSync(path.join(work, "fake-socket-io.js"), `
export const log = [];
export function io(...args) {
  log.push(["construct", args[0]]);
  const socket = {
    id: "fake-id",
    connected: true,
    disconnected: false,
    on: (event, handler) => { log.push(["on", event]); socket.handlers ??= {}; socket.handlers[event] = handler; return socket; },
    once: (event) => { log.push(["once", event]); return socket; },
    off: (event) => { log.push(["off", event]); return socket; },
    emit: (...emitArgs) => { log.push(["emit", ...emitArgs]); return socket; },
    connect: () => { log.push(["connect"]); return socket; },
    disconnect: () => { log.push(["disconnect"]); return socket; },
  };
  log.socket = socket;
  return socket;
}
`);

fs.writeFileSync(path.join(work, "fake-partysocket.js"), `
export const log = [];
export default class FakePartySocket {
  constructor(options) {
    log.push(["construct", options?.room]);
    this.readyState = 1;
  }
  addEventListener(type) { log.push(["addEventListener", type]); }
  removeEventListener(type) { log.push(["removeEventListener", type]); }
  send(data) { log.push(["send", data]); }
  reconnect() { log.push(["reconnect"]); }
  close() { log.push(["close"]); }
}
`);

/* The shims are only ever reached through the alias, so the harness imports
   them the same way the SDK does — by bare specifier. */
fs.writeFileSync(path.join(work, "entry.js"), `
export { io } from "socket.io-client";
export { default as PartySocket } from "partysocket";
export { log as socketLog } from "real:socket.io-client";
export { log as partyLog } from "real:partysocket";
`);

const outDir = path.join(work, "out");
await build({
  configFile: false,
  logLevel: "silent",
  /* An app build would otherwise copy public/ into the temp dir, and this
     harness has no use for 37 MB of fonts. */
  publicDir: false,
  resolve: {
    alias: {
      "socket.io-client": path.resolve("src/lib/lazy-socket-io.js"),
      partysocket: path.resolve("src/lib/lazy-partysocket.js"),
      "real:socket.io-client": path.join(work, "fake-socket-io.js"),
      "real:partysocket": path.join(work, "fake-partysocket.js"),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: path.join(work, "entry.js"),
      output: { entryFileNames: "entry.js", chunkFileNames: "[name].js" },
      /* Without this an app build assumes nothing imports the entry and
         tree-shakes every export away, leaving an empty file. */
      preserveEntrySignatures: "strict",
    },
  },
});

const { io, PartySocket, socketLog, partyLog } = await import(pathToFileURL(path.join(outDir, "entry.js")).href);

/* One macrotask is enough for a resolved dynamic import to settle; the chunk
   is already on disk and in the module cache by the time this runs. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

// ── socket.io: work queued before the library lands must survive ───────────
{
  const socket = io("https://example.test", { path: "/ws/" });
  check("io() returns synchronously", socket && typeof socket.on === "function");
  check("id is undefined before the library lands", socket.id === undefined);
  check("reports disconnected before the library lands", socket.disconnected === true);

  const onConnect = () => {};
  socket.on("connect", onConnect);
  socket.on("update_model", () => {});
  socket.emit("join", "room-a");

  check("nothing reached the real library yet", socketLog.length === 0,
    `saw ${JSON.stringify(socketLog)}`);

  await settle();

  check("the real socket was constructed with the original url",
    socketLog[0]?.[0] === "construct" && socketLog[0]?.[1] === "https://example.test",
    JSON.stringify(socketLog[0]));
  check("both queued handlers were attached",
    socketLog.filter(([kind]) => kind === "on").length === 2,
    JSON.stringify(socketLog));
  check("handlers are attached before queued emits are flushed",
    socketLog.findIndex(([kind]) => kind === "emit")
      > socketLog.findLastIndex(([kind]) => kind === "on"),
    JSON.stringify(socketLog));
  check("the queued join was replayed with its argument",
    socketLog.some(([kind, event, room]) => kind === "emit" && event === "join" && room === "room-a"),
    JSON.stringify(socketLog));
  check("id reads through to the real socket once it exists", socket.id === "fake-id");
  check("connected reads through to the real socket", socket.connected === true);

  socketLog.length = 0;
  socket.emit("leave", "room-a");
  check("emits after the library lands pass straight through",
    socketLog.length === 1 && socketLog[0][1] === "leave");

  socket.disconnect();
  check("disconnect reaches the real socket",
    socketLog.some(([kind]) => kind === "disconnect"));
}

// ── socket.io: a disconnect during the download must latch ─────────────────
{
  socketLog.length = 0;
  const socket = io("https://example.test");
  socket.on("connect", () => {});
  socket.emit("join", "room-b");
  socket.disconnect();

  await settle();

  check("a socket disconnected before the library landed never connects",
    socketLog.length === 0,
    `expected no interaction, saw ${JSON.stringify(socketLog)}`);
}

// ── partysocket: same contract ─────────────────────────────────────────────
{
  const ws = new PartySocket({ host: "example.test", room: "actor-1" });
  check("PartySocket constructs synchronously", ws instanceof PartySocket);
  check("readyState reports CONNECTING before the library lands", ws.readyState === 0);

  ws.addEventListener("open", () => {});
  ws.addEventListener("message", () => {});
  ws.send('{"type":"__ping"}');

  check("nothing reached the real partysocket yet", partyLog.length === 0);

  await settle();

  check("the real partysocket got the original options",
    partyLog[0]?.[0] === "construct" && partyLog[0]?.[1] === "actor-1",
    JSON.stringify(partyLog[0]));
  check("both queued listeners were attached",
    partyLog.filter(([kind]) => kind === "addEventListener").length === 2,
    JSON.stringify(partyLog));
  check("listeners are attached before the queued send is flushed",
    partyLog.findIndex(([kind]) => kind === "send")
      > partyLog.findLastIndex(([kind]) => kind === "addEventListener"),
    JSON.stringify(partyLog));
  check("the queued send was replayed verbatim",
    partyLog.some(([kind, data]) => kind === "send" && data === '{"type":"__ping"}'),
    JSON.stringify(partyLog));
  check("readyState reads through once the real socket exists", ws.readyState === 1);

  partyLog.length = 0;
  ws.reconnect();
  ws.close();
  check("reconnect and close reach the real socket",
    partyLog.some(([kind]) => kind === "reconnect") && partyLog.some(([kind]) => kind === "close"),
    JSON.stringify(partyLog));
}

// ── partysocket: close during the download must latch ──────────────────────
{
  partyLog.length = 0;
  const ws = new PartySocket({ host: "example.test", room: "actor-2" });
  ws.addEventListener("open", () => {});
  ws.close();

  await settle();

  check("a partysocket closed before the library landed never connects",
    partyLog.length === 0,
    `expected no interaction, saw ${JSON.stringify(partyLog)}`);
}

fs.rmSync(work, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok);
console.log(`\nLazy realtime shims: ${results.length - failed.length}/${results.length} checks passed\n`);
if (failed.length) {
  console.error("FAILED:");
  failed.forEach((r) => console.error(`  - ${r.label}${r.detail ? ` — ${r.detail}` : ""}`));
  process.exit(1);
}
console.log("socket.io and partysocket load on first use, and the wait is invisible to callers.\n");
