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
let px = 0, py = 0, lastX = 0, lastY = 0;
let dirty = false, fast = "0", bound = false;
let unsubscribe = null, settleTimer = null;

function onMove(e) {
	const events = e.getCoalescedEvents?.();
	const latest = events?.length ? events[events.length - 1] : e;
	px = latest.clientX;
	py = latest.clientY;
	fast = Math.hypot(px - lastX, py - lastY) > 14 ? "1" : "0";
	lastX = px; lastY = py;
	dirty = true;
	clearTimeout(settleTimer);
	settleTimer = setTimeout(() => { fast = "0"; dirty = true; wake(); }, 90);
	wake();
}

function readGeometry() {
	if (!dirty) return;
	for (const surface of surfaces) {
		const r = surface.el.getBoundingClientRect();
		surface.valid = r.width > 0 && r.height > 0;
		if (!surface.valid) continue;
		const active = px >= r.left - 30 && px <= r.right + 30 && py >= r.top - 30 && py <= r.bottom + 30;
		surface.changed = active || active !== surface.active;
		surface.active = active;
		if (active) {
			surface.x = Math.max(-30, Math.min(px - r.left, r.width + 30));
			surface.y = Math.max(-30, Math.min(py - r.top, r.height + 30));
		} else if (surface.changed) {
			surface.x = r.width / 2;
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

function bind() {
	if (bound) return;
	bound = true;
	window.addEventListener("pointermove", onMove, { passive: true });
	unsubscribe = subscribe({ sample: readGeometry, step: () => {}, render: writeVisuals, settled: () => !dirty });
}

function unbind() {
	if (!bound || surfaces.size) return;
	bound = false;
	window.removeEventListener("pointermove", onMove);
	unsubscribe?.(); unsubscribe = null;
	clearTimeout(settleTimer);
}

export function registerGlass(el) {
	if (!el) return () => {};
	const surface = { el, x: 0, y: 0, valid: false, active: false, changed: true };
	surfaces.add(surface);
	bind();
	dirty = true;
	wake();
	return () => { surfaces.delete(surface); unbind(); };
}