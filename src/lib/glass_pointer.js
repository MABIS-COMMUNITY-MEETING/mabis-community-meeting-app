/*
 * One pointer system for every glass surface.
 *
 * A single passive mousemove listener feeds a shared rAF loop; surfaces
 * register themselves and are written to only while the loop is awake and
 * only when their values actually changed. No per-element listeners, no
 * layout reads outside the frame, and the loop parks itself the moment the
 * pointer stops moving.
 */

const surfaces = new Set();
let px = 0, py = 0, lastX = 0, lastY = 0, speed = 0;
let raf = null, idle = 0, bound = false;

function onMove(e) {
	px = e.clientX;
	py = e.clientY;
	wake();
}

function wake() {
	idle = 0;
	if (raf === null) raf = requestAnimationFrame(loop);
}

function loop() {
	const dx = px - lastX, dy = py - lastY;
	lastX = px; lastY = py;
	/* eased velocity — decays back to rest so transient effects settle */
	speed += (Math.hypot(dx, dy) - speed) * 0.25;
	const fast = speed > 14 ? "1" : "0";

	for (const el of surfaces) {
		const r = el.getBoundingClientRect();
		if (!r.width) continue;
		/* clamp a little outside the box so the highlight slides off the
		   edge instead of snapping when the pointer leaves */
		const x = Math.max(-30, Math.min(px - r.left, r.width + 30));
		const y = Math.max(-30, Math.min(py - r.top, r.height + 30));
		el.style.setProperty("--glass_pointer_x", `${x}px`);
		el.style.setProperty("--glass_pointer_y", `${y}px`);
		if (el.dataset.glassFast !== fast) el.dataset.glassFast = fast;
	}

	idle += 1;
	if (idle > 40 && speed < 0.5) { raf = null; return; }
	raf = requestAnimationFrame(loop);
}

export function registerGlass(el) {
	if (!el) return () => {};
	if (!bound) {
		bound = true;
		window.addEventListener("mousemove", onMove, { passive: true });
	}
	surfaces.add(el);
	wake();
	return () => surfaces.delete(el);
}