import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

/*
 * Aliases that move @base44/sdk's realtime transports off the boot path.
 *
 * The SDK statically imports socket.io-client (via utils/socket-utils.js) and
 * partysocket (via modules/actors.js). base44Client is the first thing the app
 * loads — the auth check — so both libraries were downloaded, parsed and
 * compiled on every page load: 48.9 KiB minified, 15.3 KiB gzipped, measured
 * against a build with them stubbed out. Neither is used before first paint,
 * and partysocket is not used by this app at all.
 *
 * These aliases redirect the bare specifiers to the shims in src/lib/, which
 * present the same API and fetch the real library in the background. See
 * src/lib/lazy-socket-io.js for the full rationale and the supported surface.
 *
 * Shared by vite.config.js and vite.solid.config.js so the parity harness
 * exercises exactly what ships.
 */

const require = createRequire(import.meta.url);

/*
 * The shims cannot import the real packages by their bare names — those are
 * aliased to the shims, so the import would resolve back to itself. They use
 * `real:<pkg>` instead, resolved here to the package's own ESM entry.
 *
 * Read from package.json rather than hardcoded: a version bump that moves the
 * entry file then fails loudly at resolve time instead of silently bundling
 * a CommonJS build.
 */
function esmEntry(pkg) {
  /*
   * Walked up from the resolved main rather than asked for directly:
   * require.resolve(`${pkg}/package.json`) fails with ERR_PACKAGE_PATH_NOT_EXPORTED
   * on any package whose `exports` map omits "./package.json", which partysocket's
   * does. The name check skips the `{"type":"commonjs"}` marker manifests that
   * some packages drop inside their build directories.
   */
  const dir = path.dirname(require.resolve(pkg));
  let manifestPath = null;
  for (let parent = dir; ; parent = path.dirname(parent)) {
    const candidate = path.join(parent, "package.json");
    if (fs.existsSync(candidate) && require(candidate).name === pkg) {
      manifestPath = candidate;
      break;
    }
    if (path.dirname(parent) === parent) {
      throw new Error(`lazy-realtime-aliases: could not locate the package root for ${pkg}`);
    }
  }

  const manifest = require(manifestPath);
  const entry = manifest.module
    ?? manifest.exports?.["."]?.import?.default
    ?? manifest.exports?.["."]?.import;
  if (typeof entry !== "string") {
    throw new Error(`lazy-realtime-aliases: no ESM entry found for ${pkg}; check its package.json`);
  }
  return path.resolve(path.dirname(manifestPath), entry);
}

export function lazyRealtimeAliases() {
  const src = path.resolve(process.cwd(), "src", "lib");
  return {
    /*
     * Exact-match only. Vite matches a string alias when the specifier equals
     * it or starts with it plus "/", so "real:socket.io-client" is not caught
     * by the "socket.io-client" entry below.
     */
    "socket.io-client": path.join(src, "lazy-socket-io.js"),
    partysocket: path.join(src, "lazy-partysocket.js"),
    "real:socket.io-client": esmEntry("socket.io-client"),
    "real:partysocket": esmEntry("partysocket"),
  };
}
