// Member identity resolution.
//
// A person can hold more than one Member row (duplicates get created when a
// role is reassigned without demoting the previous holder). Two different
// people can also share a display name. Matching on `name` alone therefore
// resolves the wrong person in both directions, which is how a minutes taker
// ends up rendered as a student.
//
// Rules, in order:
//   1. Email is authoritative whenever both sides have one.
//   2. Name is only a fallback for rows that carry no email at all.
//   3. When several rows describe one person, the highest-ranked role wins.

const ROLE_RANK = {
  admin: 5,
  editor: 4,
  chair: 3,
  minutes: 3,
  teacher: 2,
  student: 1,
};

const normalize = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

export function roleRank(role) {
  return ROLE_RANK[role] || 0;
}

/** Stable key for "these rows are the same person". */
export function identityKey(member) {
  const email = normalize(member?.email);
  if (email) return `email:${email}`;
  const name = normalize(member?.name);
  if (name) return `name:${name}`;
  return `id:${member?.id ?? ""}`;
}

/**
 * Does this Member row describe the signed-in user?
 * Email wins when both sides have one, so two people called "Olivia" with
 * different addresses never match each other.
 */
export function matchesUser(member, user) {
  if (!member || !user) return false;

  const memberEmail = normalize(member.email);
  const userEmail = normalize(user.email);
  if (memberEmail && userEmail) return memberEmail === userEmail;

  const memberName = normalize(member.name);
  const userName = normalize(user.full_name);
  return Boolean(memberName && userName && memberName === userName);
}

/** Every row belonging to the signed-in user. */
export function matchingMembers(members, user) {
  return (members || []).filter((member) => matchesUser(member, user));
}

/** The row that should speak for a person — highest role wins. */
export function primaryMember(members) {
  if (!members?.length) return undefined;
  return [...members].sort((a, b) => roleRank(b.role) - roleRank(a.role))[0];
}

/**
 * One row per person, keeping each person's highest-ranked role.
 * Use anywhere a human-facing list must not show the same person twice.
 */
export function dedupeByIdentity(members) {
  const byIdentity = new Map();
  for (const member of members || []) {
    const key = identityKey(member);
    const seen = byIdentity.get(key);
    if (!seen || roleRank(member.role) > roleRank(seen.role)) byIdentity.set(key, member);
  }
  return [...byIdentity.values()];
}

/** Every row that describes the same person as `member` (including itself). */
export function sameIdentityRows(members, member) {
  if (!member) return [];
  const key = identityKey(member);
  return (members || []).filter((candidate) => identityKey(candidate) === key);
}

/** Every row currently holding `role`, not just the first one found. */
export function membersWithRole(members, role) {
  return (members || []).filter((member) => member.role === role);
}
