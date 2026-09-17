/*
 * Client-side operational transform over Quill Deltas.
 *
 * ── Why OT and not "just send the document" ─────────────────────────────────
 *
 * The meeting document is saved today by overwriting DiscussionTopic.description
 * with the whole HTML body on an 800ms debounce. With one editor that is fine.
 * With two it is a data-loss bug: both people hold a full copy, both overwrite,
 * and whoever's debounce fires last silently erases the other's paragraph. No
 * error, no conflict, no trace — the text is simply gone on the next load.
 *
 * Sending *edits* instead of *documents* is what fixes that, and edits need a
 * merge rule, because two edits made against the same base do not compose: if I
 * type at index 10 and you delete index 3-7, my index 10 is stale by the time
 * your delete lands. Transform is the function that rewrites my edit to account
 * for yours. Quill's Delta already implements it — `transform` and
 * `transformPosition` — which is the whole reason this is ~200 lines of
 * bookkeeping rather than a CRDT dependency.
 *
 * ── The state machine ───────────────────────────────────────────────────────
 *
 * Three fields, and the invariant that ties them together:
 *
 *   local document === serverDocumentAt(rev) ∘ pending ∘ buffer
 *
 *   rev      the server revision this client has applied everything up to
 *   pending  the ONE op sent to the server and not yet acknowledged
 *   buffer   every local edit made since, composed into a single op
 *
 * Exactly one op is ever in flight. That is not a throttle bolted on for
 * politeness — it is what makes the server's job tractable. The server
 * transforms an incoming op against the ops it has accepted since that client's
 * stated revision; if a client could have two ops outstanding, the second one's
 * base would be a revision that never existed on the server and there would be
 * nothing to transform against.
 *
 * It also happens to be the right latency behaviour for free. Fast typing does
 * not queue a message per keystroke; it composes into `buffer` and leaves as one
 * op the instant the previous ack lands. The wire rate self-tunes to the round
 * trip: fast link, more smaller ops; slow link, fewer larger ones. There is no
 * debounce constant here to guess wrong.
 *
 * ── Priority ────────────────────────────────────────────────────────────────
 *
 * `a.transform(b, priority)` returns b' with `a ∘ b' === b ∘ a'`. The flag only
 * decides tie-breaks — whose text goes left when two people insert at the same
 * index. Throughout this file the rule is: an op the server has already
 * committed beats an op of ours that it has not. Since the server hands out a
 * single total revision order, every client breaks every tie the same way, which
 * is what makes the documents converge rather than merely "usually agree".
 *
 * ── No Solid, no DOM, no sockets ────────────────────────────────────────────
 *
 * Deliberately. This module is a state machine with callbacks, so
 * scripts/check-ot-convergence.mjs can run hundreds of randomised multi-client
 * sessions in-process. Transform-priority bugs do not show up in a smoke test —
 * they need two people typing in the same paragraph at the same moment, which is
 * exactly the thing you cannot reliably reproduce by hand.
 */

/**
 * @param {object} options
 * @param {typeof import("quill-delta")} options.Delta  Delta constructor.
 * @param {(message: object) => void} options.send      Ship one message to the actor.
 * @param {(delta: object) => void} options.apply       Apply a remote delta to the editor.
 * @param {(rev: number, doc: object) => void} [options.reset]
 *        Called on (re)connect with the authoritative document.
 */
export function createOtClient({ Delta, send, apply, reset }) {
  let rev = 0;
  let pending = null;
  let buffer = null;
  /* Until the server has said what revision we are on, local edits cannot be
     sent — they would claim a base revision we invented. They still compose
     into `buffer` and go out on the first ack after init, so typing during the
     connect handshake is kept rather than dropped. */
  let synced = false;

  const compose = (a, b) => (a ? a.compose(b) : b);

  /** Flush the buffer into the empty in-flight slot, if there is anything to flush. */
  const pump = () => {
    if (!synced || pending || !buffer) return;
    pending = buffer;
    buffer = null;
    send({ t: "op", rev, delta: pending.ops });
  };

  return {
    get revision() { return rev; },
    /** True while local work has not been acknowledged — drives the "Saving…" hint. */
    get inFlight() { return Boolean(pending || buffer); },
    get ready() { return synced; },

    /**
     * The authoritative document, on connect or reconnect.
     *
     * Any pending/buffered work is dropped rather than replayed. On a first
     * connect there is nothing to drop. On a *re*connect, replaying would be
     * actively wrong: we cannot know whether the server committed the op before
     * the socket died, so replaying risks applying it twice, and the transform
     * base it was written against may be many revisions stale. The server copy
     * wins and the editor is reseeded from it.
     */
    init(serverRev, doc) {
      rev = serverRev;
      pending = null;
      buffer = null;
      synced = true;
      reset?.(serverRev, doc);
    },

    /** A local edit the user just made. `delta` is Quill's text-change delta. */
    local(delta) {
      const op = delta instanceof Delta ? delta : new Delta(delta);
      if (!op.ops.length) return;
      buffer = compose(buffer, op);
      pump();
    },

    /**
     * The server accepted our in-flight op and gave it this revision.
     *
     * By the time an ack arrives, every op the server committed *before* ours
     * has already been delivered and transformed into `pending` — the socket is
     * ordered, and the actor broadcasts before it acks. So `pending` is now
     * byte-identical to what the server applied, and simply advancing the
     * revision is correct; there is nothing left to reconcile.
     */
    ack(serverRev) {
      if (!synced) return;
      rev = serverRev;
      pending = null;
      pump();
    },

    /**
     * An op from somebody else, already committed at `serverRev`.
     *
     * Rebase it over our outstanding work so it can be applied to what the user
     * is actually looking at, and rebase our outstanding work over it so it
     * still means the right thing when it reaches the server.
     */
    remote(serverRev, rawDelta) {
      if (!synced) return;
      let incoming = rawDelta instanceof Delta ? rawDelta : new Delta(rawDelta);

      /* Order matters: rebase over `pending` first, then `buffer`, because that
         is the order they sit in on top of the server document. Doing it the
         other way round produces a delta that is internally consistent and
         lands in the wrong place — the failure mode that looks like text
         appearing a few characters off when two people type at once.

         The flags look inverted and are not. quill-delta's identity is

             a ∘ a.transform(b, p) === b ∘ b.transform(a, !p)

         so the priority that decides the tie sits on the call that produces the
         OTHER side's rebased op. We need the committed op to win, which means
         `incoming.transform(pending, true)` — and that forces `false` on the
         partner call. ot-server.js rebases the same pair with the same rule
         (`history[i].transform(delta, true)`), so the client's copy of its own
         pending op stays byte-identical to the one the server commits. Flip
         either one and the two sides quietly disagree about whose insert goes
         left; check-ot-convergence.mjs fails on seed 1 within a second. */
      if (pending) {
        const nextPending = incoming.transform(pending, true);
        incoming = pending.transform(incoming, false);
        pending = nextPending;
      }
      if (buffer) {
        const nextBuffer = incoming.transform(buffer, true);
        incoming = buffer.transform(incoming, false);
        buffer = nextBuffer;
      }

      rev = serverRev;
      apply(incoming);
      return incoming;
    },

    /**
     * Where a stored cursor ends up after a delta is applied.
     *
     * Remote carets are positions in a document that just changed underneath
     * them. Without this they drift: someone types a line above you and your
     * name-flag slides to the wrong word, then keeps sliding. `priority` false
     * pushes a caret sitting exactly at an insertion point to the right of the
     * inserted text, which is where a human expects their own cursor to stay.
     */
    transformCursor(delta, cursor) {
      if (!cursor) return cursor;
      const index = delta.transformPosition(cursor.index, false);
      const end = delta.transformPosition(cursor.index + (cursor.length || 0), false);
      return { ...cursor, index, length: Math.max(0, end - index) };
    },

    /** Connection lost. Keep local work; it is dropped by init() on resync. */
    disconnected() {
      synced = false;
    },
  };
}
