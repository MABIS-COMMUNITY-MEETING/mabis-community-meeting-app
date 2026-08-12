/*
 * Focus model for gamepad input.
 *
 * Two levels:
 *   section level — up/down steps through the numbered editorial blocks
 *                   ([data-gp-section]) in strict document order, tracked by
 *                   index so a re-render can never make the walk jump.
 *   control level — after confirming on a section, focus moves spatially
 *                   between that section's own controls.
 */

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="checkbox"], [role="tab"], [data-gp-click]';

export const SECTION_SELECTOR = "[data-gp-section]";

function visible(el, r) {
	if (r.width < 4 || r.height < 4) return false;
	if (el.closest("[aria-hidden='true']")) return false;
	const s = getComputedStyle(el);
	return !(s.visibility === "hidden" || s.display === "none" || s.opacity === "0");
}

/* focusable controls, optionally restricted to one scope element */
export function collect_targets(scope) {
	const root = scope || document;
	const out = [];
	const vh = window.innerHeight;
	const vw = window.innerWidth;
	for (const el of root.querySelectorAll(FOCUSABLE)) {
		if (el.hasAttribute("data-gp-section")) continue;
		const r = el.getBoundingClientRect();
		if (!visible(el, r)) continue;
		if (!scope) {
			if (r.bottom < -vh || r.top > vh * 2) continue;
			if (r.right < 0 || r.left > vw) continue;
		}
		out.push({ el, r });
	}
	return out;
}

/* every section, in document order */
export function collect_sections() {
	const out = [];
	for (const el of document.querySelectorAll(SECTION_SELECTOR)) {
		const r = el.getBoundingClientRect();
		if (visible(el, r)) out.push(el);
	}
	return out;
}

/* index of the section nearest the top of the viewport — the entry point */
export function nearest_section_index() {
	const sections = collect_sections();
	if (!sections.length) return -1;
	let best = 0;
	let best_d = Infinity;
	sections.forEach((el, i) => {
		const d = Math.abs(el.getBoundingClientRect().top - 80);
		if (d < best_d) { best_d = d; best = i; }
	});
	return best;
}

export function section_at(index) {
	const sections = collect_sections();
	if (!sections.length) return null;
	return sections[Math.max(0, Math.min(index, sections.length - 1))] || null;
}

export function section_count() {
	return collect_sections().length;
}

export function index_of_section(el) {
	return collect_sections().indexOf(el);
}

function center(r) {
	return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/* control level — spatial pick within the given scope */
export function find_neighbour(current, dir, scope) {
	const targets = collect_targets(scope);
	if (!targets.length) return null;

	const has_current = current && targets.some((t) => t.el === current);
	if (!has_current) {
		return targets.reduce((a, b) => (Math.abs(b.r.top) < Math.abs(a.r.top) ? b : a)).el;
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

		const score = along + across * 2.2;
		if (score < best_score) { best_score = score; best = t.el; }
	}
	return best;
}

export function first_in_section(section) {
	const targets = collect_targets(section);
	if (!targets.length) return null;
	return targets.reduce((a, b) => (b.r.top < a.r.top ? b : a)).el;
}