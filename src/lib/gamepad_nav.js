/*
 * Spatial focus navigation for gamepad input.
 *
 * Tab order is useless here — the editorial grid puts widgets side by side, so
 * pressing "right" must land on what is visually to the right. We score every
 * visible focusable by directional distance from the current rect.
 */

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function collect_targets() {
	const out = [];
	for (const el of document.querySelectorAll(FOCUSABLE)) {
		const r = el.getBoundingClientRect();
		if (r.width < 4 || r.height < 4) continue;
		if (el.closest("[aria-hidden='true']")) continue;
		const s = getComputedStyle(el);
		if (s.visibility === "hidden" || s.display === "none" || s.opacity === "0") continue;
		out.push({ el, r });
	}
	return out;
}

function center(r) {
	return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function find_neighbour(current, dir) {
	const targets = collect_targets();
	if (!targets.length) return null;
	if (!current) return targets[0].el;

	const from = center(current.getBoundingClientRect());
	let best = null;
	let best_score = Infinity;

	for (const t of targets) {
		if (t.el === current) continue;
		const c = center(t.r);
		const dx = c.x - from.x;
		const dy = c.y - from.y;

		let along, across;
		if (dir === "left" || dir === "right") {
			along = dir === "right" ? dx : -dx;
			across = Math.abs(dy);
		} else {
			along = dir === "down" ? dy : -dy;
			across = Math.abs(dx);
		}
		if (along <= 6) continue;

		/* penalise lateral drift so navigation stays in a visual lane */
		const score = along + across * 2.2;
		if (score < best_score) {
			best_score = score;
			best = t.el;
		}
	}
	return best;
}