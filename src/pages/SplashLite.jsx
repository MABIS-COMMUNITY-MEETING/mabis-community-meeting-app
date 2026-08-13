import { ArrowUpRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { isHackerMode } from "@/lib/hacker";

const LOGO = "/images/mabis-logo-128.webp";

function hasStoredSession() {
  try {
    return Boolean(localStorage.getItem("base44_access_token") || localStorage.getItem("token")) || isHackerMode();
  } catch {
    return false;
  }
}

/** Static editorial landing page for constrained and offline connections. */
export default function SplashLite() {
  const navigate = useNavigate();
  const hasSession = hasStoredSession();

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-ink px-4 pb-16 pt-20 text-bone sm:px-8">
      <div className="grid-bg absolute inset-0 opacity-20" />
      <div className="pointer-events-none absolute inset-5 corner-bracket sm:inset-8" />

      <header className="absolute inset-x-4 top-4 z-10 flex items-center justify-between sm:inset-x-8 sm:top-5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center border border-bone/30">
            <img src={LOGO} alt="MABIS" width="20" height="20" decoding="async" fetchPriority="high" className="h-5 w-5 object-contain" />
          </span>
          <span className="tech-label text-bone/60">MABIS COMMUNITY MEETING</span>
        </div>
        <span className="hidden tech-label text-bone/45 sm:block">DATA-SAVER EDITION</span>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-9rem)] max-w-6xl flex-col justify-center">
        <div className="mb-5 flex items-center gap-3 tech-label text-primary">
          <span className="block h-px w-8 bg-primary" /> 01 — SECONDARY COMMUNITY
        </div>

        <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[28vw] font-thin leading-none tracking-ultra text-bone/[0.035]">
          MABIS
        </p>

        <h1 className="relative font-display text-[clamp(3rem,14vw,10.5rem)] font-extralight leading-[0.86] tracking-ultra">
          <span className="block">COMMUNITY</span>
          <span className="mt-2 block text-stroke-bone">MEETING</span>
        </h1>

        <div className="my-7 h-px w-32 bg-bone/35 sm:my-10 sm:w-40" />
        <p className="max-w-md text-sm leading-relaxed text-bone/65 sm:text-base">
          A weekly ritual of voice, presence, and shared decision, recorded and remembered by the secondary community.
        </p>

        <button
          type="button"
          onClick={() => navigate(hasStoredSession() ? "/home" : "/login")}
          className="liquid-btn liquid-ink mt-8 flex w-full max-w-sm items-center justify-between border border-bone/40 bg-bone/5 px-5 py-4 text-bone sm:w-auto sm:px-8"
        >
          <span className="tech-label">N° 02</span>
          <span className="font-display text-lg">{hasSession ? "ENTER START" : "ENTER LOG IN"}</span>
          <ArrowUpRight className="h-5 w-5" />
        </button>
      </main>

      <footer className="absolute inset-x-0 bottom-0 flex items-center overflow-hidden border-t border-bone/15 bg-ink px-4 py-3 tech-label text-bone/50">
        <span className="whitespace-nowrap">MABIS BANGKOK</span>
        <Plus className="mx-4 h-3 w-3 shrink-0 text-primary" />
        <span className="whitespace-nowrap">FRIDAY WEEKLY</span>
        <Plus className="mx-4 h-3 w-3 shrink-0 text-primary" />
        <span className="whitespace-nowrap">LOW-BANDWIDTH MODE</span>
      </footer>
    </div>
  );
}
