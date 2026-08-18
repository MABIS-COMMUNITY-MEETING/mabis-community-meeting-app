import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { ArrowUpRight, Plus, ArrowDown } from "lucide-solid";
import { subscribe } from "@/lib/physics/scheduler";
import { integrateSpring } from "@/lib/physics/math";
import { springFromFramer, finePointer } from "~/lib/motion";
import { useAuth } from "~/lib/AuthContext";
import {
  JapaneseText,
  KineticBackground,
  Marquee,
  MagneticButton,
  SplitChars,
} from "~/components/primitives";
import { useHomeLayout } from "~/lib/prefs";
import SummerSplash from "~/components/home/SummerSplash";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";
const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Splash — SolidJS port of src/pages/Splash.jsx.
 *
 * Every class name, delay, duration and easing curve is carried over
 * unchanged; the markup is identical apart from className→class. What changed
 * is only HOW the motion is driven:
 *
 *   framer <motion.x initial/animate/transition>  →  CSS transition + a single
 *       mount signal, with the original delay/duration/ease preserved.
 *   framer useSpring/useTransform parallax        →  the app's own analytic
 *       spring on the shared physics scheduler (see lib/motion.js for the
 *       stiffness/damping → ω/ζ conversion).
 *
 * Net effect: the same animation, run by the compositor rather than a JS
 * animation library, and the scheduler sleeps once motion settles.
 */

/** One-shot entrance: mirrors framer's initial → animate with a delay. */
function Enter(props) {
  const [shown, setShown] = createSignal(false);
  onMount(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  });

  // Only write `transform` when this element actually animates one.
  //
  // An inline transform beats a Tailwind transform utility, so setting it
  // unconditionally would silently cancel classes like -translate-x-1/2. That
  // is exactly how framer behaves too (it writes style.transform only for
  // transform keys), so matching it is what keeps the port 1:1 — the giant
  // cropped "MABIS" word animates opacity alone and must keep its Tailwind
  // centering transform.
  const animatesTransform = () =>
    props.fromX !== undefined || props.fromY !== undefined || props.fromScaleX !== undefined;

  const style = () => {
    const d = props.duration ?? 0.6;
    const delay = props.delay ?? 0;
    const ease = props.ease ?? EASE_CSS;
    const base = {
      opacity: shown() ? (props.toOpacity ?? 1) : (props.fromOpacity ?? 0),
      transition: animatesTransform()
        ? `opacity ${d}s ${ease} ${delay}s, transform ${d}s ${ease} ${delay}s`
        : `opacity ${d}s ${ease} ${delay}s`,
      ...(props.extraStyle || {}),
    };

    if (!animatesTransform()) return base;

    return {
      ...base,
      transform: shown()
        ? "translate3d(0,0,0) scaleX(1)"
        : `translate3d(${props.fromX ?? 0}px, ${props.fromY ?? 0}px, 0) scaleX(${props.fromScaleX ?? 1})`,
    };
  };

  return <div class={props.class} style={style()}>{props.children}</div>;
}

function EditorialSplash() {
  let bgRef;
  let titleRef;

  // Real auth state now that AuthContext is ported. isAuthenticated() can
  // read false for a moment on first paint if the cookie probe / offline
  // recovery is still resolving (auth.isLoadingAuth() true) — that only
  // matters if the user clicks Enter in that exact window, and even then
  // TransitionedLogin (App.jsx) catches it: an already-authenticated user who
  // lands on /login gets bounced straight to /home once auth resolves, so
  // this can never strand someone on the login form.
  const auth = useAuth();
  const isAuthenticated = () => auth.isAuthenticated();
  const navigate = useNavigate();

  onMount(() => {
    if (!finePointer()) return;

    const { omega, zeta } = springFromFramer(50, 20, 1);
    const sx = { x: 0, v: 0 };
    const sy = { x: 0, v: 0 };
    let tx = 0;
    let ty = 0;

    const onMove = (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);

    const unsubscribe = subscribe({
      step: (dt) => {
        integrateSpring(sx, tx, omega, zeta, dt);
        integrateSpring(sy, ty, omega, zeta, dt);
      },
      render: () => {
        // Same multipliers as the framer useTransform calls.
        if (titleRef) titleRef.style.transform = `translate3d(${(sx.x * 24).toFixed(2)}px, ${(sy.x * 14).toFixed(2)}px, 0)`;
        if (bgRef) bgRef.style.transform = `translate3d(${(sx.x * -28).toFixed(2)}px, ${(sy.x * -18).toFixed(2)}px, 0)`;
      },
      settled: () =>
        Math.abs(sx.x - tx) < 0.001 && Math.abs(sy.x - ty) < 0.001 &&
        Math.abs(sx.v) < 0.001 && Math.abs(sy.v) < 0.001,
    });

    onCleanup(() => {
      window.removeEventListener("mousemove", onMove);
      unsubscribe();
    });
  });

  const enter = () => {
    // Client-side navigation, not window.location.href: a hard reload leaves
    // the whole already-running app behind, so nothing of ours — including
    // LoadingScreen — gets to render during the gap; the browser does its own
    // blank native transition instead, then the ENTIRE boot sequence pays
    // again from zero (re-fetch index.html, re-parse/execute the whole JS
    // bundle, redo theme/font application, redo the auth check network call
    // that has, in the overwhelmingly common case, already resolved by the
    // time this click happens). Routing within the mounted Router instead
    // means Protected's LoadingScreen fallback mounts instantly, and none of
    // that boot cost gets paid twice.
    navigate(isAuthenticated() ? "/home" : "/login");
  };

  const marqueeRun = () => (
    <For each={Array.from({ length: 6 })}>
      {() => (
        <span class="flex items-center tech-label">
          <span class="px-6">SECONDARY COMMUNITY MEETING</span>
          <Plus class="h-3 w-3 text-primary/70" />
          <span class="px-6">FRIDAY WEEKLY</span>
          <Plus class="h-3 w-3 text-primary/70" />
          <span class="px-6">MABIS BANGKOK</span>
          <Plus class="h-3 w-3 text-primary/70" />
        </span>
      )}
    </For>
  );

  return (
    <div class="relative min-h-screen w-full overflow-hidden bg-ink text-bone">
      <div ref={bgRef} class="absolute inset-0">
        <KineticBackground variant="ink" />
      </div>

      {/* top bar */}
      <Enter
        delay={0.2}
        duration={0.6}
        fromY={-20}
        class="absolute left-0 right-0 top-0 z-30 flex items-center justify-between px-4 py-4 sm:px-8 sm:py-5"
      >
        <div class="flex items-center gap-3">
          <span class="flex h-8 w-8 items-center justify-center border border-bone/30">
            <img src={LOGO} alt="MABIS" class="h-5 w-5 object-contain" />
          </span>
          <span class="tech-label text-bone/60">
            <span class="sm:hidden">MABIS</span>
            <span class="hidden sm:inline">MABIS COMMUNITY MEETING</span>
          </span>
        </div>
        <span class="tech-label hidden sm:block text-bone/50">EST. BANGKOK TH</span>
      </Enter>

      {/* vertical side labels */}
      <Enter
        delay={1}
        duration={0.8}
        fromY={20}
        class="vert-text tech-label absolute left-5 sm:left-8 top-1/2 -translate-y-1/2 text-bone/45 z-20 hidden md:block"
      >
        SECONDARY COMMUNITY
      </Enter>
      <Enter
        delay={1.1}
        duration={0.8}
        fromY={-20}
        class="vert-text tech-label absolute right-5 sm:right-8 top-1/2 -translate-y-1/2 text-bone/45 z-20 hidden md:block"
      >
        N° 2026 EDITION
      </Enter>

      {/* crosshair decorations */}
      <Enter delay={0.6} duration={0.6} class="pointer-events-none absolute inset-5 sm:inset-8 corner-bracket z-20" />
      <Plus class="absolute top-1/3 right-1/4 h-2.5 w-2.5 text-primary/60 z-20" />

      {/* center stage with pointer parallax */}
      <div class="relative z-10 flex min-h-[100dvh] flex-col items-start justify-center px-4 pb-20 pt-20 sm:min-h-screen sm:items-center sm:px-8 sm:pb-0 sm:pt-0">
        {/* giant cropped background word */}
        <Enter
          delay={0.4}
          duration={1.2}
          toOpacity={0.05}
          class="pointer-events-none absolute top-[14%] left-1/2 -translate-x-1/2 font-display font-thin tracking-ultra text-bone leading-none select-none whitespace-nowrap huge-crop"
        >
          MABIS
        </Enter>

        <Enter delay={0.5} duration={0.6} fromY={8} class="mb-4 flex max-w-full items-center gap-3 tech-label text-primary sm:mb-6">
          <Enter delay={0.55} duration={0.6} fromScaleX={0} class="block h-px w-8 bg-primary origin-left" />
          <span>01 —</span>
          <JapaneseText
            ja="セカンダリー・コミュニティ・ミーティング・アプリ"
            layout="inline"
            japaneseClass="ml-1.5 inline normal-case tracking-normal text-[0.85em]"
          >
            SECONDARY COMMUNITY MEETING APP
          </JapaneseText>
        </Enter>

        <div ref={titleRef} class="will-change-transform">
          <h1 class="text-left font-display text-[clamp(2.8rem,14vw,4.1rem)] font-extralight leading-[0.88] tracking-ultra sm:text-center sm:text-8xl md:text-9xl lg:text-[11rem]">
            <span class="block">
              <SplitChars text="COMMUNITY" stagger={0.05} delay={0.6} />
            </span>
            <span class="block mt-2 sm:mt-3 text-stroke-bone">
              <SplitChars text="MEETING" stagger={0.05} delay={1.0} />
            </span>
          </h1>
        </div>

        <Enter
          delay={1.6}
          duration={0.8}
          fromScaleX={0}
          class="my-6 h-px w-32 origin-left bg-bone/40 sm:my-10 sm:w-40 sm:origin-center"
        />

        <Enter delay={1.7} duration={0.7} fromY={10} class="max-w-md text-left sm:text-center text-sm sm:text-base text-bone/65 leading-relaxed">
          <JapaneseText
            ja="自分の言葉を届け、互いに耳を傾け、みんなで決める。中等部のコミュニティが記録し、振り返り、育てていきます。"
            japaneseClass="mt-2 block text-[0.9em]"
          >
            Voice your words with presence and shared decision — recorded, remembered, and refined by the secondary community.
          </JapaneseText>
        </Enter>

        <div class="mt-7 w-full sm:mt-12 sm:w-auto">
          <MagneticButton strength={0.4}>
            <button
              onClick={enter}
              data-cursor="ENTER"
              class="liquid-btn liquid-ink group relative flex w-full items-center justify-between gap-3 border border-bone/40 bg-bone/5 px-5 py-4 text-bone backdrop-blur-sm sm:w-auto sm:justify-start sm:gap-4 sm:px-8"
            >
              <span class="tech-label">N° 02</span>
              <span class="text-lg sm:text-xl font-display font-normal tracking-tight">
                {isAuthenticated() ? "ENTER START" : "ENTER LOG IN"}
              </span>
              <span class="relative flex h-8 w-8 items-center justify-center overflow-hidden">
                <ArrowUpRight class="h-6 w-6" />
              </span>
            </button>
          </MagneticButton>
        </div>

        {/* scroll cue */}
        <Enter delay={0.4} duration={0.6} class="absolute bottom-16 right-5 hidden flex-col items-center gap-2 sm:right-10 sm:flex">
          <span class="tech-label vert-text text-bone/45">SCROLL</span>
          <span class="splash-bob">
            <ArrowDown class="h-4 w-4 text-bone/50" />
          </span>
        </Enter>
      </div>

      {/* bottom marquee */}
      <div class="absolute bottom-0 left-0 right-0 z-10 border-t border-bone/15 py-3 bg-ink/80 backdrop-blur-sm">
        <Marquee speed={32} class="text-bone/55">
          {marqueeRun}
        </Marquee>
      </div>
    </div>
  );
}

/**
 * The landing page for whichever style is selected.
 *
 * Routed through <Show> rather than a branch inside one component, so the
 * editorial splash's pointer-parallax subscription and its kinetic background
 * never mount at all under Summer style — the cheapest version of that work
 * is the version that does not run.
 */
export default function Splash() {
  const auth = useAuth();
  const navigate = useNavigate();
  const layout = useHomeLayout();

  const enter = () => navigate(auth.isAuthenticated() ? "/home" : "/login");

  return (
    <Show
      when={layout() === "boss"}
      fallback={<SummerSplash authenticated={auth.isAuthenticated()} onEnter={enter} />}
    >
      <EditorialSplash />
    </Show>
  );
}
