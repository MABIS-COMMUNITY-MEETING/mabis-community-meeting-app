/*
 * Is this browser compositing in SOFTWARE?
 *
 * Why this exists, and why it is not a Linux check
 * ────────────────────────────────────────────────
 * "Make it fast on Linux" is really "make it fast when there is no working GPU
 * acceleration", and those are not the same question. A Linux box with a real
 * GPU and a modern compositor runs this app exactly as fast as the same
 * hardware on Windows — sniffing the platform string would punish it for no
 * reason. Meanwhile the machines that genuinely struggle are the ones falling
 * back to a software rasteriser, and that happens for reasons the platform
 * string cannot see:
 *
 *   · llvmpipe / softpipe — Mesa's CPU rasterisers, the usual result of a VM, a
 *     missing/blacklisted driver, or a Wayland session without hardware accel.
 *     Overwhelmingly a Linux situation, which is why this helps Linux most.
 *   · SwiftShader — Chrome's own CPU fallback, on any OS, whenever it decides
 *     the GPU is untrustworthy (also what `--disable-gpu` leaves you with).
 *   · Firefox with layers.acceleration disabled, common on older Linux setups.
 *
 * On a software rasteriser `backdrop-filter` is the single most expensive thing
 * this app does: it re-reads the pixels beneath the surface every frame and
 * blurs them on the CPU, at a cost that scales with area × radius. The header
 * is full-width, so it is the worst case, and it is on screen permanently.
 *
 * What this buys over the frame monitor we already have
 * ─────────────────────────────────────────────────────
 * monitorFrameBudget() would eventually notice — but only after 800 ms of
 * warm-up plus a 2000 ms judging window, so the user watches ~3 s of stutter
 * first, and it judges exactly once. This is a direct capability read, so a
 * software-rendered browser starts in the lite tier instead of being demoted
 * into it after the fact.
 *
 * Cost and safety
 * ───────────────
 * One throwaway WebGL context, read once, cached, then explicitly released via
 * WEBGL_lose_context so we do not hold a context the page may want later.
 * Everything is wrapped: WEBGL_debug_renderer_info is unavailable in some
 * privacy configurations and WebGL itself can be absent, and in both of those
 * cases the honest answer is "unknown" — which must mean "assume a GPU" and
 * leave the frame monitor to make the call from evidence. Guessing "software"
 * here would strip the material off perfectly capable machines.
 */

const SOFTWARE_RENDERER_PATTERN = /llvmpipe|softpipe|swiftshader|software rasterizer|basic render|generic renderer/i;

let cached;

export function isSoftwareRendered() {
  if (cached !== undefined) return cached;
  cached = probe();
  return cached;
}

function probe() {
  if (typeof document === "undefined") return false;

  let gl = null;
  try {
    const canvas = document.createElement("canvas");
    // failIfMajorPerformanceCaveat is the actual point of this call: the spec
    // says the context creation FAILS when the implementation would only be
    // able to run with a major performance caveat — i.e. software rendering.
    // So a null result here is itself the signal, no string matching needed.
    gl = canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true })
      || canvas.getContext("experimental-webgl", { failIfMajorPerformanceCaveat: true });

    if (!gl) {
      // Could not get an accelerated context. Confirm WebGL exists at all
      // before concluding "software" — if the browser has no WebGL whatsoever
      // (disabled by policy, hardened profile) that tells us nothing about the
      // compositor, so we must not demote on it.
      const plain = document.createElement("canvas").getContext("webgl");
      const softwareOnly = Boolean(plain);
      release(plain);
      return softwareOnly;
    }

    // We have an accelerated context, but Chrome still reports SwiftShader
    // through this path in some configurations, so verify the renderer name.
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    return SOFTWARE_RENDERER_PATTERN.test(renderer);
  } catch {
    return false;
  } finally {
    release(gl);
  }
}

function release(gl) {
  try {
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    /* nothing to release */
  }
}