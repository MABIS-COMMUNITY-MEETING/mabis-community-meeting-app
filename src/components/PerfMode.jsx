import { useEffect } from "react";
import { isLinux } from "@/lib/perf";

/** Adds a `perf-lite` class on Linux so CSS can shed GPU-heavy effects. */
export default function PerfMode() {
  useEffect(() => {
    if (isLinux) document.body.classList.add("perf-lite");
    return () => document.body.classList.remove("perf-lite");
  }, []);
  return null;
}