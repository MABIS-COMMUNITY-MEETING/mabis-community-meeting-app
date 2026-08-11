import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

const NAV = [
  { label: "Home", to: "/home", n: "01" },
  { label: "Meeting History", to: "/history", n: "02" },
  { label: "Announcements", to: "/history/announcements", n: "03" },
  { label: "News", to: "/history/news", n: "04" },
  { label: "Feedback Inbox", to: "/feedback", n: "05" },
];

/**
 * Minimal fixed header with a full-screen animated overlay menu.
 * Shows the brand mark, a live clock, and a menu toggle. The overlay
 * reveals large menu typography that enters sequentially.
 */
export default function SiteHeader({ rightSlot }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const go = (to) => { setOpen(false); navigate(to); };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between px-5 sm:px-8 py-4">
          <Link to="/" data-cursor="HOME" className="group flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden border border-foreground/30 bg-bone">
              <img src={LOGO} alt="MABIS" className="h-6 w-6 object-contain transition-transform duration-500 group-hover:scale-110" />
            </span>
            <span className="hidden sm:flex flex-col leading-none">
              <span className="tech-label text-foreground">MABIS</span>
              <span className="tech-label text-muted-foreground">COMMUNITY ／ MEETING</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden md:inline tech-label text-muted-foreground">{time}</span>
            {rightSlot}
            <button
              onClick={() => setOpen(v => !v)}
              data-cursor={open ? "CLOSE" : "MENU"}
              className="relative flex h-9 items-center gap-2 border border-foreground/30 bg-bone px-3 tech-label text-foreground hover:bg-foreground hover:text-bone transition-colors"
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
        </div>
        <div className="h-px w-full bg-foreground/12" />
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 bg-ink text-bone"
          >
            <div className="grid-bg absolute inset-0 opacity-40" />
            <div className="relative flex h-full flex-col justify-between px-5 sm:px-8 pt-28 pb-8">
              <div className="flex items-start justify-between">
                <span className="tech-label text-bone/50">INDEX ／ NAVIGATION</span>
                <span className="tech-label vert-text text-bone/50 sm:hidden">MENU</span>
              </div>

              <nav className="flex flex-col gap-1 sm:gap-2">
                {NAV.map((item, i) => {
                  const active = location.pathname === item.to;
                  return (
                    <motion.button
                      key={item.to}
                      onClick={() => go(item.to)}
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      transition={{ delay: 0.08 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      data-cursor="OPEN"
                      className="group flex items-baseline gap-4 sm:gap-8 text-left"
                    >
                      <span className="tech-label text-bone/40 pt-3 sm:pt-4">{item.n}</span>
                      <span className="flex-1 flex items-center gap-3 border-b border-bone/15 py-2 sm:py-3">
                        <span className="text-5xl sm:text-7xl md:text-8xl font-display font-light tracking-ultra leading-none transition-all duration-300 group-hover:tracking-tight group-hover:text-secondary">
                          {item.label}
                        </span>
                        <ArrowUpRight className="ml-auto h-6 w-6 sm:h-10 sm:w-10 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                      </span>
                    </motion.button>
                  );
                })}
              </nav>

              <div className="flex items-end justify-between">
                <div className="tech-label text-bone/40">
                  SECONDARY COMMUNITY<br />MEETING APP ／ 2026
                </div>
                <div className="tech-label text-bone/40 text-right">
                  ／ EST. MABIS<br />BANGKOK ／ TH
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}