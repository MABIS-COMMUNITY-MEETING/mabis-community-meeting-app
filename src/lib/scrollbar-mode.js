/**
 * Only restyle the scrollbar where the OS draws a classic one.
 *
 * THE BUG THIS FIXES
 *
 * index.css styles `::-webkit-scrollbar` down to a 6px technical bar. On
 * Windows and Linux that is purely cosmetic: those platforms already draw
 * classic scrollbars — always visible, occupying layout width — so restyling
 * one changes how it looks and nothing else.
 *
 * macOS draws OVERLAY scrollbars. They stay hidden until you scroll, fade out
 * afterwards, widen when the pointer approaches, and never take layout width.
 * Defining `::-webkit-scrollbar` (or `scrollbar-width`) opts that scroller out
 * of overlay mode and into the legacy one, so a Mac reader gets a bar that is
 * permanently on screen, never fades, never widens on hover, and shrinks the
 * content by its own width. Scrolling stops behaving the way every other app
 * on their machine behaves — which is why the site felt broken on a Mac and
 * fine everywhere else.
 *
 * WHY FEATURE DETECTION RATHER THAN "IS IT A MAC"
 *
 * Overlay scrollbars are not a macOS property, they are a setting. Windows 11
 * has them, GNOME has them, every touch device has them, and a Mac with
 * "Show scroll bars: Always" does not. Sniffing the platform would be wrong in
 * all four directions. Measuring the actual scrollbar answers the only question
 * that matters: does a scrollbar on this machine consume layout width?
 */

const CLASS = "classic-scrollbars";

/**
 * True when a scrollbar on this machine takes layout width, i.e. the OS is
 * drawing classic scrollbars rather than overlay ones.
 */
export function hasClassicScrollbars() {
  if (typeof document === "undefined" || !document.body) return false;

  const probe = document.createElement("div");
  /* Deliberately not `display: none` — a hidden element has no layout, so it
     would report 0 for both and every machine would look like overlay. */
  probe.style.cssText = "position:absolute;top:-9999px;visibility:hidden;"
    + "overflow:scroll;width:100px;height:100px";
  document.body.appendChild(probe);
  const width = probe.offsetWidth - probe.clientWidth;
  probe.remove();

  return width > 0;
}

/**
 * Add `html.classic-scrollbars` when the custom scrollbar is safe to draw.
 *
 * Called once from the boot sequence, before first paint, so the scrollbar
 * never renders one way and then swaps. It costs a single forced layout of one
 * detached 100px box.
 */
export function applyScrollbarMode() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(CLASS, hasClassicScrollbars());
}
