/*
 * "B / Circle = go back" — one predictable chain for the whole UI.
 *
 * Priority: close the top-most overlay → leave the entered section → leave the
 * page. Overlays are closed the same way a mouse would (their own close
 * control) so widget full-screen views and modals all respond, with Escape as
 * the fallback for anything listening for it.
 */

const OVERLAY_SELECTOR = '[role="dialog"], [data-gp-overlay], .fixed.inset-0';
const CLOSE_SELECTOR =
	'[data-gp-close], button[aria-label*="close" i], button:has(svg.lucide-x), button:has(svg.lucide-arrow-left)';

function visible(el) {
	const r = el.getBoundingClientRect();
	if (r.width < 40 || r.height < 40) return false;
	const s = getComputedStyle(el);
	return !(s.visibility === "hidden" || s.display === "none" || s.opacity === "0");
}

export function top_overlay() {
	const all = Array.from(document.querySelectorAll(OVERLAY_SELECTOR)).filter(visible);
	return all.length ? all[all.length - 1] : null;
}

/* returns true when something was handled */
export function gamepad_back({ entered, exit_section, leave_page }) {
	const overlay = top_overlay();
	if (overlay) {
		let closer = null;
		try { closer = overlay.querySelector(CLOSE_SELECTOR); } catch { closer = null; }
		(closer || overlay).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		if (closer) closer.click();
		return true;
	}

	document.activeElement?.dispatchEvent?.(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
	);

	if (entered) {
		exit_section();
		return true;
	}

	document.activeElement?.blur?.();
	leave_page();
	return true;
}