import React, { useEffect } from "react";
import { X } from "lucide-react";

const SECTIONS = [
  {
    title: "Start a meeting",
    detail: "Use Meeting Mode at the top of the Home page. The large start button opens the meeting tools.",
  },
  {
    title: "Add a discussion topic",
    detail: "Go to Discussion, choose Add Topic, write the title and notes, then choose Save.",
  },
  {
    title: "Assign a job",
    detail: "Go to Jobs, choose the job first, spin the wheel, then confirm the result. Re-spin is always available.",
  },
  {
    title: "Find dates and daily information",
    detail: "Calendar shows important dates. Schedule shows the day plan. Lunch Menu and Lost and Found are farther down the same page.",
  },
  {
    title: "Change how the site looks",
    detail: "Use Theme for colors. Use Settings for fonts, animation, sound, and cursor preferences.",
  },
];

export default function QuickStartGuide({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10030] flex items-center justify-center bg-foreground/45 p-3 sm:p-6" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-start-title"
        className="max-h-[min(760px,calc(100dvh-24px))] w-full max-w-2xl overflow-y-auto border border-border bg-card text-card-foreground shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Help</p>
            <h2 id="quick-start-title" className="mt-1 font-display text-2xl font-bold">How to use this site</h2>
            <p className="mt-1 text-sm text-muted-foreground">Everything important is on the Home page. Scroll down to move through each area.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center border border-border bg-background text-foreground hover:bg-muted" aria-label="Close help">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-px bg-border sm:grid-cols-2">
          {SECTIONS.map((section, index) => (
            <article key={section.title} className="bg-card p-4 sm:p-5">
              <p className="text-[10px] font-bold tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</p>
              <h3 className="mt-2 text-base font-bold">{section.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{section.detail}</p>
            </article>
          ))}
        </div>

        <footer className="border-t border-border bg-muted/40 px-4 py-4 sm:px-6">
          <p className="text-sm"><strong>Good to know:</strong> Buttons say exactly what they do. If you are unsure, choose Help again or ask the MABIS assistant at the bottom of the page.</p>
          <button type="button" onClick={onClose} className="mt-4 min-h-11 w-full bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 sm:w-auto">
            I’m ready
          </button>
        </footer>
      </section>
    </div>
  );
}
