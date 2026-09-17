/*
 * Convergence check for the live-document transform.
 *
 * Two people typing in the same paragraph at the same instant is the only thing
 * that exercises this code, and it is precisely what you cannot stage by hand:
 * you would need two browsers, the same second, the same sentence, and a
 * transform bug still only shows up on some interleavings. A wrong `priority`
 * flag passes every manual test anyone has the patience to run and then eats a
 * sentence in a real meeting.
 *
 * So: simulate it. Real clients (solid/lib/ot-client.js), the real server
 * (base44/shared/ot-server.js), a network that reorders across connections but
 * preserves per-connection FIFO the way a WebSocket does, and randomised edits.
 * Then assert the only property that actually matters —
 *
 *     once the network is drained, every client and the server hold a
 *     byte-identical document.
 *
 * Seeded, so a failure prints the seed that produced it and can be replayed.
 */

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createOtServer } from "../base44/shared/ot-server.js";
import { createOtClient } from "../solid/lib/ot-client.js";

const require = createRequire(import.meta.url);
const DeltaModule = require("quill-delta");
const Delta = DeltaModule.default || DeltaModule;

/* xorshift32 — tiny, seedable, and good enough to shuffle a queue. Math.random
   cannot be seeded, so a failure here would be unreproducible. */
function rng(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13; state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5; state >>>= 0;
    return state / 0x100000000;
  };
}

const WORDS = ["meeting", "notes", "agenda", "\n", "budget", "review", " ", "action", "ok"];

function randomEdit(random, docLength) {
  const at = Math.floor(random() * (docLength + 1));
  /* Deletes only when there is something to delete, and never past the end —
     Quill would not generate such a delta, so accepting one here would be
     testing a case that cannot occur and masking one that can. */
  if (docLength > 1 && random() < 0.35) {
    const length = 1 + Math.floor(random() * Math.min(6, docLength - at));
    if (length > 0 && at + length <= docLength) {
      return new Delta().retain(at).delete(length);
    }
  }
  const word = WORDS[Math.floor(random() * WORDS.length)];
  return new Delta().retain(at).insert(word);
}

function runSession({ seed, clientCount, rounds }) {
  const random = rng(seed);
  const server = createOtServer(Delta, { doc: new Delta().insert("\n") });

  const toServer = [];   // per-client FIFO of messages heading to the actor
  const toClient = [];   // per-client FIFO of messages heading to that client
  const clients = [];

  for (let i = 0; i < clientCount; i++) {
    toServer.push([]);
    toClient.push([]);
    const state = {
      doc: server.document,
      cursor: { index: 0, length: 0 },
    };
    const ot = createOtClient({
      Delta,
      send: (message) => toServer[i].push(message),
      apply: (delta) => {
        state.doc = state.doc.compose(delta);
        state.cursor = ot.transformCursor(delta, state.cursor);
      },
      reset: (_rev, doc) => { state.doc = new Delta(doc); },
    });
    ot.init(server.revision, server.document.ops);
    clients.push({ ot, state });
  }

  const deliverToServer = (i) => {
    const message = toServer[i].shift();
    if (!message) return;
    const committed = server.receive(new Delta(message.delta), message.rev);
    /* A client past the history horizon gets the document instead of an ack.
       Not reachable at these sizes, but the branch exists in the actor so the
       simulation has to model it or it would be untested. */
    if (!committed) {
      toClient[i].push({ t: "init", rev: server.revision, doc: server.document.ops });
      return;
    }
    for (let j = 0; j < clientCount; j++) {
      if (j === i) toClient[j].push({ t: "ack", rev: committed.rev });
      else toClient[j].push({ t: "op", rev: committed.rev, delta: committed.delta.ops });
    }
  };

  const deliverToClient = (i) => {
    const message = toClient[i].shift();
    if (!message) return;
    const { ot } = clients[i];
    if (message.t === "ack") ot.ack(message.rev);
    else if (message.t === "op") ot.remote(message.rev, message.delta);
    else if (message.t === "init") ot.init(message.rev, message.doc);
  };

  /* One step is either a local edit or the delivery of one queued message,
     chosen at random. Per-connection order is preserved (shift from a FIFO)
     while the interleaving across connections is arbitrary — which is exactly
     the freedom a real network has and the only thing that surfaces these bugs. */
  for (let round = 0; round < rounds; round++) {
    const choice = random();
    const i = Math.floor(random() * clientCount);
    if (choice < 0.4) {
      const { ot, state } = clients[i];
      const delta = randomEdit(random, state.doc.length());
      state.doc = state.doc.compose(delta);
      state.cursor = ot.transformCursor(delta, state.cursor);
      ot.local(delta);
    } else if (choice < 0.7) {
      deliverToServer(i);
    } else {
      deliverToClient(i);
    }
  }

  /* Drain. Deliveries create more messages, so loop until both directions are
     empty rather than iterating a fixed number of times. */
  let guard = 0;
  while (toServer.some((q) => q.length) || toClient.some((q) => q.length)) {
    for (let i = 0; i < clientCount; i++) deliverToServer(i);
    for (let i = 0; i < clientCount; i++) deliverToClient(i);
    assert.ok((guard += 1) < 10000, "network failed to drain — ops are being generated during teardown");
  }

  const expected = JSON.stringify(server.document.ops);
  for (let i = 0; i < clientCount; i++) {
    const { ot, state } = clients[i];
    assert.equal(
      JSON.stringify(state.doc.ops), expected,
      `seed ${seed}: client ${i} diverged from the server`,
    );
    assert.equal(ot.revision, server.revision, `seed ${seed}: client ${i} revision drifted`);
    assert.equal(ot.inFlight, false, `seed ${seed}: client ${i} still had unacknowledged work`);
    const length = state.doc.length();
    assert.ok(
      state.cursor.index >= 0 && state.cursor.index <= length,
      `seed ${seed}: client ${i} cursor ${state.cursor.index} outside document of length ${length}`,
    );
  }
  return server.document.length();
}

let sessions = 0;
let longest = 0;
for (let seed = 1; seed <= 300; seed++) {
  const clientCount = 2 + (seed % 3);
  longest = Math.max(longest, runSession({ seed, clientCount, rounds: 240 }));
  sessions += 1;
}

/* A pair typing into the same index is the single most likely real collision —
   two people answering the same agenda line — and random edits hit it only
   occasionally. Force it. */
for (let seed = 1; seed <= 60; seed++) {
  const random = rng(seed);
  const server = createOtServer(Delta, { doc: new Delta().insert("agenda\n") });
  const queues = [[], []];
  const docs = [];
  const ots = [];
  for (let i = 0; i < 2; i++) {
    docs.push(server.document);
    ots.push(createOtClient({
      Delta,
      send: (message) => queues[i].push(message),
      apply: (delta) => { docs[i] = docs[i].compose(delta); },
      reset: (_rev, doc) => { docs[i] = new Delta(doc); },
    }));
    ots[i].init(server.revision, server.document.ops);
  }
  // Both insert at the same index, against the same revision, before either sends.
  for (let i = 0; i < 2; i++) {
    const delta = new Delta().retain(3).insert(i === 0 ? "AAA" : "BBB");
    docs[i] = docs[i].compose(delta);
    ots[i].local(delta);
  }
  const order = random() < 0.5 ? [0, 1] : [1, 0];
  const inbox = [[], []];
  for (const i of order) {
    const message = queues[i].shift();
    const committed = server.receive(new Delta(message.delta), message.rev);
    for (let j = 0; j < 2; j++) {
      if (j === i) inbox[j].push({ t: "ack", rev: committed.rev });
      else inbox[j].push({ t: "op", rev: committed.rev, delta: committed.delta.ops });
    }
  }
  for (let i = 0; i < 2; i++) {
    for (const message of inbox[i]) {
      if (message.t === "ack") ots[i].ack(message.rev);
      else ots[i].remote(message.rev, message.delta);
    }
  }
  const expected = JSON.stringify(server.document.ops);
  for (let i = 0; i < 2; i++) {
    assert.equal(JSON.stringify(docs[i].ops), expected, `same-index seed ${seed}: client ${i} diverged`);
  }
  // Neither insert may be lost, whichever order the server accepted them in.
  const text = server.document.ops.map((o) => (typeof o.insert === "string" ? o.insert : "")).join("");
  assert.ok(text.includes("AAA") && text.includes("BBB"), `same-index seed ${seed}: an insert was dropped`);
  sessions += 1;
}

console.log(
  `\nOT convergence: ${sessions} randomised sessions passed (2-4 clients, reordered delivery, longest document ${longest} chars).\n\n` +
  "Every client ended byte-identical to the server, no client kept unacknowledged work,\n" +
  "no cursor escaped its document, and concurrent inserts at the same index kept both.\n",
);
