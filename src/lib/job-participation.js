// New exclusions are scoped to the app's Friday-anchored meeting week.
// Undated legacy exclusions remain explicit opt-outs until someone adds them.
export function participatesInJobs(member, week) {
  return member.job_rotation_excluded_week
    ? member.job_rotation_excluded_week !== week
    : member.job_rotation_enabled !== false;
}

export function jobParticipationUpdate(enabled, week) {
  // Removal is permanent until somebody re-adds the student: setting
  // job_rotation_enabled to false keeps them off the wheel in every future
  // week, so a removed student cannot reappear on their own after Sunday.
  return enabled
    ? { job_rotation_enabled: true, job_rotation_excluded_week: "" }
    : { job_rotation_enabled: false, job_rotation_excluded_week: "" };
}