import { lazy, Suspense, useEffect, useState } from "react";
import { networkState, NETWORK_EVENT } from "@/lib/network-policy";

const PrideAmbience = lazy(() => import("@/components/PrideAmbience"));

function shouldRender() {
  if (typeof document === "undefined") return false;
  return document.body.classList.contains("pride-active") && !networkState().severe;
}

/** Pride animation data is absent from the common bundle and severe networks. */
export default function OptionalPrideAmbience() {
  const [enabled, setEnabled] = useState(shouldRender);

  useEffect(() => {
    const update = () => setEnabled(shouldRender());
    window.addEventListener("themeChanged", update);
    window.addEventListener(NETWORK_EVENT, update);
    return () => {
      window.removeEventListener("themeChanged", update);
      window.removeEventListener(NETWORK_EVENT, update);
    };
  }, []);

  if (!enabled) return null;
  return <Suspense fallback={null}><PrideAmbience /></Suspense>;
}
