export const PREFS_READY_EVENT = "mabis-ui-prefs-ready";

let readyUserId = null;

/*
 * The account preference pull is asynchronous and lives above the router.
 * A new-user surface must not infer "no preference" until that pull has
 * finished, or a returning person sees onboarding while their saved choice is
 * still in flight. Module state covers Home mounting after the event; the
 * event covers Home already being mounted when the pull finishes.
 */
export function arePrefsReady(userId) {
  return Boolean(userId && readyUserId === userId);
}

export function markPrefsReady(userId) {
  if (!userId) return;
  readyUserId = userId;
  window.dispatchEvent(new CustomEvent(PREFS_READY_EVENT, {
    detail: { userId },
  }));
}

export function resetPrefsReady(userId) {
  if (!userId || readyUserId === userId) readyUserId = null;
}
