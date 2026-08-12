/*
 * Spatial focus navigation for gamepad input.
 *
 * Navigation is two-level: at rest the stick moves between SECTIONS (the
 * numbered editorial blocks), and only after the user confirms on a section
 * does focus drop into that section's controls — so scrolling past 01 never
 * silently lands you on a button inside 10.
 *
 * Tab order is useless for the inner level — the editorial grid puts widgets
 * side by side, so "right" must land on what is visually to the right. Every
 * candidate is scored by directional distance from the current rect.
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

/* focusable controls, optionally restricted to one section */
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
			/* unscoped: only what is on (or just off) the current screen */
			if (r.bottom < -vh || r.top > vh * 2) continue;
			if (r.right < 0 || r.left > vw) continue;
		}
		out.push({ el, r });
	}
	return out;
}

export function collect_sections() {
	const out = [];
	for (const el of document.querySelectorAll(SECTION_SELECTOR)) {
		const r = el.getBoundingClientRect();
		if (visible(el, r)) out.push({ el, r });
	}
	return out;
}

function center(r) {
	return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function pick(targets, current, dir) {
	if (!targets.length) return null;

	const has_current =
		current && current !== document.body && current !== document.documentElement &&
		targets.some((t) => t.el === current);

	/* nothing focused yet — start from whatever sits nearest the top of the view */
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

		/* penalise lateral drift so navigation stays in a visual lane */
		const score = along + across * 2.2;
		if (score < best_score) {
			best_score = score;
			best = t.el;
		}
	}
	return best;
}

/* section level — up/down walks the numbered blocks in document order.
   `fallback_index` keeps the walk stable when the previously focused section
   was replaced by a re-render (otherwise focus jumps to whatever is on screen). */
export function find_section(current, dir, fallback_index = -1) {
	const sections = collect_sections();
	if (!sections.length) return null;
	let i = sections.findIndex((s) => s.el === current);
	if (i === -1 && fallback_index >= 0) i = Math.min(fallback_index, sections.length - 1);
	if (i === -1) {
		/* enter the list at the section nearest the top of the viewport */
		return sections.reduce((a, b) => (Math.abs(b.r.top) < Math.abs(a.r.top) ? b : a)).el;
	}
	if (dir === "down" || dir === "right") return sections[Math.min(i + 1, sections.length - 1)].el;
	return sections[Math.max(i - 1, 0)].el;
}

/* control level — spatial, restricted to the entered section */
export function find_neighbour(current, dir, scope) {
	return pick(collect_targets(scope), current, dir);
}

export function section_index(el) {
	return collect_sections().findIndex((s) => s.el === el);
}

export function first_in_section(section) {
	const targets = collect_targets(section);
	if (!targets.length) return null;
	return targets.reduce((a, b) => (b.r.top < a.r.top ? b : a)).el;
}

/* Predictable controller navigation: follow the same DOM order as keyboard Tab.
   Both down/right advance; up/left go back. The list is rebuilt on each move so
   dialogs, menus, and disabled controls are handled immediately. */
export function find_ordered_target(current, dir) {
	const targets = collect_targets().map(({ el }) => el);
	if (!targets.length) return null;
	const index = targets.indexOf(current);
	if (index === -1) return targets[0];
	const step = dir === "down" || dir === "right" ? 1 : -1;
	return targets[Math.max(0, Math.min(targets.length - 1, index + step))];
}