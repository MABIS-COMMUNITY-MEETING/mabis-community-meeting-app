/*
 * End-to-end probe for the MeetingDoc actor. Not a build check — it needs the
 * network and a running deployment, so it is never wired into prebuild. Run it
 * by hand when you want to know that the live path actually works:
 *
 *   node scripts/probe-meeting-actor.mjs [host]
 *
 * It opens two real WebSocket connections to one room, has the first seed a
 * document, has the second type into it, and asserts the edit converges and
 * comes back over the wire. That is the whole feature in miniature. It also
 * prints the measured round trip, which is the number people actually mean when
 * they ask how fast live editing is.
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import WebSocket from "ws";

const require = createRequire(import.meta.url);
const DeltaModule = require("quill-delta");
const Delta = DeltaModule.default || DeltaModule;

const HOST = process.argv[2] || "https://preview-sandbox--6a7aa8e1140ed92f584d3fb4.base44.app";
const APP = "6a7aa8e1140ed92f584d3fb4";
const ROOM = `probe-${Date.now()}`;

async function mint(connectionId, anonId) {
  const response = await fetch(`${HOST}/api/apps/${APP}/actors/MeetingDoc/connection-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Base44-Anonymous-Id": anonId },
    body: JSON.stringify({ room: ROOM, connection_id: connectionId }),
  });
  assert.equal(response.status, 200, `mint failed: ${response.status} ${await response.text()}`);
  return response.json();
}

function open(credentials) {
  const separator = credentials.websocket_url.includes("?") ? "&" : "?";
  const socket = new WebSocket(`${credentials.websocket_url}${separator}token=${encodeURIComponent(credentials.token)}`);
  const inbox = [];
  const waiters = [];
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    const waiter = waiters.find((w) => w.match(message));
    if (waiter) {
      waiters.splice(waiters.indexOf(waiter), 1);
      waiter.resolve(message);
    } else {
      inbox.push(message);
    }
  });
  return {
    socket,
    send: (payload) => socket.send(JSON.stringify(payload)),
    ready: () => new Promise((resolve, reject) => {
      socket.once("open", resolve);
      socket.once("error", reject);
    }),
    expect: (match, label) => {
      const found = inbox.findIndex(match);
      if (found >= 0) return Promise.resolve(inbox.splice(found, 1)[0]);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timed out waiting for ${label}`)), 10000);
        waiters.push({ match, resolve: (m) => { clearTimeout(timer); resolve(m); } });
      });
    },
  };
}

const alice = open(await mint("alice", "probe-alice"));
await alice.ready();
console.log("  alice connected");

const aliceInit = await alice.expect((m) => m.t === "init", "alice init");
assert.equal(aliceInit.needsSeed, true, "a brand-new room should ask its first client to seed it");
assert.equal(aliceInit.writer, true, "the first connection should be elected writer");
console.log(`  alice got init  rev=${aliceInit.rev}  needsSeed=${aliceInit.needsSeed}  writer=${aliceInit.writer}`);

const seed = new Delta().insert("Agenda\n");
alice.send({ t: "hello", name: "Alice", color: "hsl(10 72% 48%)" });
alice.send({ t: "seed", doc: seed.ops });
await alice.expect((m) => m.t === "ack", "alice seed ack");
console.log("  alice seeded the room");

const bob = open(await mint("bob", "probe-bob"));
await bob.ready();
const bobInit = await bob.expect((m) => m.t === "init", "bob init");
assert.equal(bobInit.needsSeed, false, "a seeded room must not ask a later client to reseed it");
assert.equal(bobInit.writer, false, "only one writer may be elected");
assert.equal(
  JSON.stringify(bobInit.doc), JSON.stringify(seed.ops),
  "bob should receive exactly the document alice seeded",
);
console.log(`  bob got init    rev=${bobInit.rev}  writer=${bobInit.writer}  doc=${JSON.stringify(bobInit.doc)}`);

// Bob types. Alice must see it, transformed and acknowledged.
const edit = new Delta().retain(6).insert(" for Tuesday");
const started = Date.now();
bob.send({ t: "op", rev: bobInit.rev, delta: edit.ops });
const bobAck = await bob.expect((m) => m.t === "ack", "bob ack");
const roundTrip = Date.now() - started;
const relayed = await alice.expect((m) => m.t === "op", "alice relay");

assert.equal(bobAck.rev, bobInit.rev + 1, "an accepted op must advance the revision by exactly one");
assert.equal(relayed.rev, bobAck.rev, "both sides must agree on the revision");

const converged = new Delta(bobInit.doc).compose(new Delta(relayed.delta));
assert.equal(
  converged.ops.map((o) => o.insert).join(""), "Agenda for Tuesday\n",
  "alice's document after applying the relayed op must match what bob typed",
);
console.log(`  bob typed -> alice saw it in ${roundTrip}ms  rev ${bobInit.rev} -> ${bobAck.rev}`);
console.log(`  converged document: ${JSON.stringify(converged.ops.map((o) => o.insert).join(""))}`);

// Writer hand-off: alice leaves, bob should inherit the save duty.
alice.socket.close();
const role = await bob.expect((m) => m.t === "role", "writer hand-off");
assert.equal(role.writer, true, "the remaining connection must inherit the writer role");
console.log("  alice left -> bob promoted to writer");

bob.socket.close();
console.log(`\nMeetingDoc actor: live. Two clients, one room, ${roundTrip}ms edit round trip.\n`);
