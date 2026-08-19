/**
 * Who may use the custom colour tools.
 *
 * The theme catalogue stays open to everyone. What is restricted here is the
 * "Make your own colors" surface and the saved palettes built with it —
 * arbitrary primary/secondary pairs, which sit outside the vetted palettes and
 * can be driven to combinations the contrast-safety maths cannot rescue.
 *
 * ONE predicate, in src/lib with the other preferences, because this has to be
 * asked in three unrelated places — the switcher UI, the boot-time replay, and
 * the account sync. Three inlined email comparisons would drift, and the one
 * that drifted would be the one still showing the controls.
 *
 * SCOPE, stated plainly: this is a UI availability rule, not a security
 * boundary. Custom colours are CSS custom properties in one browser's
 * localStorage; they affect nothing but that reader's own screen, are never
 * trusted by the backend, and anyone determined can set them from a console.
 * Gating the UI is the appropriate weight for a personal display preference —
 * do not mistake it for an authorisation check, and do not put anything behind
 * this that actually needs one.
 */

export const CUSTOM_COLOR_OWNER = "boss@montessoribkk.com";

/**
 * @param user the signed-in user, or null/undefined while auth is resolving
 * @returns true only for the owning account
 *
 * Unknown resolves to false: during the auth probe the controls stay hidden
 * and appear once the session lands, which is the right way round. The
 * opposite would flash the tools at everyone on every cold load.
 */
export function canUseCustomColors(user) {
  const email = user?.email;
  return typeof email === "string" && email.trim().toLowerCase() === CUSTOM_COLOR_OWNER;
}
