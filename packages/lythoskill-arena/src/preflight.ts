/**
 * preflight.ts — Arena agent-run pre-flight pure functions
 *
 * Extracted from cli.ts agentRun to enable unit testing.
 * All functions are pure: no filesystem IO, no spawn, no console.
 * IO is injected via function parameters (e.g., existsFn, readdirFn).
 */

// ── Types ─────────────────────────────────────────────────────────────────

/** A skill as declared in skill-deck.toml */
export interface SkillDecl {
  name: string       // TOML key (e.g., "pdf")
  path: string | null // explicit path from inline-table format; null for array format
  section: string    // "innate" | "tool" | "transient"
}

/** Result of checking one skill against the cold pool */
export interface SkillCheck {
  name: string
  expectedPath: string  // resolved cold pool path that was checked
  found: boolean
  section: string
}

/** Result of deck link validation */
export interface LinkResult {
  ok: boolean
  error?: string
}

/** A single file copy operation plan entry */
export interface CopyEntry {
  src: string
  dest: string
  name: string       // entry basename for error reporting
}

// ── parseDeckSkills ──────────────────────────────────────────────────────

/**
 * Parse a skill-deck.toml string and extract all declared skills.
 *
 * Handles both TOML formats:
 *   [tool.skills.pdf]          → { name: "pdf", path: "github.com/...", section: "tool" }
 *   path = "github.com/..."
 *
 *   skills = ["a", "b"]        → { name: "a", path: null, section: "tool" }
 *
 * Pure: string → SkillDecl[]. No IO, no Bun.TOML dependency (caller parses first).
 */
export function parseDeckSkills(
  deckParsed: Record<string, any>
): SkillDecl[] {
  const results: SkillDecl[] = []
  const sections = ['innate', 'tool', 'transient'] as const

  for (const section of sections) {
    const skills = deckParsed?.[section]?.skills
    if (!skills) continue

    if (Array.isArray(skills)) {
      // Array format: skills = ["name1", "name2"]
      for (const name of skills) {
        if (typeof name === 'string') {
          results.push({ name, path: null, section })
        }
      }
    } else if (typeof skills === 'object') {
      // Inline-table format: [tool.skills.name], path = "..."
      for (const [name, entry] of Object.entries(skills as Record<string, any>)) {
        const skillPath = typeof entry?.path === 'string' ? entry.path : null
        results.push({ name, path: skillPath, section })
      }
    }
  }

  return results
}

// ── checkSkillExistence ──────────────────────────────────────────────────

/**
 * Check each declared skill against the cold pool filesystem.
 *
 * For skills with explicit paths: resolve `<coldPoolDir>/<path>/SKILL.md`
 * For skills without paths (array format): resolve `<coldPoolDir>/<name>/SKILL.md`
 * Skills with HTTP/URL paths are skipped (not local).
 *
 * `existsFn` is the IO injection point — swap for real fs or mock.
 */
export function checkSkillExistence(
  skills: SkillDecl[],
  coldPoolDir: string,
  existsFn: (path: string) => boolean
): SkillCheck[] {
  return skills.map(skill => {
    const resolvedName = skill.path && !skill.path.startsWith('http')
      ? skill.path
      : skill.name
    const expectedPath = `${coldPoolDir}/${resolvedName}/SKILL.md`
    return {
      name: skill.name,
      expectedPath,
      found: existsFn(expectedPath),
      section: skill.section,
    }
  })
}

// ── validateLinkResult ───────────────────────────────────────────────────

/**
 * Validate the outcome of `bunx @lythos/skill-deck link`.
 *
 * Pure: (exitCode, stderr) → LinkResult.
 * Non-zero exit code = failure. Zero + no stderr = success.
 */
export function validateLinkResult(
  exitCode: number | null,
  stderr: string
): LinkResult {
  if (exitCode !== 0) {
    const snippet = (stderr || '').slice(0, 300)
    return {
      ok: false,
      error: `Deck link failed (exit ${exitCode}): ${snippet}`,
    }
  }
  return { ok: true }
}

// ── buildCopyPlan ────────────────────────────────────────────────────────

/**
 * Build a copy plan from workdir entries → outDir.
 *
 * Skips entries in `skipSet`. Each surviving entry maps to `<outDir>/<name>`.
 * Pure: strings + set → CopyEntry[]. No filesystem access.
 */
export function buildCopyPlan(
  workdir: string,
  outDir: string,
  entries: string[],
  skipSet: Set<string>
): CopyEntry[] {
  const plan: CopyEntry[] = []
  for (const name of entries) {
    if (skipSet.has(name)) continue
    plan.push({
      src: `${workdir}/${name}`,
      dest: `${outDir}/${name}`,
      name,
    })
  }
  return plan
}

// ── resolveColdPoolDir ───────────────────────────────────────────────────

/**
 * Resolve cold_pool root from deck config, expanding ~.
 *
 * Pure: string → string. No filesystem access.
 */
export function resolveColdPoolDir(
  coldPoolRoot: string | undefined,
  homeDir: string,
  fallbackDir: string
): string {
  const raw = coldPoolRoot || fallbackDir
  return raw.startsWith('~') ? `${homeDir}${raw.slice(1)}` : raw
}

// ── formatSkillWarnings ──────────────────────────────────────────────────

/**
 * Format skill check results into human-readable warning strings.
 *
 * Pure: SkillCheck[] → string[].
 */
export function formatSkillWarnings(checks: SkillCheck[]): string[] {
  return checks
    .filter(c => !c.found)
    .map(c => `Skill "${c.name}" declared in deck [${c.section}] but SKILL.md not found at: ${c.expectedPath}`)
}
