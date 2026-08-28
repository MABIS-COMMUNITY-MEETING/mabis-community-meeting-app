import { createSignal, createEffect, on, onMount, onCleanup, Show } from "solid-js";
import { Loader2, Shuffle } from "lucide-solid";
import { displayName } from "@/lib/names";
import { playWheelTick, playWheelStart, playWheelWin } from "@/lib/wheel_sound";
import { Button } from "~/components/ui";
import { TAU, normalizeRotation } from "~/lib/wheel-math";

/*
 * SpinWheel — Solid port from src/components/JobsWidget.jsx.
 *
 * The canvas drawing and the spin animation are vanilla and carry over
 * verbatim. What disappears is the React scaffolding around them:
 *
 *   useRef(x)     → a plain `let`. Refs exist in React because a re-render
 *                   would otherwise reset a local; Solid's component body runs
 *                   once, so a local IS stable.
 *   useCallback   → a plain function. There is no re-render to memoise
 *                   against, so drawWheel/refreshAppearance need no wrapper
 *                   and no dependency array.
 *   useEffect     → onMount + onCleanup.
 *
 * The rotation value was already held in a ref rather than state in the React
 * version — deliberately, because writing it to state 60×/sec would re-render
 * the component every frame. In Solid it is simply a local, and the canvas is
 * written to directly, so a spin costs zero reactive work.
 */
export default function SpinWheel(props) {
  let canvasEl;
  let rotation = 0;
  let spinning = false;
  let raf = null;
  let appearanceRaf = null;
  let spinGeneration = 0;
  let mounted = false;

  const [isSpinning, setIsSpinning] = createSignal(false);

  const size = () => props.size ?? 360;
  const members = () => props.members || [];

  let appearance = {
    primary: "#951E3A",
    secondary: "#EACE54",
    ring: "#7a1830",
    font: "'GNUFreeMonoUI'",
  };
  let wheelFaceDirty = true;
  let lastRotationStyle = "";

  const refreshAppearance = () => {
    const styles = getComputedStyle(document.documentElement);
    const themeColor = (name, fallback) => {
      const value = styles.getPropertyValue(name).trim();
      return value ? `hsl(${value})` : fallback;
    };
    appearance = {
      primary: themeColor("--primary", "#951E3A"),
      secondary: themeColor("--secondary", "#EACE54"),
      ring: themeColor("--ring", "#7a1830"),
      font: styles.getPropertyValue("--font-body").trim() || "'GNUFreeMonoUI'",
    };
    wheelFaceDirty = true;
  };

  /*
   * Paint the detailed wheel face only when its data, theme, size or DPR
   * changes. During a spin the browser rotates this one rasterized layer with
   * a compositor transform; names, shadows and every arc are no longer
   * repainted at the display refresh rate.
   */
  const drawWheelFace = () => {
    const canvas = canvasEl;
    const list = members();
    if (!canvas || list.length === 0 || !wheelFaceDirty) return;

    const s = size();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const backingSize = Math.round(s * dpr);
    if (canvas.width !== backingSize || canvas.height !== backingSize) {
      canvas.width = backingSize;
      canvas.height = backingSize;
    }

    const parentWidth = canvas.parentElement?.clientWidth || s;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth - 32 : s;
    const displaySize = Math.min(s, parentWidth, viewportWidth);
    const cssSize = `${displaySize}px`;
    if (canvas.style.width !== cssSize) canvas.style.width = cssSize;
    if (canvas.style.height !== cssSize) canvas.style.height = cssSize;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = s / 2, cy = s / 2, r = s / 2 - 8;
    const arc = (2 * Math.PI) / list.length;
    ctx.clearRect(0, 0, s, s);

    const { primary: primaryColor, secondary: secondaryColor, ring: primaryDark, font: uiFont } = appearance;

    list.forEach((m, i) => {
      const start = i * arc;
      const end = (i + 1) * arc;
      const isRed = i % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = isRed ? primaryColor : secondaryColor;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = "right";
      const fontSize = list.length > 20 ? 9 : list.length > 14 ? 11 : 13;
      ctx.font = `700 ${fontSize}px ${uiFont}`;
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(displayName(m), r - 10, 4);
      ctx.shadowBlur = 0;
      ctx.restore();
    });

    // Outer rings
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = primaryDark; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2; ctx.stroke();

    // Hub
    ctx.beginPath(); ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = primaryDark; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
    ctx.fillStyle = secondaryColor; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff"; ctx.fill();

    wheelFaceDirty = false;
  };

  const paintRotation = (rot) => {
    if (!canvasEl) return;
    const next = `translateZ(0) rotate(${rot}rad)`;
    if (next === lastRotationStyle) return;
    canvasEl.style.transform = next;
    lastRotationStyle = next;
  };

  const drawWheel = (rot) => {
    drawWheelFace();
    paintRotation(rot);
  };

  onMount(() => {
    mounted = true;
    refreshAppearance();
    drawWheel(rotation);

    const redraw = () => {
      wheelFaceDirty = true;
      drawWheel(rotation);
    };
    const scheduleAppearanceRedraw = () => {
      if (appearanceRaf) return;
      appearanceRaf = requestAnimationFrame(() => {
        appearanceRaf = null;
        refreshAppearance();
        redraw();
      });
    };

    window.addEventListener("themeChanged", scheduleAppearanceRedraw);
    window.addEventListener("fontChanged", scheduleAppearanceRedraw);
    window.addEventListener("resize", redraw, { passive: true });

    onCleanup(() => {
      mounted = false;
      spinGeneration += 1;
      spinning = false;
      window.removeEventListener("themeChanged", scheduleAppearanceRedraw);
      window.removeEventListener("fontChanged", scheduleAppearanceRedraw);
      window.removeEventListener("resize", redraw);
      if (appearanceRaf) cancelAnimationFrame(appearanceRaf);
      if (raf) cancelAnimationFrame(raf);
    });
  });

  // Redraw when the member list or size changes outside of a spin — e.g.
  // unchecking someone in Manage Students, or "Remove from wheel" on the
  // winner banner. The React version got this for free because drawWheel was
  // useCallback'd on [members, size], so the mount effect's dependency
  // (drawWheel's identity) changed too. Nothing does that automatically here,
  // so it needs its own effect — otherwise the wheel visibly goes stale.
  createEffect(on([members, size], () => {
    wheelFaceDirty = true;
    drawWheel(rotation);
  }, { defer: true }));

  // Pointer at top (12 o'clock = -π/2) — wheelofnames style
  const POINTER_ANGLE = -Math.PI / 2;

  const handleSpin = () => {
    const list = members();
    if (spinning || list.length === 0 || props.disabled) return;
    spinning = true;
    const currentSpinGeneration = ++spinGeneration;
    setIsSpinning(true);
    if (canvasEl) canvasEl.style.willChange = "transform";
    playWheelStart();

    const fullRotations = 5 + Math.random() * 3;
    const totalRot = TAU * fullRotations;
    const duration = 5500 + Math.random() * 1500; // 5.5–7s
    const start = performance.now();
    const startRot = rotation;
    const arc = (2 * Math.PI) / list.length;

    // Quintic ease-out for ultra-smooth deceleration
    const easeOut = (t) => 1 - Math.pow(1 - t, 5);

    const segmentAt = (rot) => {
      let diff = (POINTER_ANGLE - rot) % TAU;
      while (diff < 0) diff += TAU;
      return Math.floor(diff / arc) % list.length;
    };

    // one wooden knock each time a segment edge passes the pointer
    let lastSeg = segmentAt(startRot);

    const animate = (now) => {
      if (!mounted || currentSpinGeneration !== spinGeneration) return;
      const p = Math.min((now - start) / duration, 1);
      rotation = startRot + totalRot * easeOut(p);
      paintRotation(rotation);
      const seg = segmentAt(rotation);
      if (seg !== lastSeg) {
        lastSeg = seg;
        playWheelTick(p);
      }
      if (p < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        const winnerIndex = segmentAt(rotation);
        // Keep the angle bounded after every run. Without normalization it
        // grows forever and eventually loses precision after enough spins.
        rotation = normalizeRotation(rotation);
        paintRotation(rotation);
        if (canvasEl) canvasEl.style.willChange = "auto";
        raf = null;
        spinning = false;
        setIsSpinning(false);
        playWheelWin();
        props.onSpinComplete?.(list[winnerIndex]);
      }
    };
    raf = requestAnimationFrame(animate);
  };

  return (
    <div class="flex flex-col items-center gap-4">
      <div class="relative inline-block w-full max-w-full">
        {/* Pointer at top — wheelofnames style */}
        <div
          class="absolute -top-2 left-1/2 -translate-x-1/2 z-10 drop-shadow-lg"
          style={{
            width: 0, height: 0,
            "border-left": "14px solid transparent",
            "border-right": "14px solid transparent",
            "border-top": "28px solid hsl(var(--ring))",
          }}
        />
        <canvas
          ref={canvasEl}
          style={{
            width: `${size()}px`,
            height: `${size()}px`,
            "box-shadow": "0 8px 40px hsl(var(--primary) / 0.3), 0 2px 8px rgba(0,0,0,0.12)",
          }}
          class="cursor-pointer rounded-full"
          onClick={handleSpin}
        />
      </div>

      <div class="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Button
          onClick={handleSpin}
          disabled={isSpinning() || members().length === 0 || props.disabled}
          class="w-full rounded-xl bg-primary px-10 text-base font-bold text-primary-foreground hover:bg-primary/90"
          size="lg"
        >
          <Show when={isSpinning()} fallback={"Spin"}>
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />Spinning...
          </Show>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => props.onShuffle?.()}
          disabled={isSpinning() || members().length < 2 || props.disabled}
          class="rounded-xl px-4 font-bold"
          title="Shuffle the slice order without assigning anyone"
          aria-label="Shuffle wheel order"
        >
          <Shuffle class="mr-2 h-4 w-4" /> Shuffle
        </Button>
      </div>
    </div>
  );
}
