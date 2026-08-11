// Display name helper:
// - Teachers: full name as entered
// - Students: nickname (text inside brackets) if present, else FIRST name only (no last name)
export function displayName(member) {
  if (!member) return "?";
  if (member.role === "teacher") return member.name;
  // Lock in titled names (Ms/Mr/Mrs/Dr) even after a role change
  if (/^(Ms\.?|Mrs\.?|Mr\.?|Dr\.?)\b/i.test(member.name)) return member.name;
  const match = member.name.match(/\((.*?)\)/);
  if (match) return match[1].trim();
  return member.name.split(" ")[0];
}