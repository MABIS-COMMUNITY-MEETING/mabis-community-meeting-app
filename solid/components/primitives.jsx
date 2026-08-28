import { createSignal, onMount, onCleanup, splitProps, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { subscribe } from "@/lib/physics/scheduler";
import { integrateSpring } from "@/lib/physics/math";
import { springFromFramer, useJapaneseText, finePointer } from "~/lib/motion";

const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/* ── JapaneseText ──────────────────────────────────────────────────────────
   Same contract as src/components/JapaneseText.jsx: English always renders,
   the Japanese companion is appended only when the preference is on, carries
   lang="ja" so the Maple Mono CJK fallback applies, and marks the English span
   data-ja-skip so the auto-companion scanner never double-translates it.     */
export function JapaneseText(props) {
  const enabled = useJapaneseText();
  const layout = () => (props.layout === "inline" ? "ml-1.5 inline" : "mt-0.5 block");
  // Anything the caller passes beyond the known props is forwarded to the
  // element, matching React's `...props`. Without this, attributes like
  // data-section-description and id were silently dropped.
  const [, rest] = splitProps(props, ["as", "ja", "class", "japaneseClass", "layout", "children"]);

  // `as` is load-bearing, not cosmetic: callers pass as="div"/as="p" and rely
  // on the element being block-level (mb-4 on an inline span is ignored).
  // Dynamic swaps the tag without introducing a wrapper node.
  return (
    <Dynamic component={props.as || "span"} class={props.class} {...rest}>
      <span data-ja-skip>{props.children}</span>
      <Show when={enabled() && props.ja}>
        <span
          lang="ja"
          class={`${layout()} ${props.japaneseClass || "text-[0.72em] font-normal tracking-normal opacity-65"}`}
        >
          {props.ja}
        </span>
      </Show>
    </Dynamic>
  );
}

/* ── KineticBackground ─────────────────────────────────────────────────────
   Pure CSS in the original too, so this is a literal 1:1 transcription:
   className→class and camelCase style keys→kebab-case (Solid applies style
   objects directly to el.style and does not camel-case them for you).        */
export function KineticBackground(props) {
  const onInk = () => (props.variant ?? "ink") === "ink";
  return (
    <div class={`pointer-events-none absolute inset-0 overflow-hidden ${props.class || ""}`} aria-hidden>
      <div class="absolute inset-0 grid-bg opacity-40" />
      <div
        class="absolute left-1/2 top-1/2 h-[72vw] w-[72vw] max-w-[780px] max-h-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl blob-drift"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.34) 0%, transparent 62%)" }}
      />
      <div
        class="absolute right-[6%] bottom-[4%] h-[42vw] w-[42vw] max-w-[440px] max-h-[440px] rounded-full blur-3xl blob-drift-2"
        style={{ background: "radial-gradient(circle, hsl(var(--secondary)/0.22) 0%, transparent 60%)" }}
      />
      <div
        class="absolute left-1/2 top-1/2 h-[130vw] w-[130vw] -translate-x-1/2 -translate-y-1/2 spin-slow opacity-[0.06]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, hsl(var(--primary)), transparent 38%, hsl(var(--secondary)), transparent 76%)",
          "border-radius": "999px",
        }}
      />
      <div
        class="absolute inset-0"
        style={{
          background: onInk()
            ? "radial-gradient(120% 80% at 50% 40%, transparent 40%, hsl(var(--ink)/0.55) 100%)"
            : "radial-gradient(120% 80% at 50% 40%, transparent 45%, hsl(var(--background)/0.4) 100%)",
        }}
      />
    </div>
  );
}

/* ── Marquee ───────────────────────────────────────────────────────────────
   The React version renders {children} twice for the seamless loop. That does
   not translate: Solid's JSX produces real DOM nodes, and a node can only
   occupy one position — rendering the same children twice MOVES them rather
   than duplicating. So children is a function here and is invoked per copy,
   which builds two independent subtrees. Same CSS animation as before.       */
export function Marquee(props) {
  return (
    <div class={`relative overflow-hidden ${props.class || ""}`}>
      <div
        class="flex w-max"
        style={{ animation: `marquee-x ${props.speed ?? 28}s linear infinite${props.reverse ? " reverse" : ""}` }}
      >
        <div class="flex shrink-0">{props.children()}</div>
        <div class="flex shrink-0" aria-hidden>{props.children()}</div>
      </div>
    </div>
  );
}

/* ── MagneticButton ────────────────────────────────────────────────────────
   Replaces framer's useSpring with the app's own analytic spring on the
   shared fixed-timestep scheduler. Transforms are written straight to the
   node in the render phase (never through a signal) so no reactive graph
   work or reconciliation happens per frame, and the scheduler parks itself
   once settled() goes true.                                                  */
export function MagneticButton(props) {
  let el;
  const strength = () => props.strength ?? 0.35;
  const { omega, zeta } = springFromFramer(200, 15, 0.2);

  onMount(() => {
    if (!finePointer()) return;

    const sx = { x: 0, v: 0 };
    const sy = { x: 0, v: 0 };
    let previousX = 0;
    let previousY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMove = (e) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      targetX = (e.clientX - (r.left + r.width / 2)) * strength();
      targetY = (e.clientY - (r.top + r.height / 2)) * strength();
    };
    const reset = () => { targetX = 0; targetY = 0; };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", reset);

    const unsubscribe = subscribe({
      step: (dt) => {
        previousX = sx.x;
        previousY = sy.x;
        integrateSpring(sx, targetX, omega, zeta, dt);
        integrateSpring(sy, targetY, omega, zeta, dt);
      },
      render: (alpha) => {
        if (!el) return;
        const a = Math.max(0, Math.min(1, alpha));
        const x = previousX + (sx.x - previousX) * a;
        const y = previousY + (sy.x - previousY) * a;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      },
      settled: () =>
        Math.abs(sx.x - targetX) < 0.05 && Math.abs(sy.x - targetY) < 0.05 &&
        Math.abs(sx.v) < 0.05 && Math.abs(sy.v) < 0.05,
    });

    onCleanup(() => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", reset);
      unsubscribe();
    });
  });

  return (
    <span ref={el} class={props.class} style={{ display: "inline-block" }}>
      {props.children}
    </span>
  );
}

/* ── SplitChars ────────────────────────────────────────────────────────────
   framer's variants/staggerChildren reduce to one CSS transition per glyph
   with a computed delay — identical curve (0.7s, the shared EASE), identical
   y 115%→0 and opacity 0→1. Running it on the compositor instead of through
   a JS animation loop means the hero headline costs nothing after paint.     */
export function SplitChars(props) {
  const [shown, setShown] = createSignal(false);

  onMount(() => {
    // Two frames: one for the initial state to paint, one to flip it, so the
    // transition actually runs instead of being collapsed by style batching.
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  });

  const delayFor = (i) => (props.delay ?? 0) + i * (props.stagger ?? 0.05);

  return (
    <span class={`reveal-mask ${props.class || ""}`} style={{ display: "inline-block" }}>
      <For each={Array.from(props.text)}>
        {(c, i) => (
          <span style={{ display: "inline-block", overflow: "hidden", "vertical-align": "top" }}>
            <span
              style={{
                display: "inline-block",
                transform: shown() ? "translateY(0%)" : "translateY(115%)",
                opacity: shown() ? 1 : 0,
                transition: `transform 0.7s ${EASE_CSS} ${delayFor(i())}s, opacity 0.7s ${EASE_CSS} ${delayFor(i())}s`,
              }}
            >
              {c === " " ? " " : c}
            </span>
          </span>
        )}
      </For>
    </span>
  );
}
