import { A, useNavigate } from "@solidjs/router";
import { ArrowLeft, Plus } from "lucide-solid";
import { JapaneseText } from "~/components/primitives";

/*
 * Shared page chrome — PageNav, PageFooter and OpenMoji.
 *
 * Grouped in one module because all three are small, always used together on
 * the archive pages, and splitting them into three files would cost three
 * chunk lookups for ~120 lines total.
 */

export const OPENMOJI_VERSION = "17.0.0";

function normalizeHexcode(hexcode) {
  const normalized = String(hexcode || "")
    .toUpperCase()
    .replace(/^U\+/, "")
    .replace(/[^0-9A-F-]/g, "");
  if (!normalized) throw new Error("OpenMoji requires a valid Unicode hexcode.");
  return normalized;
}

export function openMojiAssetUrl(hexcode) {
  return `/openmoji/${OPENMOJI_VERSION}/${normalizeHexcode(hexcode)}.svg`;
}

/**
 * Pinned OpenMoji colour SVG. The design contract forbids platform-native
 * emoji glyphs anywhere in app-authored UI, and pins the asset version so a
 * system font update cannot silently restyle them.
 */
export function OpenMoji(props) {
  return (
    <img
      src={openMojiAssetUrl(props.hexcode)}
      alt={props.label || ""}
      aria-hidden={props.label ? undefined : true}
      width="24"
      height="24"
      loading={props.loading || "lazy"}
      decoding="async"
      draggable="false"
      class={`openmoji inline-block shrink-0 align-[-0.125em] ${props.class || ""}`}
    />
  );
}

/** Shared archive-page header: Back (with Home fallback) + centre label + Home. */
export function PageNav(props) {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/home");
  };

  return (
    <header class="fixed top-0 left-0 right-0 z-50 bg-bone/90 backdrop-blur-sm">
      <div class="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4">
        <button type="button" onClick={goBack} data-cursor="BACK" class="group flex items-center gap-3 py-2 -my-2">
          <ArrowLeft class="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span class="tech-label text-muted-foreground"> BACK</span>
        </button>
        {props.label && <span class="hidden sm:block tech-label text-primary">{props.label}</span>}
        <A href="/home" data-cursor="HOME" class="tech-label text-muted-foreground ul-grow py-2 -my-2">HOME</A>
      </div>
      <div class="h-px w-full bg-foreground/12" />
    </header>
  );
}

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";
export const APP_VERSION = "v6.9.9";

export function PageFooter() {
  return (
    <>
      <div class="mt-10 border-t border-foreground/15 pt-8">
        <div class="flex flex-col items-center gap-5 text-center">
          <div class="relative flex h-16 w-16 items-center justify-center border border-foreground/20 bg-card overflow-hidden">
            <Plus class="absolute -top-1 -left-1 h-3 w-3 text-foreground/30" />
            <img src={MABIS_LOGO} alt="MABIS" class="h-11 w-11 object-contain" />
          </div>
          <div class="tech-label text-muted-foreground"> COLOPHON</div>
          <JapaneseText
            as="h2"
            ja="セカンダリー・コミュニティ・ミーティング・アプリ"
            class="block max-w-md font-display font-light tracking-ultra text-2xl sm:text-3xl"
            japaneseClass="mt-1 block text-[0.4em] tracking-normal opacity-70"
          >
            Secondary Community<br />Meeting App
          </JapaneseText>
          <div class="flex items-center gap-3 tech-label text-muted-foreground">
            <span>MABIS</span>
            <Plus class="h-3 w-3 text-primary/60" />
            <span>BANGKOK TH</span>
            <Plus class="h-3 w-3 text-primary/60" />
            <span>2026</span>
          </div>
        </div>
      </div>
      <div class="mt-6 mb-8 flex justify-center">
        <div class="inline-flex items-center border border-foreground/20 px-4 py-1.5 tech-label text-muted-foreground">
          VERSION {APP_VERSION}
        </div>
      </div>
    </>
  );
}
