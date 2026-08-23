import { Dialog as KDialog } from "@kobalte/core/dialog";
import { createEffect, createSignal, on, onCleanup } from "solid-js";
import { Dialog, DialogOverlay, DialogPortal } from "~/components/ui/dialog";
import { JapaneseText } from "~/components/primitives";
import { useAuth } from "~/lib/AuthContext";
import {
  HOME_LAYOUTS,
  HOME_LAYOUT_STORAGE_KEY,
  setHomeLayout,
} from "@/lib/layout-preference";
import {
  arePrefsReady,
  PREFS_READY_EVENT,
} from "~/lib/prefs-ready";

function hasExplicitStyleChoice() {
  try {
    return HOME_LAYOUTS.includes(localStorage.getItem(HOME_LAYOUT_STORAGE_KEY));
  } catch {
    return false;
  }
}

const STYLE_CHOICES = [
  {
    key: "simple",
    number: "01",
    label: "Summer style",
    jaLabel: "サマースタイル",
    description: "Simple and familiar — straightforward cards, less visual movement, and the original MABIS layout.",
    jaDescription: "シンプルで親しみやすい、わかりやすいカード中心のMABIS本来のレイアウトです。画面の動きも控えめです。",
  },
  {
    key: "boss",
    number: "02",
    label: "Boss style",
    jaLabel: "ボススタイル",
    description: "Modern and editorial — a bold masthead, numbered sections, and more visual movement.",
    jaDescription: "モダンで雑誌のような、大きな見出しと番号付きセクションを使った、動きのあるレイアウトです。",
  },
];

export default function StyleWelcomeDialog() {
  const auth = useAuth();
  const [prefsReady, setPrefsReady] = createSignal(false);
  const [open, setOpen] = createSignal(false);

  createEffect(on(() => auth.user()?.id, (userId) => {
    setOpen(false);
    setPrefsReady(arePrefsReady(userId));
    if (!userId) return;

    const onPrefsReady = (event) => {
      if (event.detail?.userId === userId) setPrefsReady(true);
    };
    window.addEventListener(PREFS_READY_EVENT, onPrefsReady);
    onCleanup(() => window.removeEventListener(PREFS_READY_EVENT, onPrefsReady));
  }));

  createEffect(() => {
    if (!auth.user()?.id || !prefsReady()) return;
    setOpen(!hasExplicitStyleChoice());
  });

  const preloadStyle = (layout) => {
    if (layout === "boss") void import("~/components/home/boss");
  };

  const choose = (layout) => {
    preloadStyle(layout);
    setHomeLayout(layout);
    setOpen(false);
  };

  return (
    <Dialog
      open={open()}
      onOpenChange={(nextOpen) => {
        // A first style is required. Escape and backdrop presses do not turn
        // an absent choice back into the ambiguous implicit Summer default.
        if (nextOpen) setOpen(true);
      }}
    >
      <DialogPortal>
        <DialogOverlay class="z-[120] bg-foreground/55 backdrop-blur-sm" />
        <div class="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center p-4">
          <KDialog.Content class="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
            <header class="border-b border-border bg-background px-5 py-5 sm:px-7 sm:py-6">
              <JapaneseText
                ja="最初の設定"
                as="p"
                layout="inline"
                class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary"
                japaneseClass="ml-1.5 inline font-normal tracking-normal opacity-75"
              >
                First choice
              </JapaneseText>
              <KDialog.Title class="mt-2 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                <JapaneseText
                  ja="MABISのスタイルを選んでください"
                  japaneseClass="mt-1 block text-[0.55em] font-normal tracking-normal opacity-70"
                >
                  Choose your MABIS style
                </JapaneseText>
              </KDialog.Title>
              <KDialog.Description class="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                <JapaneseText
                  ja="最初に使いたい見た目を選んでください。後から設定でいつでも変更できます。"
                  japaneseClass="mt-1 block text-[0.82em] leading-relaxed opacity-75"
                >
                  Pick the look you want to start with. You can change it later in Settings.
                </JapaneseText>
              </KDialog.Description>
            </header>

            <div class="grid gap-3 p-5 sm:grid-cols-2 sm:p-7">
              {STYLE_CHOICES.map((choice) => (
                <button
                  type="button"
                  onPointerEnter={() => preloadStyle(choice.key)}
                  onFocus={() => preloadStyle(choice.key)}
                  onPointerDown={() => preloadStyle(choice.key)}
                  onClick={() => choose(choice.key)}
                  class="group min-h-44 border border-border bg-background p-5 text-left text-foreground transition-colors hover:border-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:min-h-52"
                >
                  <span class="block text-[10px] font-bold tabular-nums tracking-[0.18em] text-primary">
                    N° {choice.number}
                  </span>
                  <JapaneseText
                    ja={choice.jaLabel}
                    as="span"
                    class="mt-5 block font-display text-xl font-bold"
                    japaneseClass="mt-1 block text-[0.65em] font-normal tracking-normal opacity-70"
                  >
                    {choice.label}
                  </JapaneseText>
                  <JapaneseText
                    ja={choice.jaDescription}
                    as="span"
                    class="mt-3 block text-sm leading-relaxed text-muted-foreground"
                    japaneseClass="mt-1.5 block text-[0.78em] leading-relaxed opacity-75"
                  >
                    {choice.description}
                  </JapaneseText>
                  <JapaneseText
                    ja="このスタイルを選ぶ"
                    as="span"
                    layout="inline"
                    class="mt-5 inline-block border-b border-primary pb-0.5 text-xs font-bold text-primary"
                    japaneseClass="ml-1.5 inline font-normal opacity-75"
                  >
                    Choose this style
                  </JapaneseText>
                </button>
              ))}
            </div>
          </KDialog.Content>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
