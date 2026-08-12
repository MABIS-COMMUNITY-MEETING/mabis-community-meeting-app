import CPG from "@/lib/tadpole/cpg";
import Muscles from "@/lib/tadpole/muscle";
import Rod from "@/lib/tadpole/body";
import { coreWidth, finWidth } from "@/lib/tadpole/geometry";
import { ACTIVE_PROFILE, SCALE, reynolds, strouhal } from "@/lib/tadpole/profiles";
import { pointer } from "@/lib/physics/pointer";

/**
 * The whole organism.
 *
 *   pointer (already Kalman-filtered upstream)
 *     → sensory target
 *     → descending locomotor drive D and steering bias b
 *     → bilateral CPG (1 kHz)
 *     → segmental muscles, Hill force (1 kHz)
 *     → active curvature κ₀ on the elastic rod (480 Hz)
 *     → fluid reaction forces → thrust and torque
 *     → the animal swims.
 *
 * Nothing in this file applies a force toward the pointer. Steering only
 * biases left/right drive; translation comes exclusively from Rod's fluid
 * forces. Browser hit-testing is untouched — the real pointer stays
 * authoritative, this is only the visual body.
 */

const N = 20;        // rod nodes
const S = 9;         // muscle segments
const DT_NEURAL = 1 / 1000;
const DT_BODY = 1 / 480;

export default class Tadpole {
  constructor() {
    this.rod = new Rod(N, coreWidth);
    this.cpg = new CPG(S, 7);
    this.mus = new Muscles(S);
    this.driveL = new Float32Array(S);
    this.driveR = new Float32Array(S);

    this.finOff = new Float32Array(N);   // viscoelastic fin offset
    this.finVel = new Float32Array(N);
    this.coreW = new Float32Array(N);
    this.finW = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      this.coreW[i] = coreWidth(s) * SCALE.L_px * 0.16;
      this.finW[i] = finWidth(s) * SCALE.L_px * 0.16;
    }

    this.accN = 0; this.accB = 0;
    this.bias = 0; this.biasCmd = 0;
    this.drive = 0; this.recruit = 0;
    this.eta = 0;                        // Ornstein-Uhlenbeck gait variability
    this.omega = 0; this.lastTheta = 0;
    this.ampPP = 0; this.tipPrev = 0; this.tipExtreme = 0;
    this.beatT = 0; this.freq = 0; this.lastSign = 0;
    this.ready = false;
  }

  reset(x, y) {
    this.rod.place(x, y, 0);
    this.ready = true;
  }

  /** Sensory target: filtered pointer, with only a whisper of UI magnetism. */
  sensoryTarget(out) {
    out.x = pointer.x * 0.92 + pointer.tx * 0.08;
    out.y = pointer.y * 0.92 + pointer.ty * 0.08;
  }

  step(dt) {
    if (!pointer.seen) return;
    const rod = this.rod;
    if (!this.ready) { this.reset(pointer.x, pointer.y); return; }

    const T = this._t || (this._t = { x: 0, y: 0 });
    this.sensoryTarget(T);

    const hx = rod.x[0], hy = rod.y[0];
    let ex = T.x - hx, ey = T.y - hy;
    let dist = Math.hypot(ex, ey);

    // pointer teleport / window re-entry: reposition, never inject kinetic energy
    if (dist > 520) {
      rod.translate(T.x - hx, T.y - hy);
      for (let i = 0; i < N; i++) { rod.vx[i] *= 0.2; rod.vy[i] *= 0.2; }
      return;
    }

    const theta = rod.headTheta();
    this.omega = ((theta - this.lastTheta + Math.PI * 3) % (Math.PI * 2) - Math.PI) / Math.max(dt, 1e-4);
    this.lastTheta = theta;

    // ── descending drive: distance + target motion, saturated ─────────
    const tgtSpeed = Math.hypot(pointer.vx, pointer.vy);
    // anticipatory deceleration: closing velocity vs remaining distance
    const closing = dist > 1 ? (ex * rod.vx[0] + ey * rod.vy[0]) / dist : 0;
    const stopDist = (closing * closing) / 900;
    const need = Math.max(0, dist - stopDist * 0.9);
    const gD = Math.tanh(need / 70);
    const gV = Math.tanh(tgtSpeed / 900);
    let D = 0.14 + 0.62 * gD + 0.26 * gV;
    if (dist < 6) D *= 0.35;               // idle → near-quiescence, no idle loop
    this.drive = D;

    // recruitment R: 0 = distal sculling, 1 = whole-tail propulsion
    this.recruit = Math.min(1, 0.18 + 1.05 * gD + 0.5 * gV);

    // ── steering: bounded nonlinear PD on heading error ───────────────
    const thetaD = Math.atan2(ey, ex);
    const eTheta = ((thetaD - theta + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.eTheta = eTheta;
    this.biasCmd = Math.tanh(2.1 * eTheta - 0.16 * this.omega);
    // filtered through activation-like dynamics, never applied instantly
    this.bias += (this.biasCmd - this.bias) * Math.min(1, dt * 14);

    // correlated (OU) gait variability — suppressed near targets / at rest
    const quiet = dist < 24 || !!pointer.target;
    this.eta += (-this.eta / 0.35) * dt + (quiet ? 0 : 0.06 * Math.sqrt(dt) * (Math.random() * 2 - 1));

    // per-segment descending drive, rostral segments recruited only at speed
    for (let i = 0; i < S; i++) {
      const s = i / (S - 1);
      const rost = 0.28 + 0.72 * Math.min(1, this.recruit * 1.4);
      const w = 0.35 + 0.65 * Math.pow(s, 1 - 0.7 * this.recruit); // caudal weighting
      const base = D * w * rost * (1 + this.eta);
      const turn = 0.42 * this.bias * (0.35 + 0.65 * (1 - s));
      this.driveL[i] = Math.max(0, base * (1 + turn));
      this.driveR[i] = Math.max(0, base * (1 - turn));
    }

    // ── neural + muscle substeps (1 kHz) ──────────────────────────────
    this.accN += dt;
    let guard = 0;
    while (this.accN >= DT_NEURAL && guard++ < 40) {
      this.cpg.step(DT_NEURAL, this.driveL, this.driveR);
      this.mus.step(DT_NEURAL, this.cpg.out, 1);
      this.accN -= DT_NEURAL;
    }
    if (guard >= 40) this.accN = 0;

    // ── muscles request curvature, mechanics decides the rest ─────────
    const kmax = 2.2 / rod.L;
    for (let j = 1; j < N - 1; j++) {
      const s = j / (N - 1);
      const seg = Math.min(S - 1, Math.floor(s * S));
      const amp = 0.20 + 0.80 * Math.pow(s, 1.6 - 0.6 * this.recruit); // A(s) grows caudally
      rod.kappa0[j] = kmax * Math.tanh(2.4 * this.mus.net(seg) * amp) + 0.30 * kmax * this.bias * s;
      // feed realised curvature back as muscle strain (force–length/velocity)
      const k = rod.kappa[j];
      this.mus.strain[seg] = k * rod.L * 0.12;
      this.mus.strain[S + seg] = -k * rod.L * 0.12;
      this.mus.strainRate[seg] = (k - rod.kappaPrev[j]) * 0.02;
      this.mus.strainRate[S + seg] = -(k - rod.kappaPrev[j]) * 0.02;
    }

    // ── body + fluid (480 Hz) ─────────────────────────────────────────
    this.accB += dt;
    let g2 = 0;
    while (this.accB >= DT_BODY && g2++ < 24) {
      rod.step(DT_BODY);
      this.accB -= DT_BODY;
    }
    if (g2 >= 24) this.accB = 0;

    // Usability leash — NOT thrust. If the animal ever falls implausibly far
    // behind (heavy tab stall, extreme flick), the whole body is translated at
    // position level, injecting no velocity and no kinetic energy. It does
    // nothing at all inside normal swimming range.
    if (dist > 200) {
      const k = Math.min(1, (dist - 200) / 260) * Math.min(1, dt * 6);
      rod.translate(ex * k, ey * k);
    }

    this.finStep(dt);
    this.diagnostics(dt, dist);
  }

  /**
   * Fin: standard-linear-solid membrane trailing the muscular core.
   * Damping is high and the response is frequency-dependent — motivated by
   * anuran tail-fin viscoelasticity measurements (cross-species prior, NOT
   * measured Xenopus laevis constants).
   */
  finStep(dt) {
    const rod = this.rod;
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      if (s < 0.3) { this.finOff[i] = 0; this.finVel[i] = 0; continue; }
      const lateral = rod.vx[i] * -Math.sin(rod.headTheta()) + rod.vy[i] * Math.cos(rod.headTheta());
      const target = -lateral * 0.010 * (s - 0.3);
      const k = 260, c = 26;
      const a = k * (target - this.finOff[i]) - c * this.finVel[i];
      this.finVel[i] += a * dt;
      this.finOff[i] += this.finVel[i] * dt;
    }
  }

  diagnostics(dt, dist) {
    const rod = this.rod;
    const speed = rod.headSpeed();
    // tail-tip excursion in the heading frame → peak-to-peak amplitude
    const th = rod.headTheta();
    const tip = (rod.x[N - 1] - rod.x[0]) * -Math.sin(th) + (rod.y[N - 1] - rod.y[0]) * Math.cos(th);
    const sign = Math.sign(tip - this.tipPrev);
    if (sign !== 0 && sign !== this.lastSign) {
      if (this.lastSign !== 0) {
        this.ampPP = this.ampPP * 0.7 + Math.abs(tip - this.tipExtreme) * 0.3;
        this.freq = this.freq * 0.7 + (this.beatT > 0 ? 0.3 / (2 * this.beatT) : 0);
        this.beatT = 0;
        this.tipExtreme = tip;
      }
      this.lastSign = sign;
    }
    this.beatT += dt;
    this.tipPrev = tip;

    this.stats = {
      profile: ACTIVE_PROFILE.name,
      Re: reynolds(speed).toFixed(0),
      St: strouhal(this.freq, this.ampPP, speed).toFixed(2),
      speedLs: (speed / rod.L).toFixed(2),
      freq: this.freq.toFixed(1),
      ampL: (this.ampPP / rod.L).toFixed(3),
      headYaw: Math.abs(this.omega).toFixed(2),
      eTheta: (this.eTheta || 0).toFixed(2),
      dPhiLR: this.cpg.phaseDiff(4).toFixed(2),
      aL: this.mus.a[4].toFixed(2),
      aR: this.mus.a[S + 4].toFixed(2),
      drive: this.drive.toFixed(2),
      recruit: this.recruit.toFixed(2),
      fluidF: Math.hypot(rod.fluidFx, rod.fluidFy).toFixed(1),
      fluidT: rod.fluidTorque.toFixed(1),
      KE: rod.kineticEnergy().toFixed(1),
      stretch: rod.stretch.toFixed(4),
      dist: dist.toFixed(0),
    };
  }
}