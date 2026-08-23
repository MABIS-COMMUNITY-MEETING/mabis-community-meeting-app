/*
 * One pointer system for every glass surface.
 *
 * A single passive mousemove listener feeds a shared rAF loop; surfaces
 * register themselves and are written to only while the loop is awake and
 * only when their values actually changed. No per-element listeners, no
 * layout reads outside the frame, and the loop parks itself the moment the
 * pointer stops moving.
 */

import { subscribe, wake } from "@/lib/physics/scheduler";

const surfaces = new Set();
const SETTLE_MS = 90;
let px = 0, py = 0, lastX = 0, lastY = 0;
let dirty = false, fast = "0", bound = false, latestTarget = null;
let unsubscribe = null, settleTimer = null, lastMoveAt = 0;

function settleAfterInactivity() {
	const remaining = SETTLE_MS - (performance.now() - lastMoveAt);
	if (remaining > 1) {
		settleTimer = setTimeout(settleAfterInactivity, remaining);
		return;
	}
	settleTimer = null;
	fast = "0";
	dirty = true;
	wake();
}

function scheduleSettle() {
	if (!settleTimer) settleTimer = setTimeout(settleAfterInactivity, SETTLE_MS);
}

function onMove(e) {
	if (document.documentElement.classList.contains("performance-lite")) return;
	const events = e.getCoalescedEvents?.();
	const latest = events?.length ? events[events.length - 1] : e;
	px = latest.clientX;
	py = latest.clientY;
	latestTarget = e.target;
	fast = Math.hypot(px - lastX, py - lastY) > 14 ? "1" : "0";
	lastX = px; lastY = py;
	lastMoveAt = performance.now();
	dirty = true;
	scheduleSettle();
	wake();
}

function readGeometry() {
	if (!dirty) return;
	const targetSurface = latestTarget?.closest?.(".lg-surface") || null;
	for (const surface of surfaces) {
		if (!surface.measured || surface.el === targetSurface) {
			const r = surface.el.getBoundingClientRect();
			surface.left = r.left;
			surface.top = r.top;
			surface.width = r.width;
			surface.height = r.height;
			surface.valid = r.width > 0 && r.height > 0;
			surface.measured = true;
		}
		if (!surface.valid) continue;
		const active = px >= surface.left - 30 && px <= surface.left + surface.width + 30
			&& py >= surface.top - 30 && py <= surface.top + surface.height + 30;
		surface.changed = active || active !== surface.active;
		surface.active = active;
		if (active) {
			surface.x = Math.max(-30, Math.min(px - surface.left, surface.width + 30));
			surface.y = Math.max(-30, Math.min(py - surface.top, surface.height + 30));
		} else if (surface.changed) {
			surface.x = surface.width / 2;
			surface.y = 0;
		}
	}
}

function writeVisuals() {
	if (!dirty) return;
	dirty = false;
	for (const surface of surfaces) {
		if (!surface.valid || !surface.changed) continue;
		surface.changed = false;
		const el = surface.el;
		el.style.setProperty("--glass_pointer_x", `${surface.x}px`);
		el.style.setProperty("--glass_pointer_y", `${surface.y}px`);
		if (el.dataset.glassFast !== fast) el.dataset.glassFast = fast;
	}
}

function invalidateGeometry() {
	for (const surface of surfaces) surface.measured = false;
	dirty = true;
	wake();
}

function bind() {
	if (bound) return;
	bound = true;
	window.addEventListener("pointermove", onMove, { passive: true });
	window.addEventListener("resize", invalidateGeometry, { passive: true });
	unsubscribe = subscribe({ sample: readGeometry, step: () => {}, render: writeVisuals, settled: () => !dirty });
}

function unbind() {
	if (!bound || surfaces.size) return;
	bound = false;
	window.removeEventListener("pointermove", onMove);
	window.removeEventListener("resize", invalidateGeometry);
	unsubscribe?.(); unsubscribe = null;
	clearTimeout(settleTimer);
	settleTimer = null;
	latestTarget = null;
}

export function registerGlass(el) {
	if (!el) return () => {};
	const surface = {
		el, x: 0, y: 0, left: 0, top: 0, width: 0, height: 0,
		valid: false, measured: false, active: false, changed: false,
	};
	surfaces.add(surface);
	bind();
	dirty = true;
	wake();
	return () => { surfaces.delete(surface); unbind(); };
}