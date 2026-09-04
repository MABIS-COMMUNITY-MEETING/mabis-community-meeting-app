export const SCHOOL_EMAIL_DOMAIN = "montessoribkk.com";
export const SCHOOL_EMAIL_REQUIRED_REASON = "school_email_required";

export function isMabisSchoolEmail(email) {
  if (typeof email !== "string") return false;

  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2
    && parts[0].length > 0
    && parts[1] === SCHOOL_EMAIL_DOMAIN;
}
