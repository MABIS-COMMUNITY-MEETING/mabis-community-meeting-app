/* The SDK's own docs say to import Actor from the bare "@base44/sdk" and let
   the deploy bundler swap it for the Durable Object implementation. This
   backend does not accept bare specifiers — it rejects the file on write — so
   the version is pinned the same way base44/functions/textView/entry.ts pins
   its SDK import. */
import { Actor } from "npm:@base44/sdk@0.8.48";
import Delta from "npm:quill-delta@5.1.0";
import { createOtServer } from "../../shared/ot-server.js";

/*
 * One live meeting document. Room id is the week label, so every person looking
 * at the same week lands in the same instance — which is the whole trick: a
 * Durable Object runs one message at a time, so "the order this actor accepted
 * ops in" is a total order across every participant, with no consensus protocol
 * to write. The transform itself lives in ../../shared/ot-server.js, shared with
 * the convergence checker so the tested code is the shipped code.
 *
 * ── The server does not know what HTML is ───────────────────────────────────
 *
 * The document is stored in DiscussionTopic.description as an HTML string, and
 * turning that into a Delta needs a DOM — Quill does it with a real contenteditable
 * element. There isn't one here. So the actor never parses: the first client into
 * an empty room is asked to seed it (`needsSeed`), because that client already
 * has a live Quill holding exactly the document the server wants. Later clients
 * cannot seed, so a straggler joining with a stale copy can't clobber the room.
 *
 * ── Who writes to the database ──────────────────────────────────────────────
 *
 * Exactly one connection, told so by `role`. Without an election all N clients
 * run their own debounced save and race to overwrite the same row with near-
 * identical HTML — N× the writes and a reintroduction of the last-write-wins
 * clobber this feature exists to remove. Election is "oldest connection still
 * open", reassigned on close, so the role always lands somewhere while anyone
 * is editing.
 *
 * The actor also keeps its own copy in Durable Object storage. That is not the
 * real persistence — it is a crash floor. If every client closes their laptop
 * mid-sentence before a save lands, the room can still hand the next joiner the
 * text rather than silently reverting to whatever was last written to the row.
 */

type Cursor = { index: number; length: number };
type Peer = { id: string; name: string; color: string; cursor: Cursor | null };

/* Long enough that a laptop lid closing doesn't lose the paragraph, short enough
   that the room isn't writing storage on every keystroke. */
const PERSIST_DEBOUNCE_MS = 2000;

export class MeetingDoc extends Actor {
  private ot = createOtServer(Delta);
  private peers = new Map<string, Peer>();
  private seeded = false;
  private writerId: string | null = null;
  private dirty = false;

  async handleStart() {
    const saved = await this.storage.get<{ ops: unknown[]; rev: number }>("doc");
    if (saved?.ops) {
      this.ot.load(new Delta(saved.ops), saved.rev || 0);
      this.seeded = true;
    }
  }

  async handleConnect(conn) {
    this.peers.set(conn.id, { id: conn.id, name: "", color: "", cursor: null });
    if (!this.writerId) this.writerId = conn.id;

    conn.send({
      t: "init",
      rev: this.ot.revision,
      doc: this.ot.document.ops,
      /* Only an unseeded room asks, and only ever of one client — whoever gets
         here first. Everyone else takes the document as given. */
      needsSeed: !this.seeded,
      peers: [...this.peers.values()].filter((p) => p.id !== conn.id && p.name),
      writer: this.writerId === conn.id,
    });
  }

  async handleMessage(conn, msg) {
    if (!msg || typeof msg !== "object") return;

    switch (msg.t) {
      case "hello": {
        /* Identity arrives after connect rather than in the URL: the connection
           token is minted by the platform and we do not get to add claims to it. */
        const peer = this.peers.get(conn.id);
        if (!peer) return;
        peer.name = String(msg.name || "").slice(0, 60);
        peer.color = String(msg.color || "").slice(0, 32);
        this.broadcastExcept(conn.id, { t: "join", id: conn.id, name: peer.name, color: peer.color });
        return;
      }

      case "seed": {
        /* Refused once the room has content. A client that was offline while
           others typed would otherwise reinstate its stale copy over theirs. */
        if (this.seeded) return;
        this.ot.load(new Delta(msg.doc || []), 0);
        this.seeded = true;
        this.markDirty();
        this.broadcastExcept(conn.id, { t: "init", rev: 0, doc: this.ot.document.ops, needsSeed: false, peers: [], writer: false });
        conn.send({ t: "ack", rev: 0 });
        return;
      }

      case "op": {
        const committed = this.ot.receive(new Delta(msg.delta || []), Number(msg.rev));
        if (!committed) {
          /* Further behind than the retained history, so there is nothing left
             to rebase against. Honest resync beats a guess that corrupts. */
          conn.send({
            t: "init",
            rev: this.ot.revision,
            doc: this.ot.document.ops,
            needsSeed: false,
            peers: [...this.peers.values()].filter((p) => p.id !== conn.id && p.name),
            writer: this.writerId === conn.id,
          });
          return;
        }

        /* Everyone's caret just moved, because the text under it did. Doing this
           here keeps the peer list a new joiner receives correct; each client
           also transforms its own copy so carets stay put between joins. */
        for (const peer of this.peers.values()) {
          if (peer.cursor) {
            const index = committed.delta.transformPosition(peer.cursor.index, false);
            const end = committed.delta.transformPosition(peer.cursor.index + peer.cursor.length, false);
            peer.cursor = { index, length: Math.max(0, end - index) };
          }
        }

        /* Broadcast BEFORE the ack. Both are ordered per socket, so this
           guarantees a client sees every op committed ahead of its own before
           it is told its own landed — which is the assumption ot-client.js's
           ack() rests on when it retires a pending op without reconciling. */
        this.broadcastExcept(conn.id, { t: "op", rev: committed.rev, delta: committed.delta.ops, by: conn.id });
        conn.send({ t: "ack", rev: committed.rev });
        this.markDirty();
        return;
      }

      case "cursor": {
        const peer = this.peers.get(conn.id);
        if (!peer) return;
        const index = Math.max(0, Number(msg.index) || 0);
        const length = Math.max(0, Number(msg.length) || 0);
        peer.cursor = { index, length };
        this.broadcastExcept(conn.id, { t: "cursor", id: conn.id, index, length });
        return;
      }
    }
  }

  async handleClose(conn) {
    this.peers.delete(conn.id);
    this.broadcastExcept(conn.id, { t: "leave", id: conn.id });

    if (this.writerId === conn.id) {
      /* Hand the save duty on rather than leaving it with a closed socket.
         getConnections() still includes the departing one on some runtimes, so
         it is filtered explicitly instead of trusted. */
      const next = this.getConnections().find((c) => c.id !== conn.id && this.peers.has(c.id));
      this.writerId = next?.id ?? null;
      if (next) next.send({ t: "role", writer: true });
    }
  }

  handleTick() {
    /* Required by the base class. shouldTick is deliberately not overridden, so
       the platform never starts a timer and the room hibernates when idle —
       a meeting document is quiet for most of its life and should cost nothing
       while it is. */
  }

  protected async handleWake(key: string) {
    if (key !== "persist" || !this.dirty) return;
    this.dirty = false;
    await this.storage.put("doc", { ops: this.ot.document.ops, rev: this.ot.revision });
  }

  private markDirty() {
    if (this.dirty) return;
    this.dirty = true;
    /* Re-arming the same key reschedules rather than stacking, so a burst of
       typing results in one write after it stops. */
    void this.schedule("persist", Date.now() + PERSIST_DEBOUNCE_MS);
  }

  private broadcastExcept(id: string, payload: unknown) {
    for (const conn of this.getConnections()) {
      if (conn.id !== id) conn.send(payload);
    }
  }
}

export default MeetingDoc;
