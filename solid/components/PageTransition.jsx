import { onMount, onCleanup } from "solid-js";
import { playTransition } from "@/lib/sound";

/*
 * Cinematic page transition — port of src/components/PageTransition.jsx.
 *
 * A full-bleed ink curtain wipes upward off the incoming page, with a giant
 * typographic mark sweeping underneath and the content lifting in.
 *
 * Enter half only. framer drove both halves through AnimatePresence, which
 * Solid has no equivalent for, so the outgoing page no longer wipes *in* — it
 * unmounts immediately and the incoming one plays its entrance. This is the
 * same trade-off recorded for every other panel in this port.
 *
 * The keyframes live in solid-motion.css. Read the fill-mode note there before
 * changing them: `backwards` on the content lift is what stops this wrapper
 * becoming a containing block for its position:fixed descendants, which is a
 * bug React had to patch around by hand.
 */
export default function PageTransition(props) {
  let curtainEl;
  onMount(() => {
    playTransition();
    /*
     * Belt and braces: the curtain is a full-viewport opaque sheet that relies
     * on a CSS animation (or a mode-specific snap rule) to get itself off the
     * page. If ANY mode ever suppresses that animation without its own snap —
     * performance-lite did exactly this — the site sits behind an ink sheet
     * forever. Removing the node shortly after the wipe's duration guarantees
     * the page is visible no matter what the CSS did.
     */
    const timer = window.setTimeout(() => { curtainEl?.remove(); }, 900);
    onCleanup(() => window.clearTimeout(timer));
  });

  return (
    <div class="relative">
      <div ref={curtainEl} class="page-curtain fixed inset-0 z-[80] pointer-events-none bg-ink text-bone overflow-hidden">
        <div class="absolute inset-0 grid-bg opacity-30" />
        <span class="page-curtain-mark absolute left-1/2 top-1/2 select-none font-display font-thin tracking-ultra text-bone/12 text-[30vw] leading-none"> </span>
        <div class="absolute top-6 left-6 tech-label text-bone/40"> TRANSIT</div>
        <div class="absolute bottom-6 right-6 tech-label text-bone/40">MABIS 2026</div>
      </div>

      <div class="page-content-lift">
        {props.children}
      </div>
    </div>
  );
}