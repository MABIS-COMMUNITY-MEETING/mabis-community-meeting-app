import React from "react";
import JapaneseText from "@/components/JapaneseText";

const SECTIONS = [
  ["01", "Start meeting", "ミーティングを始める"],
  ["02", "Announcements", "お知らせ"],
  ["03", "Discussion topics", "話し合いのテーマ"],
  ["04", "Jobs", "係"],
  ["05", "Calendar", "カレンダー"],
  ["06", "Daily schedule", "一日の予定"],
  ["07", "Lost and found", "落とし物"],
  ["08", "Lunch menu", "ランチメニュー"],
  ["09", "News", "ニュース"],
  ["10", "People", "メンバー"],
];

export default function HomeSectionIndex() {
  return (
    <nav aria-label="Jump to a Home section" className="border-y border-border">
      <div className="flex items-end justify-between gap-4 border-b border-border py-3">
        <div>
          <JapaneseText ja="ページ案内" className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground" japaneseClassName="text-[10px] tracking-normal">Page guide</JapaneseText>
          <JapaneseText ja="行きたい場所を選ぶ" as="h2" className="mt-1 font-display text-xl font-medium tracking-tight text-foreground">Choose where to go</JapaneseText>
        </div>
        <JapaneseText ja="すべての項目はこのページにあります。選んで移動するか、番号順にスクロールしてください。" as="p" className="hidden max-w-sm text-right text-xs leading-relaxed text-muted-foreground sm:block" japaneseClassName="mt-1 block text-[0.9em]">All sections are on this page. Choose one to jump there, or keep scrolling in number order.</JapaneseText>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
        {SECTIONS.map(([number, label, jaLabel]) => (
          <a
            key={number}
            href={`#sec-${number}`}
            className="group flex min-h-12 items-center gap-3 bg-background px-3 py-2.5 text-left text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          >
            <span className="text-[10px] font-bold tabular-nums text-muted-foreground group-hover:text-primary">{number}</span>
            <JapaneseText ja={jaLabel} className="text-sm font-semibold" japaneseClassName="text-[0.78em]">{label}</JapaneseText>
          </a>
        ))}
      </div>
    </nav>
  );
}
