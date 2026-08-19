/*
 * Lazy stand-in for partysocket. Same arrangement as lazy-socket-io.js — read
 * that file's header first; this one only notes what differs.
 *
 * partysocket is the transport behind @base44/sdk's Actors module. createClient
 * builds `client.actors` eagerly, so the library rode the boot path at 8.8 KiB
 * minified (3.0 KiB gzipped, measured) even though this app never touches
 * base44.actors at all — there is not one reference in src/ or solid/.
 *
 * Deleting it outright would be smaller still, and wrong: the day someone does
 * use an actor it must work, not fail with a stub error. So it loads on
 * construction instead, which for the current app means never.
 *
 * SUPPORTED SURFACE
 *
 * addEventListener / removeEventListener / send / close / reconnect and the
 * `readyState` getter — what modules/actors.js uses. Extend it if the SDK
 * starts using more.
 */

let realModulePromise = null;

function loadReal() {
  if (!realModulePromise) realModulePromise = import("real:partysocket");
  return realModulePromise;
}

export default class LazyPartySocket {
  #real = null;
  #listeners = [];
  #outbox = [];
  #closed = false;

  constructor(...args) {
    loadReal()
      .then((module) => {
        if (this.#closed) return;
        const PartySocket = module.default ?? module.PartySocket;
        this.#real = new PartySocket(...args);
        for (const [type, listener, options] of this.#listeners) {
          this.#real.addEventListener(type, listener, options);
        }
        /* Real PartySocket buffers sends made before the socket opens, so
           flushing straight after construction keeps the same semantics the
           caller would have had with a static import. */
        for (const data of this.#outbox) this.#real.send(data);
        this.#listeners.length = 0;
        this.#outbox.length = 0;
      })
      .catch(() => {
        /* Offline or a stale chunk. actors.js already treats a dead socket as
           a transient condition and reconnects on its watchdog. */
      });
  }

  get readyState() {
    /* WebSocket.CONNECTING. Named by value because this module must not import
       a DOM global that may not exist wherever the SDK is run. */
    return this.#real ? this.#real.readyState : 0;
  }

  addEventListener(type, listener, options) {
    if (this.#real) this.#real.addEventListener(type, listener, options);
    else this.#listeners.push([type, listener, options]);
  }

  removeEventListener(type, listener, options) {
    if (this.#real) {
      this.#real.removeEventListener(type, listener, options);
      return;
    }
    for (let i = this.#listeners.length - 1; i >= 0; i--) {
      const [pendingType, pendingListener] = this.#listeners[i];
      if (pendingType === type && pendingListener === listener) this.#listeners.splice(i, 1);
    }
  }

  send(data) {
    if (this.#real) this.#real.send(data);
    else this.#outbox.push(data);
  }

  reconnect(...args) {
    if (this.#real) this.#real.reconnect(...args);
  }

  close(...args) {
    /* Latches: a close issued while the library is still downloading must not
       be undone by the load completing and opening a socket anyway. */
    this.#closed = true;
    this.#listeners.length = 0;
    this.#outbox.length = 0;
    if (this.#real) this.#real.close(...args);
  }
}

export { LazyPartySocket as PartySocket };
