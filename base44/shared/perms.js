// Mirrors the site's permission model (see src/pages/Home.jsx) for the CLI.

export const SCHOOL_DOMAIN = '@montessoribkk.com';

const ROLE_RANK = { admin: 5, editor: 4, chair: 3, minutes: 3, teacher: 2, student: 1 };
const MANAGE_ROLES = ['admin', 'editor', 'chair', 'minutes', 'teacher'];

// Entities anyone signed in with a school account may edit (open widgets on the site).
const OPEN_ENTITIES = ['MissingItem', 'CalendarEvent'];
// Entities gated behind meeting mode (adding students, running the rotation).
const MEETING_ONLY = ['Member', 'JobAssignment'];

export async function resolveActor(sr, email) {
  const lower = String(email || '').trim().toLowerCase();
  const matches = (await sr.entities.Member.filter({ email: lower })) || [];
  const member = [...matches].sort((a, b) => (ROLE_RANK[b.role] || 0) - (ROLE_RANK[a.role] || 0))[0];
  const role = member?.role || 'student';
  const isSummerOrBenjamin = lower === 'summer@montessoribkk.com' || lower.includes('benjamin');
  const isMinutesTaker = matches.some((m) => m.role === 'minutes');
  return {
    email: lower,
    role,
    name: member?.name || '',
    canManage: MANAGE_ROLES.includes(role) || isMinutesTaker || isSummerOrBenjamin,
    canChangeRoles: isSummerOrBenjamin || isMinutesTaker,
  };
}

// Returns an error string, or null when the write is allowed.
export function checkWrite(actor, entity, action, data) {
  if (!actor.email.endsWith(SCHOOL_DOMAIN)) {
    return 'you must sign in with your ' + SCHOOL_DOMAIN + ' account to make changes';
  }
  if (entity === 'Member' && (action === 'delete' || (data && data.role))) {
    if (!actor.canChangeRoles) return 'only the minutes taker or an app owner can add, remove or re-role members';
  }
  if (!OPEN_ENTITIES.includes(entity) && !actor.canManage) {
    return 'your role (' + actor.role + ') cannot change ' + entity;
  }
  return null;
}

export function isMeetingGated(entity) {
  return MEETING_ONLY.includes(entity);
}