/**
 * Validates a skill name against the lythoskill naming convention.
 *
 * Rules:
 * - Must start with a lowercase letter [a-z]
 * - May contain lowercase letters, digits, and single hyphens between segments
 * - Must not start or end with a hyphen
 * - Must not contain consecutive hyphens
 * - All lowercase ASCII only
 */
export function isValidSkillName(name: string): boolean {
  if (typeof name !== 'string') return false
  return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)
}
