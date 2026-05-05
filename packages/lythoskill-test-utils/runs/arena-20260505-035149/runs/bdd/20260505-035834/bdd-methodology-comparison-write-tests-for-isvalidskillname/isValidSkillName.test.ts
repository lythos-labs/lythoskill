import { describe, test, expect } from 'bun:test'
import { isValidSkillName } from './isValidSkillName'

// ── Discovery: Skill Name Validation ────────────────────────────────────────
//
// Valid skill names follow lowercase kebab-case:
//   - Must start with a lowercase letter [a-z]
//   - May contain lowercase letters, digits, and hyphens
//   - Must not start or end with a hyphen
//   - Must not contain consecutive hyphens
//   - Must not be empty or whitespace-only
//   - Must be all lowercase (no uppercase letters)
//
// Edge cases identified:
//   - Empty/whitespace strings
//   - Leading/trailing hyphens
//   - Consecutive hyphens
//   - Uppercase letters
//   - Special characters (underscores, spaces, dots, emoji)
//   - Leading digits
//   - Single-character names
//   - Numeric-only segments
//   - Non-ASCII characters

describe('isValidSkillName', () => {

  // ── Valid cases ──────────────────────────────────────────────────────────

  test('accepts a basic kebab-case skill name', () => {
    // Given a standard lowercase kebab-case skill name
    // When isValidSkillName is called
    // Then it returns true
    expect(isValidSkillName('lythoskill-arena')).toBe(true)
  })

  test('accepts a single letter name', () => {
    // Given a minimal single-letter name
    // When isValidSkillName is called
    // Then it returns true (minimum 1 character, starts with letter)
    expect(isValidSkillName('x')).toBe(true)
  })

  test('accepts a name with multiple hyphen-separated segments', () => {
    // Given a name with several kebab-case segments
    // When isValidSkillName is called
    // Then it returns true
    expect(isValidSkillName('bdd-methodology-comparison')).toBe(true)
  })

  test('accepts combo-prefixed skill names', () => {
    // Given a skill name following the combo- naming convention
    // When isValidSkillName is called
    // Then it returns true (combo- is a valid prefix, not a format restriction)
    expect(isValidSkillName('combo-web-search')).toBe(true)
  })

  test('accepts names with digits', () => {
    // Given a name containing numeric segments
    // When isValidSkillName is called
    // Then it returns true (digits are allowed after the first character)
    expect(isValidSkillName('skill2-market')).toBe(true)
  })

  test('accepts a purely alphabetic name without hyphens', () => {
    // Given a name without any hyphens
    // When isValidSkillName is called
    // Then it returns true
    expect(isValidSkillName('curator')).toBe(true)
  })

  test('accepts a name with a numeric segment', () => {
    // Given a name where a segment is purely numeric
    // When isValidSkillName is called
    // Then it returns true (e.g. versioned or numbered skills)
    expect(isValidSkillName('test-001')).toBe(true)
  })

  // ── Invalid: empty / whitespace ───────────────────────────────────────────

  test('rejects an empty string', () => {
    // Given an empty string
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName('')).toBe(false)
  })

  test('rejects a whitespace-only string', () => {
    // Given a string with only spaces
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName('   ')).toBe(false)
  })

  test('rejects a string with internal spaces', () => {
    // Given a name containing a space between segments
    // When isValidSkillName is called
    // Then it returns false (hyphens only, no spaces)
    expect(isValidSkillName('my skill')).toBe(false)
  })

  test('rejects leading whitespace', () => {
    // Given a name with leading whitespace
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName(' skill-name')).toBe(false)
  })

  test('rejects trailing whitespace', () => {
    // Given a name with trailing whitespace
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName('skill-name ')).toBe(false)
  })

  // ── Invalid: hyphen placement ─────────────────────────────────────────────

  test('rejects a leading hyphen', () => {
    // Given a name starting with a hyphen
    // When isValidSkillName is called
    // Then it returns false (segments must start with a letter)
    expect(isValidSkillName('-skill')).toBe(false)
  })

  test('rejects a trailing hyphen', () => {
    // Given a name ending with a hyphen
    // When isValidSkillName is called
    // Then it returns false (segments must end with letter or digit)
    expect(isValidSkillName('skill-')).toBe(false)
  })

  test('rejects consecutive hyphens', () => {
    // Given a name with double hyphens
    // When isValidSkillName is called
    // Then it returns false (kebab-case has single hyphens)
    expect(isValidSkillName('skill--name')).toBe(false)
  })

  test('rejects name that is only a hyphen', () => {
    // Given a single hyphen
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName('-')).toBe(false)
  })

  // ── Invalid: uppercase ────────────────────────────────────────────────────

  test('rejects a name with uppercase letters', () => {
    // Given a name in PascalCase
    // When isValidSkillName is called
    // Then it returns false (only lowercase allowed)
    expect(isValidSkillName('MySkill')).toBe(false)
  })

  test('rejects ALL-CAPS name', () => {
    // Given a name in all uppercase
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName('SKILL')).toBe(false)
  })

  test('rejects mixed-case name', () => {
    // Given a name with mixed casing
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName('skillName')).toBe(false)
  })

  // ── Invalid: leading digits ───────────────────────────────────────────────

  test('rejects a name starting with a digit', () => {
    // Given a name whose first character is a number
    // When isValidSkillName is called
    // Then it returns false (must start with a letter)
    expect(isValidSkillName('123-skill')).toBe(false)
  })

  test('rejects a purely numeric name', () => {
    // Given a string of only digits
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName('123')).toBe(false)
  })

  // ── Invalid: special characters ───────────────────────────────────────────

  test('rejects a name with underscores', () => {
    // Given a snake_case name
    // When isValidSkillName is called
    // Then it returns false (kebab-case only, no underscores)
    expect(isValidSkillName('my_skill')).toBe(false)
  })

  test('rejects a name with dots', () => {
    // Given a dot-separated name
    // When isValidSkillName is called
    // Then it returns false (dots are for hostname scoping, not in names)
    expect(isValidSkillName('my.skill')).toBe(false)
  })

  test('rejects a name with special characters', () => {
    // Given a name containing punctuation
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName('skill!name')).toBe(false)
  })

  test('rejects a name with @ symbol', () => {
    // Given a name containing @
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName('skill@scope')).toBe(false)
  })

  test('rejects a name with emoji', () => {
    // Given a name containing emoji characters
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName('cool-skill🚀')).toBe(false)
  })

  test('rejects a name with Chinese characters', () => {
    // Given a name with non-ASCII characters
    // When isValidSkillName is called
    // Then it returns false (ASCII only)
    expect(isValidSkillName('技能-name')).toBe(false)
  })

  // ── Boundary / defensive ──────────────────────────────────────────────────

  test('accepts a long but valid name', () => {
    // Given a long kebab-case name
    // When isValidSkillName is called
    // Then it returns true (no arbitrary length limit)
    const long = 'a' + '-b'.repeat(50)
    expect(isValidSkillName(long)).toBe(true)
  })

  test('rejects an empty-looking string with tabs', () => {
    // Given a string with only tab characters
    // When isValidSkillName is called
    // Then it returns false
    expect(isValidSkillName('\t\t')).toBe(false)
  })
})
