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
	const vh = window.innerHeight;
	const vw = window.innerWidth;
	for (const el of document.querySelectorAll(FOCUSABLE)) {
		const r = el.getBoundingClientRect();
		if (r.width < 4 || r.height < 4) continue;
		/* only consider what is on (or just off) the current screen */
		if (r.bottom < -vh || r.top > vh * 2) continue;
		if (r.right < 0 || r.left > vw) continue;
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

	/* nothing focused (or the body is) — start from the element nearest the
	   top of the viewport instead of measuring from the body's full-page rect */
	const has_current = current && current !== document.body && current !== document.documentElement;
	if (!has_current) {
		return targets.reduce((a, b) => {
			const ay = Math.abs(a.r.top);
			const by = Math.abs(b.r.top);
			return by < ay ? b : a;
		}).el;
	}

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