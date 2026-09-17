// New exclusions are scoped to the app's Friday-anchored meeting week.
// Undated legacy exclusions remain explicit opt-outs until someone adds them.
export function participatesInJobs(member, week) {
  return member.job_rotation_excluded_week
    ? member.job_rotation_excluded_week !== week
    : member.job_rotation_enabled !== false;
}

export function jobParticipationUpdate(enabled, week) {
  return {
    job_rotation_enabled: true,
    job_rotation_excluded_week: enabled ? "" : week,
  };
}
