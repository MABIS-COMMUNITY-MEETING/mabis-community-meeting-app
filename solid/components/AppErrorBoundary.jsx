import { ErrorBoundary } from "solid-js";

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
 * Chunk-load failures and genuine component errors both stop here. Neither is
 * allowed to reload automatically: an unrequested refresh looks exactly like
 * a random cut to the boot screen and can interrupt a meeting or document.
 * The reader keeps control through explicit TRY AGAIN and RELOAD actions.
 */

const CHUNK_ERROR_PATTERN = /dynamically imported module|importing a module script failed|failed to fetch|loading chunk|css chunk/i;

function isChunkLoadError(error) {
  const message = String(error?.message ?? error ?? "");
  return CHUNK_ERROR_PATTERN.test(message);
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
  const chunkError = isChunkLoadError(props.error);

  return (
    <div class="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-ink px-6 py-16 text-center text-bone">
      <span class="tech-label text-bone/50">
        {chunkError ? "CONNECTION INTERRUPTED" : "SOMETHING BROKE"}
      </span>

      <p class="max-w-md font-display text-2xl font-light leading-tight tracking-tight">
        This part of the app stopped working.
      </p>

      <p class="max-w-sm text-sm leading-relaxed text-bone/60">
        {chunkError
          ? "The page was kept open instead of reloading automatically. Check your connection, then try again."
          : "Nothing you saved has been lost. Try again, and reload only if the problem continues."}
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
          onClick={() => window.location.reload()}
          class="tech-label border border-bone/20 px-5 py-3 text-bone/70 transition-colors hover:border-bone/40 hover:text-bone"
        >
          RELOAD
        </button>
      </div>
    </div>
  );
}