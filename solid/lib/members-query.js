import { base44 } from "@/api/base44Client";

/*
 * One roster read shared by Home's warm-up and its live query.
 *
 * Member rows do not use Base44's audit metadata. Asking only for the fields
 * the UI reads reduces response bytes, JSON parsing, and cache memory without
 * changing the records any Home widget receives.
 */
export const MEMBER_QUERY_KEY = ["members"];

const MEMBER_FIELDS = [
  "id",
  "name",
  "email",
  "role",
  "avatar_url",
  "avatar_color",
  "job_rotation_enabled",
];

export function listMembers() {
  return base44.entities.Member.list("name", 200, undefined, MEMBER_FIELDS);
}
