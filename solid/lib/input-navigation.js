const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const DIRECTIONS = new Set(["left", "right", "up", "down"]);

function center(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function isRendered(element) {
  if (!element?.getBoundingClientRect) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle?.(element);
  return style?.display !== "none" && style?.visibility !== "hidden";
}

export function isEditingTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(
    "input, textarea, select, [contenteditable='true'], [role='textbox'], .ql-editor"
  ));
}

export function focusableElements(root = document) {
  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
    if (!isRendered(element)) return false;
    if (element.closest("[inert], [aria-hidden='true']")) return false;
    return element.getAttribute("aria-disabled") !== "true";
  });
}

/**
 * Choose the closest focus target in a geometric direction.
 *
 * The primary-axis distance dominates. Cross-axis drift costs more, which
 * keeps repeated arrows moving through the same row/column instead of jumping
 * diagonally to a technically nearer control.
 */
export function findDirectionalTarget(current, direction, candidates) {
  if (!DIRECTIONS.has(direction) || !candidates?.length) return null;
  if (!current?.getBoundingClientRect) return candidates[0] || null;

  const origin = center(current.getBoundingClientRect());
  let best = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    if (candidate === current) continue;
    const point = center(candidate.getBoundingClientRect());
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;

    const primary = direction === "left" ? -dx
      : direction === "right" ? dx
        : direction === "up" ? -dy : dy;
    if (primary <= 1) continue;

    const cross = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
    const euclidean = Math.hypot(dx, dy);
    const score = primary + cross * 2.35 + euclidean * 0.08;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

export function activeNavigationModal(root = document) {
  const dialogs = [...root.querySelectorAll("[aria-modal='true'], dialog[open]")]
    .filter(isRendered);
  return dialogs[dialogs.length - 1] || null;
}

function firstViewportCandidate(candidates) {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return candidates.find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return rect.bottom > 0 && rect.right > 0
      && rect.top < viewportHeight && rect.left < viewportWidth;
  }) || candidates[0] || null;
}

export function moveDirectionalFocus(direction, root = document) {
  const scope = activeNavigationModal(root) || root;
  const candidates = focusableElements(scope);
  if (!candidates.length) return false;

  const ownerDocument = root.nodeType === 9 ? root : root.ownerDocument;
  const active = ownerDocument?.activeElement;
  const current = candidates.includes(active) ? active : null;
  const target = current
    ? findDirectionalTarget(current, direction, candidates)
    : firstViewportCandidate(candidates);

  if (!target) return false;
  target.focus({ preventScroll: true });
  target.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "auto" });
  return true;
}

function pressed(gamepad, index) {
  const button = gamepad?.buttons?.[index];
  return Boolean(button && (button.pressed || button.value > 0.62));
}

function dpadDirection(gamepad) {
  if (pressed(gamepad, 12) && !pressed(gamepad, 13)) return "up";
  if (pressed(gamepad, 13) && !pressed(gamepad, 12)) return "down";
  if (pressed(gamepad, 14) && !pressed(gamepad, 15)) return "left";
  if (pressed(gamepad, 15) && !pressed(gamepad, 14)) return "right";
  return null;
}

function primaryAxisDirection(gamepad, deadzone) {
  const horizontal = Number(gamepad?.axes?.[0]) || 0;
  const vertical = Number(gamepad?.axes?.[1]) || 0;
  const horizontalActive = Math.abs(horizontal) > deadzone;
  const verticalActive = Math.abs(vertical) > deadzone;

  if (!horizontalActive && !verticalActive) return null;
  if (horizontalActive && (!verticalActive || Math.abs(horizontal) > Math.abs(vertical))) {
    return horizontal < 0 ? "left" : "right";
  }
  return vertical < 0 ? "up" : "down";
}

/**
 * Normalize controller input to one menu direction per poll. The standard
 * mapping reserves axes 0/1 for the primary stick; scanning later axes also
 * reads right sticks and triggers as navigation on several controllers.
 */
export function readGamepadIntent(gamepad, deadzone = 0.55) {
  const direction = dpadDirection(gamepad) || primaryAxisDirection(gamepad, deadzone);
  const id = gamepad?.id || "";
  const gameCube = /gamecube|0079[-_: ]?1846|057e[-_: ]?0337/i.test(id);
  const nintendo = !gameCube && /nintendo|joy-?con|switch|057e/i.test(id);

  return {
    left: direction === "left",
    right: direction === "right",
    up: direction === "up",
    down: direction === "down",
    activate: gameCube || nintendo ? pressed(gamepad, 1) : pressed(gamepad, 0),
    back: gameCube ? pressed(gamepad, 2)
      : nintendo ? pressed(gamepad, 0) : pressed(gamepad, 1),
  };
}

export function shouldFireOnce(held, key, active) {
  if (!active) {
    held.delete(key);
    return false;
  }
  if (held.has(key)) return false;
  held.set(key, true);
  return true;
}

export function activateFocused(root = document) {
  const active = root.activeElement;
  if (!active || active === root.body || isEditingTarget(active)) return false;
  active.click?.();
  return true;
}

export const NAVIGATION_REPEAT = Object.freeze({
  initialDelay: 320,
  interval: 105,
});
