import { createEffect, on, onMount, onCleanup } from "solid-js";
import { useLocation } from "@solidjs/router";
import { releaseAllScrollLocks } from "@/lib/scroll-lock";

const getHashId = (hash) => {
  const rawId = hash.slice(1);
  try {
    return decodeURIComponent(rawId);
  } catch {
    return rawId;
  }
};

/*
 * Reset scroll on navigation — port of src/components/ScrollToTop.jsx.
 *
 * React read `useNavigationType() === "POP"` to leave back/forward navigation
 * at its restored position. @solidjs/router exposes no equivalent, so a
 * popstate listener sets the flag instead: popstate fires immediately before
 * the router updates location, so by the time this effect runs the flag is
 * already correct for that navigation. It is cleared afterwards so the next
 * push-navigation scrolls normally.
 */
export default function ScrollToTop() {
  const location = useLocation();
  let cameFromHistory = false;

  /*
   * Safety valve for background scroll.
   *
   * Nothing that locks scroll survives a route change — every locker is a
   * modal, an overlay or a fullscreen editor. So a lock still standing here is
   * a leak, and the cost of the two failure modes is wildly asymmetric: a
   * dialog briefly scrolling behind itself is a blemish, while a reader who
   * cannot scroll the site at all has no way to use it and nothing on screen
   * to explain why. Release unconditionally.
   */
  createEffect(on(() => location.pathname, () => releaseAllScrollLocks()));

  onMount(() => {
    const onPop = () => { cameFromHistory = true; };
    window.addEventListener("popstate", onPop);
    onCleanup(() => window.removeEventListener("popstate", onPop));
  });

  createEffect(on([() => location.pathname, () => location.hash], ([, hash]) => {
    if (cameFromHistory) {
      cameFromHistory = false;
      return;
    }

    if (hash) {
      const id = getHashId(hash);
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 50);
      onCleanup(() => window.clearTimeout(timer));
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }));

  return null;
}
