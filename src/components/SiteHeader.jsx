import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import SoundToggle from "@/components/SoundToggle";
import Glass from "@/components/glass/Glass";
import { playHover, playMenuOpen, playMenuClose } from "@/lib/sound";
import { preloadRoute } from "@/lib/routeLoaders";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

const NAV = [
  { label: "Home", to: "/home", n: "01" },
  { label: "Meeting History", to: "/history", n: "02" },
  { label: "Announcements", to: "/history/announcements", n: "03" },
  { label: "News", to: "/history/news", n: "04" },
  { label: "Feedback Inbox", to: "/feedback", n: "05" },
];

const EASE = [0.16, 1, 0.3, 1];

/**
 * Bespoke site header: persistent brand + live clock + a full-screen nav
 * overlay whose giant items assemble sequentially with index numbers, an
 * active indicator that morphs between items, and hover duplication.
 */
export default function SiteHeader({ rightSlot }) {
  const [open, setOpen] = useState(false);
  const clockRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // The clock is isolated text; updating it directly avoids reconciling the
    // entire header and its control slot every second.
    const tick = () => {
      if (clockRef.current) clockRef.current.textContent = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to) => { setOpen(false); navigate(to); };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <Glass variant="navigation" tone="light" contentClassName="flex items-center justify-between gap-3 px-3 py-3 sm:px-8 sm:py-4">
          <Link to="/" data-cursor="HOME" className="group flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden border border-foreground/30 bg-background">
              <img src={LOGO} alt="MABIS" className="h-6 w-6 object-contain transition-transform duration-500 group-hover:scale-110" />
            </span>
            <span className="hidden sm:flex flex-col leading-none">
              <span className="tech-label text-foreground">MABIS</span>
              <span className="tech-label text-muted-foreground">COMMUNITY MEETING</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-5">
            <div className="hidden items-center gap-3 sm:flex sm:gap-5">
              <span ref={clockRef} className="hidden md:inline tech-label text-muted-foreground tabular-nums" />
              <SoundToggle />
              {rightSlot}
            </div>
            <button
              onClick={() => setOpen(v => { const next = !v; (next ? playMenuOpen : playMenuClose)(); return next; })}
              data-cursor={open ? "CLOSE" : "MENU"}
              className="relative flex h-9 items-center gap-2 border border-foreground/30 bg-background px-3 tech-label text-foreground hover:bg-foreground hover:text-background transition-colors"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              <span className="relative flex h-3 w-4 flex-col justify-between">
                <motion.span animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} className="block h-px w-full bg-current" />
                <motion.span animate={open ? { opacity: 0 } : { opacity: 1 }} className="block h-px w-full bg-current" />
                <motion.span animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} className="block h-px w-full bg-current" />
              </span>
              <span className="hidden sm:inline">{open ? "CLOSE" : "MENU"}</span>
            </button>
          </div>
        </Glass>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="fixed inset-0 z-40 bg-ink text-bone"
          >
            <div className="grid-bg absolute inset-0 opacity-15" />
            {/* giant vertical background label */}
            <motion.span
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 0.035, y: 0 }} transition={{ duration: 0.65, ease: EASE }}
              className="vert-text pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display font-thin tracking-ultra text-bone leading-none select-none whitespace-nowrap"
              style={{ fontSize: "26vw" }}
            >
              INDEX
            </motion.span>

            <div className="relative flex h-full flex-col gap-7 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-24 sm:justify-between sm:gap-0 sm:px-8 sm:pb-8 sm:pt-28">
              <div className="flex items-start justify-between">
                <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="flex items-center gap-3">
                  <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15, duration: 0.6, ease: EASE }} className="block h-px w-10 bg-secondary origin-left" />
                  <span className="tech-label text-bone/50">SELECTED NAVIGATION</span>
                </motion.div>
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="tech-label vert-text text-bone/50 sm:hidden">MENU</motion.span>
              </div>

              <nav className="mt-1 flex shrink-0 flex-col gap-1 sm:mt-0 sm:gap-2">
                {NAV.map((item, i) => {
                  const active = location.pathname === item.to;
                  // long labels ("Meeting History", "Feedback Inbox") would run
                  // past the rule on narrow phones — scale them down to fit
                  const size = item.label.length > 12
                    ? "text-[clamp(1.45rem,7vw,2.15rem)]"
                    : "text-[clamp(1.7rem,8.5vw,2.5rem)]";
                  return (
                    <motion.button
                      key={item.to}
                      onClick={() => go(item.to)}
                      onPointerEnter={() => preloadRoute(item.to)}
                      onFocus={() => preloadRoute(item.to)}
                      initial={{ y: 60, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 30, opacity: 0 }}
                      transition={{ delay: 0.12 + i * 0.07, duration: 0.55, ease: EASE }}
                      data-cursor="OPEN"
                      onMouseEnter={playHover}
                      className="group relative flex shrink-0 items-baseline gap-3 text-left sm:gap-8"
                    >
                      <span className="w-7 pt-2 tech-label text-bone/40 sm:w-10 sm:pt-4">{item.n}</span>
                      <span className="relative flex-1 flex items-center gap-3 border-b border-bone/15 py-2 sm:py-3 overflow-hidden">
                        {active && (
                          <motion.span layoutId="nav-active" className="absolute left-0 top-0 bottom-0 w-[3px] bg-secondary" />
                        )}
                        <span className="relative block overflow-hidden pb-[0.32em] -mb-[0.32em]">
                          <span className={`block whitespace-nowrap ${size} sm:text-5xl md:text-6xl font-display font-light tracking-[-0.055em] leading-[1.45] transition-transform duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-[125%]`}>
                            {item.label}
                          </span>
                          <span className={`absolute inset-0 block whitespace-nowrap ${size} sm:text-5xl md:text-6xl font-display font-light tracking-[-0.055em] leading-[1.45] text-secondary translate-y-[125%] transition-transform duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)] group-hover:translate-y-0`}>
                            {item.label}
                          </span>
                        </span>
                        <ArrowUpRight className="ml-auto h-5 w-5 sm:h-7 sm:w-7 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                      </span>
                    </motion.button>
                  );
                })}
              </nav>

              <div className="border-t border-bone/15 pt-4 sm:hidden">
                <p className="tech-label text-bone/45">QUICK CONTROLS</p>
                <div className="mobile-nav-controls mt-3 flex flex-wrap items-center gap-2">
                  <SoundToggle />
                  {rightSlot}
                </div>
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-auto flex items-end justify-between pt-2 sm:mt-0 sm:pt-0">
                <div className="tech-label text-bone/40">
                  SECONDARY COMMUNITY<br />MEETING APP 2026
                </div>
                <div className="tech-label text-bone/40 text-right">
                  EST. MABIS<br />BANGKOK TH
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}