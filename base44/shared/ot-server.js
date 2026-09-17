/*
 * Authoritative operational transform for one document room.
 *
 * Lives in base44/shared/ for the same reason board.js does: it is imported by
 * backend code (the MeetingDoc actor) and by a build-time check that runs in
 * Node. Sharing the module means scripts/check-ot-convergence.mjs exercises the
 * code that actually ships, not a second implementation written to match it —
 * which for transform logic is the difference between a real test and a
 * comforting one.
 *
 * `Delta` is injected rather than imported. The actor gets it from an npm:
 * specifier on the Cloudflare runtime and the checker gets it from node_modules;
 * neither resolution style works in the other place.
 *
 * ── Why a server at all, when the clients could gossip ──────────────────────
 *
 * Because transform needs a total order to agree on. Two clients that merge
 * each other's ops pairwise can reach different documents from the same pair of
 * edits depending on arrival order. A single actor instance per room is
 * inherently serialized — Durable Objects run one at a time — so "the order the
 * actor accepted them in" IS the total order, for free, with no consensus
 * protocol. That is the whole reason this design is small.
 */

/* Ops kept for rebasing clients that are behind. A client further back than
   this is told to resync instead: its base revision no longer exists here, so
   there is nothing to transform against and guessing would corrupt the doc.
   200 ops is many minutes of typing — a client that far behind has had a
   network problem, and a resync is the honest answer to it. */
const HISTORY_LIMIT = 200;

export function createOtServer(Delta, { doc, rev = 0 } = {}) {
  let document = doc instanceof Delta ? doc : new Delta(doc || []);
  let revision = rev;
  /* Parallel arrays: history[i] is the delta that produced revision
     firstRevision + i + 1. */
  let history = [];
  let firstRevision = revision;

  const trim = () => {
    if (history.length <= HISTORY_LIMIT) return;
    const drop = history.length - HISTORY_LIMIT;
    history = history.slice(drop);
    firstRevision += drop;
  };

  return {
    get revision() { return revision; },
    get document() { return document; },
    /** Oldest revision a client may still submit against. */
    get horizon() { return firstRevision; },

    /**
     * Accept one client op stated against `clientRev`.
     *
     * Returns the op as actually committed — rebased over everything accepted
     * since — plus its new revision. That rebased form is what gets broadcast,
     * so every other client receives an op whose base is the revision it is
     * already holding.
     *
     * Returns null when the client is too far behind to rebase; the caller
     * should resync it with the full document.
     */
    receive(rawDelta, clientRev) {
      if (clientRev < firstRevision || clientRev > revision) return null;

      let delta = rawDelta instanceof Delta ? rawDelta : new Delta(rawDelta);
      /* Everything committed since the client's base, in commit order. Each
         one takes priority: it is already part of the document's history and
         this op is not, so ties resolve toward the older text. Every client
         applies the same rule to the same sequence, which is what makes them
         converge instead of merely ending up close. */
      for (let i = clientRev - firstRevision; i < history.length; i++) {
        delta = history[i].transform(delta, true);
      }

      document = document.compose(delta);
      revision += 1;
      history.push(delta);
      trim();
      return { delta, rev: revision };
    },

    /** Replace the document wholesale (used to seed a cold room from storage). */
    load(nextDoc, nextRev = 0) {
      document = nextDoc instanceof Delta ? nextDoc : new Delta(nextDoc || []);
      revision = nextRev;
      history = [];
      firstRevision = nextRev;
    },
  };
}
