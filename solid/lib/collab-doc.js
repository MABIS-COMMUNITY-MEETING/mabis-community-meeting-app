import { createSignal } from "solid-js";
import { createOtClient } from "./ot-client.js";

/*
 * One live editing session: the MeetingDoc actor on one side, a Quill instance
 * on the other, ot-client.js doing the merge in between.
 *
 * `Delta` is passed in rather than imported. This module is pulled in by
 * DocsEditor, which already owns the Quill chunk; importing quill-setup here as
 * well would add a second edge into that chunk from a module that only needs
 * one constructor, and the lazy boundary around DocsEditor is load-bearing (see
 * the header of NewsWidget.jsx).
 *
 * ── Latency ─────────────────────────────────────────────────────────────────
 *
 * There is no debounce on the send path, deliberately. Your own keystrokes are
 * already on screen — Quill applied them before text-change even fired — so the
 * only thing the network governs is how fast OTHER people see them, and every
 * millisecond of artificial delay there is pure loss. The natural rate limit is
 * ot-client's one-op-in-flight rule: while an op is unacknowledged, further
 * typing composes into a buffer and leaves as a single op the moment the ack
 * lands. On a fast link that is a message per few keystrokes; on a slow one it
 * degrades to one per round trip by itself. A fixed debounce cannot do that —
 * it is either too slow for the good case or too chatty for the bad one.
 *
 * Cursors are the exception and ARE throttled. A caret that is 50ms stale is
 * imperceptible, and selection-change fires on every arrow key.
 */

const CURSOR_THROTTLE_MS = 50;

/*
 * Per-person caret colour, derived from identity rather than assigned by the
 * server, so the same person is the same colour in everybody's window without
 * needing to agree on anything.
 *
 * Fixed saturation and lightness, varying only hue: the result has to stay
 * legible against every one of the app's themes, light and dark, and the only
 * way to promise that without knowing the theme is to pin the two channels that
 * control contrast and vary the one that does not.
 */
export function cursorColorFor(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360} 72% 48%)`;
}

export function createCollabDoc({ actors, room, Delta, name, onStatus }) {
  const [peers, setPeers] = createSignal([]);
  const [connected, setConnected] = createSignal(false);
  const [isWriter, setIsWriter] = createSignal(false);

  let quill = null;
  let connection = null;
  let subscription = null;
  let cursorTimer = null;
  let lastCursorSent = null;
  let disposed = false;

  const peerMap = new Map();
  const publishPeers = () => setPeers([...peerMap.values()].filter((p) => p.cursor));

  const ot = createOtClient({
    Delta,
    send: (message) => connection?.send(message),
    apply: (delta) => {
      /* "silent" is the entire reason remote edits do not fight the user: it
         applies the change without emitting a text-change of source "user", so
         this does not loop back out as a local op, and Quill shifts the caret
         to compensate for text inserted before it. Without it, someone typing
         above you would shunt your cursor a character to the left per keystroke. */
      quill?.updateContents(delta, "silent");
      for (const peer of peerMap.values()) {
        if (peer.cursor) peer.cursor = ot.transformCursor(delta, peer.cursor);
      }
      publishPeers();
    },
    reset: (_rev, ops) => {
      if (!quill) return;
      /* A reconnect hands back the authoritative document, which is usually
         identical or near-identical to what is already on screen. Diffing and
         applying the difference keeps the caret and the scroll position;
         setContents would throw the user back to the top of the document every
         time the wifi blinked. */
      const current = quill.getContents();
      const target = new Delta(ops);
      const patch = current.diff(target);
      if (patch.ops.length) quill.updateContents(patch, "silent");
    },
  });

  const handle = (message) => {
    switch (message?.t) {
      case "init": {
        if (message.needsSeed && quill) {
          /* The room is empty and we are the first in. The server cannot build
             this itself — turning stored HTML into a Delta needs a DOM, and it
             has none — so the client that already has the document rendered
             hands it over. */
          const seed = quill.getContents();
          ot.init(0, seed.ops);
          connection?.send({ t: "seed", doc: seed.ops });
        } else {
          ot.init(message.rev, message.doc);
        }
        peerMap.clear();
        for (const peer of message.peers || []) {
          peerMap.set(peer.id, { ...peer, cursor: peer.cursor || null });
        }
        publishPeers();
        setIsWriter(Boolean(message.writer));
        setConnected(true);
        onStatus?.("live");
        connection?.send({ t: "hello", name, color: cursorColorFor(name || "anon") });
        return;
      }
      case "ack":
        ot.ack(message.rev);
        return;
      case "op":
        ot.remote(message.rev, message.delta);
        return;
      case "join":
        peerMap.set(message.id, { id: message.id, name: message.name, color: message.color, cursor: null });
        publishPeers();
        return;
      case "leave":
        peerMap.delete(message.id);
        publishPeers();
        return;
      case "cursor": {
        const peer = peerMap.get(message.id);
        if (!peer) return;
        peer.cursor = { index: message.index, length: message.length };
        publishPeers();
        return;
      }
      case "role":
        setIsWriter(Boolean(message.writer));
        return;
    }
  };

  return {
    peers,
    connected,
    isWriter,
    get syncing() { return ot.inFlight; },

    /** Called by DocsEditor once Quill exists. */
    attach(instance) {
      if (disposed) return;
      quill = instance;
      connection = actors[room.actor](room.id).connect();
      subscription = connection.subscribe(handle);
    },

    /** A local edit. Only ever called with source === "user". */
    localDelta(delta) {
      ot.local(delta);
    },

    /** Local caret moved. Throttled; the latest position always wins. */
    localSelection(range) {
      if (!range || !connection) return;
      lastCursorSent = { index: range.index, length: range.length };
      if (cursorTimer) return;
      cursorTimer = setTimeout(() => {
        cursorTimer = null;
        if (lastCursorSent) connection?.send({ t: "cursor", ...lastCursorSent });
      }, CURSOR_THROTTLE_MS);
    },

    dispose() {
      disposed = true;
      clearTimeout(cursorTimer);
      cursorTimer = null;
      ot.disconnected();
      subscription?.unsubscribe();
      connection?.close();
      subscription = null;
      connection = null;
      quill = null;
      setConnected(false);
    },
  };
}
