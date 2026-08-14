import React, { useEffect } from "react";
import { X } from "lucide-react";
import JapaneseText from "@/components/JapaneseText";

const SECTIONS = [
  {
    title: "Start a meeting",
    jaTitle: "ミーティングを始める",
    detail: "Use Meeting Mode at the top of the Home page. The large start button opens the meeting tools.",
    jaDetail: "ホーム上部の「ミーティング開始」を使います。大きな開始ボタンで必要なツールが開きます。",
  },
  {
    title: "Add a discussion topic",
    jaTitle: "話し合いのテーマを追加する",
    detail: "Go to Discussion, choose Add Topic, write the title and notes, then choose Save.",
    jaDetail: "「話し合い」で「テーマを追加」を選び、題名とメモを書いて保存します。",
  },
  {
    title: "Assign a job",
    jaTitle: "係を決める",
    detail: "Go to Jobs, choose the job first, spin the wheel, then confirm the result. Re-spin is always available.",
    jaDetail: "「係」で仕事を先に選び、ルーレットを回して結果を確認します。何度でも回し直せます。",
  },
  {
    title: "Find dates and daily information",
    jaTitle: "日付と一日の情報を見る",
    detail: "Calendar shows important dates. Schedule shows the day plan. Lunch Menu and Lost and Found are farther down the same page.",
    jaDetail: "大切な日は「カレンダー」、一日の流れは「スケジュール」で確認できます。ランチと落とし物も同じページにあります。",
  },
  {
    title: "Change how the site looks",
    jaTitle: "サイトの見た目を変える",
    detail: "Use Theme for colors. Use Settings for fonts, animation, sound, cursor, and Japanese text.",
    jaDetail: "色は「テーマ」、文字・アニメーション・音・カーソル・日本語表示は「設定」で変えられます。",
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
            <JapaneseText ja="ヘルプ" className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground" japaneseClassName="text-[10px] tracking-normal">Help</JapaneseText>
            <JapaneseText ja="このサイトの使い方" as="h2" id="quick-start-title" className="mt-1 font-display text-2xl font-bold">How to use this site</JapaneseText>
            <JapaneseText ja="大切なものはすべてホームにあります。下へスクロールすると各項目に進めます。" as="p" className="mt-1 text-sm text-muted-foreground">Everything important is on the Home page. Scroll down to move through each area.</JapaneseText>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center border border-border bg-background text-foreground hover:bg-muted" aria-label="Close help">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-px bg-border sm:grid-cols-2">
          {SECTIONS.map((section, index) => (
            <article key={section.title} className="bg-card p-4 sm:p-5">
              <p className="text-[10px] font-bold tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</p>
              <JapaneseText ja={section.jaTitle} as="h3" className="mt-2 text-base font-bold">{section.title}</JapaneseText>
              <JapaneseText ja={section.jaDetail} as="p" className="mt-1.5 text-sm leading-relaxed text-muted-foreground" japaneseClassName="mt-1 block text-[0.9em]">{section.detail}</JapaneseText>
            </article>
          ))}
        </div>

        <footer className="border-t border-border bg-muted/40 px-4 py-4 sm:px-6">
          <JapaneseText ja="ボタンには操作内容が書かれています。迷ったときはもう一度「ヘルプ」を選ぶか、ページ下部のMABISアシスタントに質問してください。" as="p" className="text-sm" japaneseClassName="mt-1 block text-[0.9em]"><strong>Good to know:</strong> Buttons say exactly what they do. If you are unsure, choose Help again or ask the MABIS assistant at the bottom of the page.</JapaneseText>
          <button type="button" onClick={onClose} className="mt-4 min-h-11 w-full bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90 sm:w-auto">
            <JapaneseText ja="わかりました" layout="inline">I’m ready</JapaneseText>
          </button>
        </footer>
      </section>
    </div>
  );
}
