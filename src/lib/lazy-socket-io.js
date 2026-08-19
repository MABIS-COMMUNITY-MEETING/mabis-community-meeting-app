/*
 * Lazy stand-in for socket.io-client.
 *
 * WHY THIS EXISTS
 *
 * @base44/sdk's client.js statically imports RoomsSocket, which statically
 * imports `io` from socket.io-client. base44Client is on the boot path — the
 * auth check is the first thing the app does — so the entire realtime stack
 * (socket.io-client, engine.io-client and both parsers: 40.1 KiB minified,
 * 12.3 KiB gzipped, measured) was downloaded, parsed and compiled on every
 * single page load.
 *
 * Nothing on the boot path uses it. The SDK builds the socket lazily —
 * createClient's getSocket() only runs on the first entities.X.subscribe() —
 * and this app's only subscriber is useActivePresence(), inside the lazy
 * MembersWidget chunk. So the code was eager and the connection was not.
 *
 * vite.config.js aliases the bare `socket.io-client` specifier to this file,
 * which hands back a socket-shaped object immediately and fetches the real
 * library in the background. The SDK is unmodified and unaware.
 *
 * WHY IT IS SAFE HERE
 *
 * Presence is not correctness-critical: useActivePresence() also polls on a
 * 15-second refetchInterval, and the subscription only invalidates that query
 * early. A few hundred milliseconds of extra latency on the first connect is
 * invisible; a failed load degrades to exactly the polling behaviour.
 *
 * SUPPORTED SURFACE
 *
 * on / once / off / emit / connect / disconnect / close, and the `id`,
 * `connected` and `disconnected` getters — everything utils/socket-utils.js
 * touches, plus the obvious neighbours. It is deliberately an explicit list
 * rather than a Proxy: a Proxy would silently return undefined for a method
 * the real socket has and this does not, whereas an explicit object throws
 * where it can be seen. If an SDK upgrade starts calling something else, add
 * it here.
 */

/* Resolved by the `real:socket.io-client` alias in the Vite configs, which
   points at the package's own ESM entry. It cannot be the bare specifier:
   that one is aliased to this file, so the import would resolve back here. */
let realModulePromise = null;

function loadReal() {
  if (!realModulePromise) realModulePromise = import("real:socket.io-client");
  return realModulePromise;
}

export function io(...args) {
  let real = null;
  /* Registrations and sends that arrive before the library does. socket.io
     buffers emits itself once the socket exists, so this queue only has to
     cover the download window, not the connection window. */
  const listeners = [];
  const outbox = [];
  let closed = false;

  loadReal()
    .then((module) => {
      if (closed) return;
      real = module.io(...args);
      for (const [method, event, handler] of listeners) real[method](event, handler);
      for (const emitArgs of outbox) real.emit(...emitArgs);
      listeners.length = 0;
      outbox.length = 0;
    })
    .catch(() => {
      /* Offline, or the chunk 404'd after a deploy. Callers that depend on
         realtime already tolerate never connecting. */
    });

  const socket = {
    get id() { return real ? real.id : undefined; },
    get connected() { return real ? real.connected : false; },
    get disconnected() { return real ? real.disconnected : true; },

    on(event, handler) {
      if (real) real.on(event, handler);
      else listeners.push(["on", event, handler]);
      return socket;
    },
    once(event, handler) {
      if (real) real.once(event, handler);
      else listeners.push(["once", event, handler]);
      return socket;
    },
    off(event, handler) {
      if (real) real.off(event, handler);
      else {
        for (let i = listeners.length - 1; i >= 0; i--) {
          const [, listenerEvent, listenerHandler] = listeners[i];
          if (listenerEvent === event && (handler === undefined || listenerHandler === handler)) {
            listeners.splice(i, 1);
          }
        }
      }
      return socket;
    },
    emit(...emitArgs) {
      if (real) real.emit(...emitArgs);
      else outbox.push(emitArgs);
      return socket;
    },
    connect() {
      closed = false;
      if (real) real.connect();
      else loadReal().catch(() => {});
      return socket;
    },
    disconnect() {
      /* Latches, so a disconnect issued while the library is still in flight
         is not undone by the load completing and connecting anyway. */
      closed = true;
      listeners.length = 0;
      outbox.length = 0;
      if (real) real.disconnect();
      return socket;
    },
  };
  socket.close = socket.disconnect;

  return socket;
}

export default { io };
