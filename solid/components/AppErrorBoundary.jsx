import { ErrorBoundary, Show, createMemo } from "solid-js";

/*
 * The last line of defence for the whole routed app.
 *
 * Before this, the only ErrorBoundary in the build was inside Home, around the
 * boss layout's dynamic import. Everywhere else, one thrown error meant Solid
 * unmounted the tree and left #root empty — a white page with no message, no
 * way back, and nothing on screen to suggest a reload would help. That is what
 * "it crashes sometimes" looks like from the outside, whatever the underlying
 * error was.
 *
 * Two distinct failures are handled differently, because they deserve
 * different treatment:
 *
 * 1. A CHUNK THAT WOULD NOT LOAD. Every route and every widget in this app is
 *    a dynamic import, so this is the most likely failure by a wide margin. It
 *    happens on a dropped connection, behind an ad/privacy blocker, and —
 *    routinely — when a tab has been open across a deploy: the hashed filename
 *    this page holds in memory no longer exists on the server, and the service
 *    worker has already evicted it from the cache. Retrying the same import()
 *    cannot fix it: a rejected dynamic import is cached rejected by the module
 *    loader, so every retry resolves to the same rejection. A reload is the
 *    only real recovery, so we do it automatically, exactly once.
 *
 * 2. A GENUINE BUG. Something threw in a component. A reload loop would be
 *    worse than the error — it would hammer straight back into the same throw
 *    — so this shows a plain recovery panel and lets the reader choose. reset()
 *    is offered first because most such errors are transient (a bad render
 *    from a half-loaded record) and re-rendering fixes them without losing the
 *    page.
 *
 * The reload guard lives in sessionStorage, not a module variable: the whole
 * point is to survive the reload, and a module variable is destroyed by it.
 * Session scope means a genuinely broken build shows the panel on the second
 * attempt instead of reloading forever, and a new tab starts fresh.
 */

const RELOAD_GUARD_KEY = "mabis-chunk-reload";

const CHUNK_ERROR_PATTERN = /dynamically imported module|importing a module script failed|failed to fetch|loading chunk|css chunk/i;

function isChunkLoadError(error) {
  const message = String(error?.message ?? error ?? "");
  return CHUNK_ERROR_PATTERN.test(message);
}

/** True when we have not already tried a reload for this session. */
function claimReloadAttempt() {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
    return true;
  } catch {
    // Private mode / storage disabled: do not reload at all rather than risk
    // an unguarded loop.
    return false;
  }
}

export function clearChunkReloadGuard() {
  try {
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch {
    /* nothing to clear */
  }
}

export default function AppErrorBoundary(props) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => <CrashPanel error={error} reset={reset} />}
    >
      {props.children}
    </ErrorBoundary>
  );
}

function CrashPanel(props) {
  // createMemo, not a bare call: this runs during render, and the reload is a
  // side effect we want to happen exactly once for this fallback instance.
  const reloading = createMemo(() => {
    if (!isChunkLoadError(props.error)) return false;
    if (!claimReloadAttempt()) return false;
    window.location.reload();
    return true;
  });

  return (
    <div class="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-ink px-6 py-16 text-center text-bone">
      <Show
        when={!reloading()}
        fallback={<span class="tech-label text-bone/60">RELOADING</span>}
      >
        <span class="tech-label text-bone/50">SOMETHING BROKE</span>

        <p class="max-w-md font-display text-2xl font-light leading-tight tracking-tight">
          This part of the app stopped working.
        </p>

        <p class="max-w-sm text-sm leading-relaxed text-bone/60">
          Nothing you saved has been lost. Try again, and if it keeps happening,
          reload the page.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={props.reset}
            class="tech-label border border-bone/40 bg-bone/5 px-5 py-3 text-bone transition-colors hover:bg-bone hover:text-ink"
          >
            TRY AGAIN
          </button>
          <button
            type="button"
            onClick={() => {
              // A manual reload is a deliberate choice, so it must not be
              // blocked by the automatic guard from an earlier failure.
              clearChunkReloadGuard();
              window.location.reload();
            }}
            class="tech-label border border-bone/20 px-5 py-3 text-bone/70 transition-colors hover:border-bone/40 hover:text-bone"
          >
            RELOAD
          </button>
        </div>
      </Show>
    </div>
  );
}