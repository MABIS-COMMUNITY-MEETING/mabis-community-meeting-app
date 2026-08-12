import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { subscribe } from "@/lib/physics/scheduler";
import { pointer, startPointerEngine } from "@/lib/physics/pointer";
import { MATERIAL, CURSOR, SLEEP } from "@/lib/physics/tokens";
import { integrateSpring, clamp, tanhSat, angleDelta } from "@/lib/physics/math";
import { tadpoleBox, tadpoleLens, LENS_DEPTH } from "@/lib/cursor/tadpoleGlass";

/**
 * The cursor is a tadpole made of liquid glass, swimming above the page.
 *
 *   CORE  — critically damped spring on the predicted pointer: where you are.
 *   BODY  — viscous membrane trailing the core in the travel frame; its lateral
 *           lag IS the body's bend, which drives the glass geometry.
 *
 * The silhouette (head, body, tail, fin) is the lens: its signed distance field
 * bakes a displacement map that refracts the live page beneath, per colour
 * channel for dispersion. A hairline dark outline keeps it readable, a bright
 * inner edge and a head specular read as a curved surface, and the Pride palette
 * enters only as rim light — never as fill.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const wrapRef = useRef(null);
  const glassRef = useRef(null);
  const mapRef = useRef(null);
  const pathRefs = useRef([]);
  const [enabled, setEnabled] = useState(false);
  const box = tadpoleBox();

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);
    document.body.classList.add("cursor-ready");

    const stopPointer = startPointerEngine();

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    const coreX = { x: cx, v: 0 }, coreY = { x: cy, v: 0 };
    const bodyX = { x: cx, v: 0 }, bodyY = { x: cy, v: 0 };
    const swim = { x: 0, v: 0 };
    const bendS = { x: 0, v: 0 };

    let theta = 0;
    let visible = false;
    let bakedKey = null;

    const f = { tx: 1, ty: 0, nx: 0, ny: 1 };
    const st = { x: 0, v: 0 }, sn = { x: 0, v: 0 };

    const step = (dt) => {
      if (!pointer.seen) return;
      if (!visible) {
        visible = true;
        coreX.x = bodyX.x = pointer.x;
        coreY.x = bodyY.x = pointer.y;
      }

      const P = MATERIAL.precision;
      integrateSpring(coreX, pointer.tx, P.omega, P.zeta, dt);
      integrateSpring(coreY, pointer.ty, P.omega, P.zeta, dt);

      const s = pointer.speed;
      if (s > 90) { f.tx = pointer.vx / s; f.ty = pointer.vy / s; }
      f.nx = -f.ty; f.ny = f.tx;

      const G = MATERIAL.glass;
      const ex = bodyX.x - coreX.x, ey = bodyY.x - coreY.x;
      st.x = ex * f.tx + ey * f.ty;
      sn.x = ex * f.nx + ey * f.ny;
      st.v = bodyX.v * f.tx + bodyY.v * f.ty;
      sn.v = bodyX.v * f.nx + bodyY.v * f.ny;

      integrateSpring(st, 0, G.omega * CURSOR.tangentScale, G.zeta, dt);
      integrateSpring(sn, 0, G.omega * CURSOR.normalScale, G.zeta, dt);

      bodyX.x = coreX.x + st.x * f.tx + sn.x * f.nx;
      bodyY.x = coreY.x + st.x * f.ty + sn.x * f.ny;
      bodyX.v = st.v * f.tx + sn.v * f.nx;
      bodyY.v = st.v * f.ty + sn.v * f.ny;

      const lag = Math.hypot(bodyX.x - coreX.x, bodyY.x - coreY.x);
      const effort = tanhSat(CURSOR.shearAlpha * s + lag / 46);
      integrateSpring(swim, effort, 5.5, 1.0, dt);
      // lateral lag = how hard the body is thrown sideways = how much it curves
      integrateSpring(bendS, clamp(-sn.x / 16, -1, 1), 9, 1.0, dt);

      if (s > 140) {
        const want = (Math.atan2(pointer.vy, pointer.vx) * 180) / Math.PI;
        theta += angleDelta(want, theta) * clamp(dt * 7, 0, 1);
      }
    };

    const render = () => {
      if (!visible) return;
      const d = dotRef.current, w = wrapRef.current;

      if (d) {
        d.style.opacity = pointer.inside ? "1" : "0";
        d.style.transform = `translate3d(${coreX.x.toFixed(2)}px, ${coreY.x.toFixed(2)}px, 0) translate(-50%,-50%)`;
      }
      if (!w) return;

      // muscles → curvature → silhouette → glass. Bends are quantised, so the
      // lens is re-baked only when the body's shape actually changes.
      const lens = tadpoleLens(bendS.x);
      if (lens.key !== bakedKey) {
        bakedKey = lens.key;
        pathRefs.current.forEach((p) => p && p.setAttribute("d", lens.d));
        if (glassRef.current) glassRef.current.style.clipPath = `path("${lens.d}")`;
        if (mapRef.current) mapRef.current.setAttribute("href", lens.map);
      }

      const press = pointer.down ? 0.94 : 1;
      w.style.opacity = pointer.inside ? "1" : "0";
      w.style.transform =
        `translate3d(${coreX.x.toFixed(2)}px, ${coreY.x.toFixed(2)}px, 0) ` +
        `rotate(${theta.toFixed(2)}deg) scale(${press}) translate(${-box.hx}px, ${-box.hy}px)`;
      w.style.setProperty("--tad-energy", (0.35 + swim.x * 0.65).toFixed(3));
      w.classList.toggle("is-press", !!pointer.down);
      w.classList.toggle("is-hover", !!pointer.target);
    };

    const settled = () => {
      if (!visible) return true;
      const err = Math.hypot(bodyX.x - pointer.tx, bodyY.x - pointer.ty);
      const vel = Math.hypot(bodyX.v, bodyY.v) + Math.hypot(coreX.v, coreY.v);
      return err < SLEEP.pos && vel < SLEEP.vel && swim.x < 0.01 && Math.abs(bendS.v) < 0.01;
    };

    const unsubscribe = subscribe({ step, render, settled });
    return () => {
      unsubscribe();
      stopPointer();
      document.body.classList.remove("cursor-ready");
    };
  }, [box.hx, box.hy]);

  if (!enabled) return null;
  const setPath = (i) => (el) => { pathRefs.current[i] = el; };

  return createPortal(
    <>
      {/* liquid-glass lens: one displacement pass per channel = dispersion */}
      <svg width="0" height="0" aria-hidden style={{ position: "fixed" }}>
        <defs>
          <filter id="tad-lens" filterUnits="objectBoundingBox" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
            <feImage ref={mapRef} preserveAspectRatio="none" x="0" y="0" width="100%" height="100%" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={LENS_DEPTH * 1.06} xChannelSelector="R" yChannelSelector="G" result="dr" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={LENS_DEPTH} xChannelSelector="R" yChannelSelector="G" result="dg" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale={LENS_DEPTH * 0.94} xChannelSelector="R" yChannelSelector="G" result="db" />
            <feColorMatrix in="dr" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cr" />
            <feColorMatrix in="dg" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cg" />
            <feColorMatrix in="db" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cb" />
            <feComposite in="cr" in2="cg" operator="arithmetic" k2="1" k3="1" result="crg" />
            <feComposite in="crg" in2="cb" operator="arithmetic" k2="1" k3="1" result="crgb" />
            <feGaussianBlur in="crgb" stdDeviation="0.18" />
          </filter>
        </defs>
      </svg>

      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} aria-hidden />

      <div ref={wrapRef} className="cursor-tad" style={{ width: box.W, height: box.H, opacity: 0 }} aria-hidden>
        <div ref={glassRef} className="cursor-tad-glass" />
        <svg className="cursor-tad-ink" width={box.W} height={box.H} viewBox={`0 0 ${box.W} ${box.H}`}>
          <defs>
            <clipPath id="tad-clip">
              <path ref={setPath(0)} />
            </clipPath>
          </defs>
          <g clipPath="url(#tad-clip)">
            {/* bright internal specular edge — light grazing the upper surface */}
            <path ref={setPath(1)} className="tad-spec" transform="translate(-0.9,-1)" />
            {/* Pride palette enters as rim illumination only */}
            <path ref={setPath(2)} className="tad-rim" transform="translate(1,1.1)" />
            <ellipse className="tad-glint" cx={box.hx - 2.6} cy={box.hy - 3.2} rx="3.4" ry="2" />
          </g>
          {/* hairline dark outline — always readable */}
          <path ref={setPath(3)} className="tad-line" />
        </svg>
      </div>
    </>,
    document.body
  );
}