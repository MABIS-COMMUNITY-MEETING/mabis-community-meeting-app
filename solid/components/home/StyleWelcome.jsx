import { createSignal, Show, For } from "solid-js";
import { Check } from "lucide-solid";
import { JapaneseText } from "~/components/primitives";
import { hasChosenHomeLayout, setHomeLayout } from "@/lib/layout-preference";

/*
 * First visit: ask which style, once.
 *
 * Shown only while `mabis-home-layout` holds no recognised value — see
 * hasChosenHomeLayout(). Picking either option writes the key, so this never
 * appears again, and the Settings → Page Layout panel remains the way to change
 * your mind later.
 *
 * It is a PROMPT, not a gate. Summer style is already applied underneath (it is
 * the default), so dismissing this leaves a working page rather than a blank
 * one, and someone who ignores it entirely still gets the interface the school
 * has always used. That is why there is a "decide later" escape and why the
 * panel does not trap focus the way a true modal would.
 *
 * Deliberately not a <dialog>: it must not block the page for a reader who
 * simply wants to get on with the meeting.
 */

const CHOICES = [
  {
    key: "simple",
    label: "Summer style",
    ja: "サマースタイル",
    blurb: "Simpler · the interface the school has always used. White cards, one after another, nothing between you and the content.",
    jaBlurb: "よりシンプルです。これまで使ってきた画面で、白いカードが上から順に並びます。",
  },
  {
    key: "boss",
    label: "Boss style",
    ja: "ボススタイル",
    blurb: "More modern · an art-directed front page with a large masthead, numbered sections and scrolling type.",
    jaBlurb: "より現代的です。大きな見出しや番号付きの区切りがある、雑誌のような表示です。",
  },
];

export default function StyleWelcome(props) {
  /* Evaluated once, at mount: whether this reader has ever chosen. A signal
     rather than a plain variable because choosing has to hide the panel, and
     only a signal re-runs the <Show> below. */
  const [show, setShow] = createSignal(!hasChosenHomeLayout());

  const choose = (key) => {
    setHomeLayout(key);
    setShow(false);
    props.onDone?.();
  };

  return (
    <Show when={show()}>
      <div class="mb-6 border border-border bg-card p-4 shadow-sm sm:p-5" role="region" aria-label="Choose a style">
        <JapaneseText
          as="h2"
          ja="表示スタイルを選んでください"
          class="block font-display text-base font-bold text-foreground"
          japaneseClass="mt-0.5 block text-[0.8em] font-normal opacity-70"
        >
          Choose how this site looks
        </JapaneseText>
        <JapaneseText
          as="p"
          ja="どちらも同じ項目が同じ順番で、同じ機能を持ちます。見た目だけが変わります。あとから設定でいつでも変更できます。"
          class="mt-1 block text-xs leading-relaxed text-muted-foreground"
          japaneseClass="mt-1 block text-[0.9em]"
        >
          Both have exactly the same sections and features — only the presentation changes. You can switch any time in Settings.
        </JapaneseText>

        <div class="mt-4 grid gap-px bg-border sm:grid-cols-2">
          <For each={CHOICES}>
            {(choice) => (
              <button
                type="button"
                onClick={() => choose(choice.key)}
                class="min-h-24 bg-background p-3 text-left transition-colors hover:bg-muted"
              >
                <span class="flex items-center gap-1.5">
                  <JapaneseText ja={choice.ja} class="block text-sm font-bold text-foreground" japaneseClass="text-[0.78em]">
                    {choice.label}
                  </JapaneseText>
                  <Show when={choice.key === "simple"}>
                    <span class="text-[10px] font-bold uppercase tracking-wide text-primary">Default</span>
                  </Show>
                </span>
                <JapaneseText
                  ja={choice.jaBlurb}
                  class="mt-1 block text-xs leading-relaxed text-muted-foreground"
                  japaneseClass="mt-0.5 block text-[0.9em]"
                >
                  {choice.blurb}
                </JapaneseText>
              </button>
            )}
          </For>
        </div>

        <button
          type="button"
          onClick={() => choose("simple")}
          class="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <Check class="h-3.5 w-3.5" />
          <JapaneseText ja="今はこのままで" layout="inline" japaneseClass="ml-1 text-[0.85em]">
            Keep the simpler one
          </JapaneseText>
        </button>
      </div>
    </Show>
  );
}
