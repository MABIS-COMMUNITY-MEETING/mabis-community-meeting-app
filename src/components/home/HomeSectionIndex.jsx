import React from "react";

const SECTIONS = [
  ["01", "Start meeting"],
  ["02", "Announcements"],
  ["03", "Discussion topics"],
  ["04", "Jobs"],
  ["05", "Calendar"],
  ["06", "Daily schedule"],
  ["07", "Lost and found"],
  ["08", "Lunch menu"],
  ["09", "News"],
  ["10", "People"],
];

export default function HomeSectionIndex() {
  return (
    <nav aria-label="Jump to a Home section" className="border-y border-border">
      <div className="flex items-end justify-between gap-4 border-b border-border py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Page guide</p>
          <h2 className="mt-1 font-display text-xl font-medium tracking-tight text-foreground">Choose where to go</h2>
        </div>
        <p className="hidden max-w-sm text-right text-xs leading-relaxed text-muted-foreground sm:block">All sections are on this page. Choose one to jump there, or keep scrolling in number order.</p>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
        {SECTIONS.map(([number, label]) => (
          <a
            key={number}
            href={`#sec-${number}`}
            className="group flex min-h-12 items-center gap-3 bg-background px-3 py-2.5 text-left text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <span className="text-[10px] font-bold tabular-nums text-muted-foreground group-hover:text-primary">{number}</span>
            <span className="text-sm font-semibold">{label}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
