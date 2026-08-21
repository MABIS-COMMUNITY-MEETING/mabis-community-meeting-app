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

export function moveDirectionalFocus(direction, root = document) {
  const candidates = focusableElements(root);
  if (!candidates.length) return false;

  const active = root.activeElement;
  const current = candidates.includes(active) ? active : null;
  const target = findDirectionalTarget(current, direction, candidates)
    || (current ? null : candidates[0]);

  if (!target) return false;
  target.focus({ preventScroll: true });
  target.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
  return true;
}

function pressed(gamepad, index) {
  const button = gamepad?.buttons?.[index];
  return Boolean(button && (button.pressed || button.value > 0.62));
}

function strongestAxis(axes, parity) {
  let value = 0;
  for (let index = parity; index < (axes?.length || 0); index += 2) {
    const next = Number(axes[index]) || 0;
    if (Math.abs(next) > Math.abs(value)) value = next;
  }
  return value;
}

/**
 * Standard mapping covers PS5, Xbox and Switch-class controllers. Raw axis
 * pairs are also scanned so common USB GameCube adapters remain usable when
 * the browser exposes them without the standard remap.
 */
export function readGamepadIntent(gamepad, deadzone = 0.55) {
  const horizontal = strongestAxis(gamepad?.axes, 0);
  const vertical = strongestAxis(gamepad?.axes, 1);
  const gameCube = /gamecube|0079[-_: ]?1846|057e[-_: ]?0337/i.test(gamepad?.id || "");

  return {
    left: pressed(gamepad, 14) || horizontal < -deadzone,
    right: pressed(gamepad, 15) || horizontal > deadzone,
    up: pressed(gamepad, 12) || vertical < -deadzone,
    down: pressed(gamepad, 13) || vertical > deadzone,
    activate: gameCube
      ? pressed(gamepad, 1) || pressed(gamepad, 0)
      : pressed(gamepad, 0),
    back: gameCube ? pressed(gamepad, 2) : pressed(gamepad, 1),
  };
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
