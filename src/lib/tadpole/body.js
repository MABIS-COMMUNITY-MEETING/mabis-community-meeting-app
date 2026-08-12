import { SCALE } from "@/lib/tadpole/profiles";

/**
 * Planar discrete elastic rod (Cosserat reduction) immersed in water.
 *
 * Structure
 *   • inextensible notochord — XPBD distance constraints, so the animal bends
 *     but does not stretch; |∂r/∂s| − 1 is monitored as εs.
 *   • spatially varying bending rigidity B(s): stiff rostral body, compliant
 *     distal tail.
 *   • active curvature κ₀(s,t) requested by muscles; the realised curvature κ
 *     comes out of the moment balance M = B(κ−κ₀) + D κ̇ against fluid load.
 *
 * Hydrodynamics (reduced elongated-body model, valid across the intermediate
 * Re regime this animal lives in):
 *   • reactive/added-mass: m_a(s) is added to the nodal inertia, so transverse
 *     acceleration of the tail genuinely costs momentum and returns thrust.
 *   • resistive cross-flow: f⊥ = −½ρ C_D h(s) |v⊥| v⊥ n̂
 *   • tangential skin friction: f∥ = −c∥ v∥ t̂  (much smaller)
 *   • separate bluff-body form drag on the globose head.
 * All bending/constraint forces are internal and sum to zero, so the centre of
 * mass can only be accelerated by the fluid. There is no force-toward-pointer.
 */

const RHO = 1.0;        // nondimensional fluid density in screen units
const CD_N = 3.0e-4;    // cross-flow drag scale
const CD_T = 2.2e-5;    // tangential skin drag scale
const CD_HEAD = 7.0e-4; // bluff head form drag
const BEND_DAMP = 0.55;

export default class Rod {
  constructor(N, widthFn) {
    this.N = N;
    this.L = SCALE.L_px;
    this.l0 = this.L / (N - 1);

    this.x = new Float32Array(N);
    this.y = new Float32Array(N);
    this.px = new Float32Array(N);
    this.py = new Float32Array(N);
    this.vx = new Float32Array(N);
    this.vy = new Float32Array(N);
    this.fx = new Float32Array(N);
    this.fy = new Float32Array(N);
    this.m = new Float32Array(N);
    this.invM = new Float32Array(N);
    this.h = new Float32Array(N);       // local half-depth, drives drag + added mass
    this.B = new Float32Array(N);       // bending rigidity at interior nodes
    this.kappa = new Float32Array(N);
    this.kappaPrev = new Float32Array(N);
    this.kappa0 = new Float32Array(N);  // muscle-requested curvature
    this.stretch = 0;
    this.fluidFx = 0; this.fluidFy = 0; this.fluidTorque = 0;

    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      this.h[i] = widthFn(s);
      const rho_s = 0.30;                                  // tissue line density
      const mBody = rho_s * this.l0 * (2 * this.h[i]);
      const mAdded = 0.25 * Math.PI * this.h[i] * this.h[i] * this.l0 * RHO;
      this.m[i] = mBody + mAdded;
      this.invM[i] = 1 / this.m[i];
      // B(s) = B_tail + (B_body − B_tail)·g(s), g smoothly decreasing caudally
      const g = Math.exp(-Math.pow(s / 0.42, 2));
      this.B[i] = 22 + (300 - 22) * g;
    }
  }

  place(cx, cy, theta) {
    const c = Math.cos(theta), sn = Math.sin(theta);
    for (let i = 0; i < this.N; i++) {
      this.x[i] = cx - c * this.l0 * i;
      this.y[i] = cy - sn * this.l0 * i;
      this.vx[i] = 0; this.vy[i] = 0;
      this.kappa[i] = 0; this.kappaPrev[i] = 0;
    }
  }

  translate(dx, dy) {
    for (let i = 0; i < this.N; i++) { this.x[i] += dx; this.y[i] += dy; }
  }

  /** One semi-implicit step with XPBD inextensibility projection. */
  step(dt) {
    const { N, x, y, vx, vy, fx, fy, invM } = this;
    fx.fill(0); fy.fill(0);
    this.bendingForces(dt);
    this.hydroForces();

    for (let i = 0; i < N; i++) {
      vx[i] += fx[i] * invM[i] * dt;
      vy[i] += fy[i] * invM[i] * dt;
      this.px[i] = x[i]; this.py[i] = y[i];
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
    }

    // inextensible notochord: 3 Gauss-Seidel passes, mass-weighted
    let maxErr = 0;
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < N - 1; i++) {
        const dx = x[i + 1] - x[i], dy = y[i + 1] - y[i];
        const d = Math.hypot(dx, dy) || 1e-6;
        const err = (d - this.l0) / d;
        if (it === 0) maxErr = Math.max(maxErr, Math.abs(d / this.l0 - 1));
        const wSum = invM[i] + invM[i + 1];
        const kx = (dx * err) / wSum, ky = (dy * err) / wSum;
        x[i] += kx * invM[i];       y[i] += ky * invM[i];
        x[i + 1] -= kx * invM[i + 1]; y[i + 1] -= ky * invM[i + 1];
      }
    }
    this.stretch = maxErr;

    const inv = 1 / dt;
    for (let i = 0; i < N; i++) {
      vx[i] = (x[i] - this.px[i]) * inv;
      vy[i] = (y[i] - this.py[i]) * inv;
    }
    this.limitCurvature();
  }

  /**
   * M = B(κ − κ₀) + D κ̇ applied as an internal couple on each node triple.
   * The three forces sum to zero, so this cannot translate the centre of mass.
   */
  bendingForces(dt) {
    const { N, x, y, fx, fy, kappa, kappaPrev, kappa0, B } = this;
    for (let i = 1; i < N - 1; i++) {
      const e1x = x[i] - x[i - 1], e1y = y[i] - y[i - 1];
      const e2x = x[i + 1] - x[i], e2y = y[i + 1] - y[i];
      const l1 = e1x * e1x + e1y * e1y, l2 = e2x * e2x + e2y * e2y;
      if (l1 < 1e-8 || l2 < 1e-8) continue;
      const cross = e1x * e2y - e1y * e2x;
      const dot = e1x * e2x + e1y * e2y;
      const phi = Math.atan2(cross, dot);
      kappaPrev[i] = kappa[i];
      kappa[i] = phi / this.l0;
      const rate = (kappa[i] - kappaPrev[i]) / dt;
      const M = B[i] * (kappa[i] - kappa0[i]) + BEND_DAMP * B[i] * 0.02 * rate;

      // torque → perpendicular forces on the neighbours, reaction on the hinge
      const f1x = (-M * -e1y) / l1, f1y = (-M * e1x) / l1;
      const f2x = (M * -e2y) / l2, f2y = (M * e2x) / l2;
      fx[i - 1] += f1x; fy[i - 1] += f1y;
      fx[i + 1] += f2x; fy[i + 1] += f2y;
      fx[i] -= f1x + f2x; fy[i] -= f1y + f2y;
    }
  }

  hydroForces() {
    const { N, x, y, vx, vy, fx, fy, h } = this;
    let Fx = 0, Fy = 0, T = 0;
    let cx = 0, cy = 0, mt = 0;
    for (let i = 0; i < N; i++) { cx += x[i] * this.m[i]; cy += y[i] * this.m[i]; mt += this.m[i]; }
    cx /= mt; cy /= mt;

    for (let i = 0; i < N; i++) {
      const a = i > 0 ? i - 1 : 0, b = i < N - 1 ? i + 1 : N - 1;
      let tx = x[b] - x[a], ty = y[b] - y[a];
      const tl = Math.hypot(tx, ty) || 1e-6;
      tx /= tl; ty /= tl;
      const nx = -ty, ny = tx;

      const vpar = vx[i] * tx + vy[i] * ty;
      const vper = vx[i] * nx + vy[i] * ny;
      const seg = this.l0;

      // resistive cross-flow (quadratic, the propulsive term)
      const fn = -0.5 * RHO * CD_N * (2 * h[i]) * seg * Math.abs(vper) * vper * 1e3;
      // tangential skin friction
      const ft = -0.5 * RHO * CD_T * (2 * h[i]) * seg * Math.abs(vpar) * vpar * 1e3;

      let hx = fn * nx + ft * tx;
      let hy = fn * ny + ft * ty;

      if (i === 0) { // globose head: bluff-body form drag, not another tail slice
        const sp = Math.hypot(vx[0], vy[0]);
        hx += -CD_HEAD * h[0] * h[0] * sp * vx[0] * 1e3;
        hy += -CD_HEAD * h[0] * h[0] * sp * vy[0] * 1e3;
      }

      fx[i] += hx; fy[i] += hy;
      Fx += hx; Fy += hy;
      T += (x[i] - cx) * hy - (y[i] - cy) * hx;
    }
    this.fluidFx = Fx; this.fluidFy = Fy; this.fluidTorque = T;
    this.comX = cx; this.comY = cy;
  }

  /** Soft anatomical curvature saturation — no brutal clipping. */
  limitCurvature() {
    const { N, x, y } = this;
    const kmax = 2.6 / this.L;
    for (let i = 1; i < N - 1; i++) {
      const e1x = x[i] - x[i - 1], e1y = y[i] - y[i - 1];
      const e2x = x[i + 1] - x[i], e2y = y[i + 1] - y[i];
      const phi = Math.atan2(e1x * e2y - e1y * e2x, e1x * e2x + e1y * e2y);
      const k = phi / this.l0;
      if (Math.abs(k) > kmax) {
        const keff = kmax * Math.tanh(k / kmax);
        const corr = (keff - k) * this.l0;
        const c = Math.cos(corr), s = Math.sin(corr);
        // rotate the distal remainder about the hinge — length preserving
        for (let j = i + 1; j < N; j++) {
          const dx = x[j] - x[i], dy = y[j] - y[i];
          x[j] = x[i] + dx * c - dy * s;
          y[j] = y[i] + dx * s + dy * c;
        }
      }
    }
  }

  headTheta() {
    return Math.atan2(this.y[0] - this.y[2], this.x[0] - this.x[2]);
  }
  headSpeed() { return Math.hypot(this.vx[0], this.vy[0]); }
  kineticEnergy() {
    let T = 0;
    for (let i = 0; i < this.N; i++) T += 0.5 * this.m[i] * (this.vx[i] ** 2 + this.vy[i] ** 2);
    return T;
  }
}