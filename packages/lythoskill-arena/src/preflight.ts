/**
 * preflight.ts — Arena agent-run pre-flight pure functions
 *
 * Extracted from cli.ts agentRun to enable unit testing.
 * All functions are pure: no filesystem IO, no spawn, no console.
 * IO is injected via function parameters (e.g., existsFn, readdirFn).
 */

import { join } from 'node:path'
import { ColdPool, parseLocator } from '@lythos/cold-pool'

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
 * Path resolution delegates to @lythos/cold-pool's `parseLocator` and
 * `ColdPool.resolveDir` so localhost / FQ / standalone forms all map to
 * the right physical layout (per ADR-20260507021957847). Non-FQ legacy
 * names (e.g., bare `pdf`) fall back to `<coldPoolDir>/<name>/SKILL.md`.
 *
 * Skills with HTTP/URL paths are skipped (not local).
 *
 * `existsFn` is the IO injection point — swap for real fs or mock.
 */
export function checkSkillExistence(
  skills: SkillDecl[],
  coldPoolDir: string,
  existsFn: (path: string) => boolean
): SkillCheck[] {
  const pool = new ColdPool(coldPoolDir)
  return skills.map(skill => {
    const candidatePath = skill.path && !skill.path.startsWith('http')
      ? skill.path
      : skill.name

    let expectedPath: string
    const locator = parseLocator(candidatePath)
    if (!locator) {
      // Legacy bare-name fallback. Per ADR-20260502012643244 this should
      // be removed in 0.10.x once arena.toml authors switch to FQ.
      expectedPath = `${coldPoolDir}/${candidatePath}/SKILL.md`
    } else if (locator.isLocalhost) {
      // localhost layout: top-level dir under coldPool, no `localhost/` prefix
      expectedPath = `${pool.resolveDir(locator)}/SKILL.md`
    } else if (locator.skill) {
      expectedPath = `${pool.resolveDir(locator)}/${locator.skill}/SKILL.md`
    } else {
      // Standalone repo: SKILL.md at repo root
      expectedPath = `${pool.resolveDir(locator)}/SKILL.md`
    }

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
      src: join(workdir, name),
      dest: join(outDir, name),
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

// ── buildArchiveSidePlan ──────────────────────────────────────────────────

/**
 * A single side's source mapping in an archive plan.
 * Pure data — no IO, no console.
 */
export interface ArchiveSideEntry {
  side: string
  sourceDir: string
  found: boolean
}

/**
 * Build the per-side source directory plan for archive.
 *
 * Pure: strings + existence function → ArchiveSideEntry[].
 * IO (`existsSync`) is injected via `existsFn` — test with mock, run with real.
 *
 * Single-side fallback: when --sides specifies exactly one named side and its
 * subdirectory doesn't exist (agent put files in workdir root, prepare-workdir
 * didn't create per-side dirs), fall back to `fromDir` as source (found=true).
 *
 * Default (no --sides): sides = ['.'] → sourceDir = fromDir.
 */
export function buildArchiveSidePlan(
  fromDir: string,
  sides: string[],
  existsFn: (path: string) => boolean
): ArchiveSideEntry[] {
  const plan: ArchiveSideEntry[] = []
  for (const side of sides) {
    let sourceDir = side === '.' ? fromDir : join(fromDir, side)
    let found = existsFn(sourceDir)
    if (!found && sides.length === 1 && side !== '.') {
      sourceDir = fromDir
      found = true
    }
    plan.push({ side, sourceDir, found })
  }
  return plan
}

// ── parseDeckCombos ──────────────────────────────────────────────────────

/**
 * Parse `[combo.<name>] prompt = "..."` sections from a parsed deck TOML.
 *
 * Combos are orchestration playbooks for the AGENT — the CLI never executes
 * them (deck consumption contract, packages/lythoskill-deck/skill/SKILL.md).
 * Returns combo names in declaration order so generated orientation docs
 * (AGENTS.md) can point the agent at them before anything else.
 *
 * Pure: Record → string[]. No IO.
 */
export function parseDeckCombos(
  deckParsed: Record<string, any>
): string[] {
  const combo = deckParsed?.combo
  if (!combo || typeof combo !== 'object') return []
  return Object.keys(combo).filter(k => k !== 'prompt')
}

// ── Decision logs: per-cell naming + collect-time merge ──────────────────
//
// Why per-cell names (TASK-20260909010121918): the 2026-09-09 run had five cells
// per side sharing one workdir, each mandated to write `decision-log.jsonl`.
// Filename is a constant, so the cells shared a path — last writer won, and
// side-a kept only S1a's 9 entries. A per-cell filename removes the shared path
// entirely: no write contention, no ordering assumption, no atomicity needed.
// Rejected alternative (append-only read-then-append in one op) stays racy on
// any multi-step append and silently depends on every agent obeying it.

/** Legacy name — a workdir with exactly one decision-writing cell. */
export const LEGACY_DECISION_LOG = 'decision-log.jsonl'

/**
 * Cell id → its own decision-log filename.
 *
 * The id is slugged to `[A-Za-z0-9_-]`: no `/` or `\` (an id cannot write
 * outside the workdir or into a subdirectory) and no `.` (the result can never
 * be `.`/`..` or a hidden file). Empty/absent id → the legacy single-cell name.
 *
 * Pure: string → string. No IO.
 */
export function decisionLogName(cellId?: string): string {
  if (!cellId) return LEGACY_DECISION_LOG
  const slug = cellId.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  return slug ? `decision-log-${slug}.jsonl` : LEGACY_DECISION_LOG
}

/** True for `decision-log.jsonl` and `decision-log-<cell-id>.jsonl` alike. */
export function isDecisionLogName(name: string): boolean {
  return /^decision-log(-[^/]+)?\.jsonl$/.test(name)
}

/** One cell's log, as read from disk. `cell` is the id used for merge order. */
export interface DecisionLogSource {
  cell: string
  content: string
}

/**
 * Merge per-cell decision logs into one JSONL stream.
 *
 * Lossless by construction: every non-empty line of every source is kept
 * verbatim (no dedupe, no field injection, no JSON re-parse), sources ordered
 * by cell id so the same inputs always produce the same bytes. The per-cell
 * files are NOT consumed — they stay as provenance, since a merged line carries
 * no cell attribution and `t` is cell-relative, not a wall clock.
 *
 * Pure: DecisionLogSource[] → string. No IO.
 */
export function mergeDecisionLogs(sources: DecisionLogSource[]): string {
  const ordered = [...sources].sort((a, b) => (a.cell < b.cell ? -1 : a.cell > b.cell ? 1 : 0))
  const lines: string[] = []
  for (const source of ordered) {
    for (const line of source.content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed) lines.push(trimmed)
    }
  }
  return lines.length > 0 ? lines.join('\n') + '\n' : ''
}

// ── buildAgentsMd ────────────────────────────────────────────────────────

/**
 * Build the unified arena workdir AGENTS.md — the agent's orientation artifact.
 *
 * Single source of truth for the template; all three write sites use it:
 *   - prepare-workdir (buildPreparePlan)
 *   - single (cli.ts agent-run)
 *   - A/B runner cells (runner.ts)
 *
 * F1 (TASK-20260909152255103): combo sections are surfaced FIRST when present —
 * they are the best orientation artifact in the deck. F3: first-timer
 * vocabulary glossed here (the one tool-level place; the full glossary lives
 * in the deck skill's references/glossary.md).
 *
 * Pure: strings → string. No IO.
 */
export function buildAgentsMd(params: {
  mode: string
  headerLines?: string[]
  combos?: string[]
}): string {
  const lines: string[] = [
    '# Arena Test Environment',
    `**Mode**: ${params.mode}`,
    ...(params.headerLines ?? []),
    '',
  ]

  if (params.combos && params.combos.length > 0) {
    lines.push(
      '## Combos — Read These First',
      'This deck has combo prompts in `skill-deck.toml`. They are YOUR orchestration',
      'playbook: each `[combo.<name>] prompt` is read and executed by YOU (the agent) —',
      'the CLI only parses them; nothing runs them. Open `skill-deck.toml` and follow',
      'each combo in order:',
      ...params.combos.map(name => `- \`${name}\``),
      '',
    )
  }

  lines.push(
    '## Setup Order (why this sequence)',
    '1. `skill-deck.toml` copied here → declares which skills you can use',
    '2. `deck link` runs → cold pool skills become visible in the working set',
    '3. Skill existence checked → warns if any declared skill is missing from cold pool',
    '4. `AGENTS.md` written last → confirms setup succeeded before agent starts',
    'If setup fails mid-sequence, the workdir is incomplete and nothing runs.',
    '',
    '## Vocabulary (first time here?)',
    '- **cold pool** — where skill sources live on disk. You never read it directly.',
    '- **working set** — `.claude/skills/`: the symlinks you actually see. `deck link` keeps it matching the deck.',
    '- **innate** — always-on skills (governance, meta). **tool** — skills you load on demand.',
    '- **max_cards** — hard budget in the toml; `deck link` refuses to exceed it.',
    '',
    '## How This Works',
    '- Write ALL output files to this directory (CWD).',
    '- Use available skills — check the working set directory (e.g. `ls .claude/skills/`).',
    '',
    '## Output Contract',
    '- MANDATORY: `decision-log.jsonl` — one JSON line per decision:',
    '  `{"t":<seconds>,"phase":"setup|content|design|output","decision":"...","reason":"..."}`',
    '- MANDATORY when other cells share this directory: name yours',
    '  `decision-log-<cell-id>.jsonl` (`decision-log-s1a.jsonl`) instead. Two cells on one',
    '  filename means last-writer-wins — one cell\'s whole trail is erased. Per-cell names',
    '  never collide, and the run merges them into one `decision-log.jsonl` when it collects.',
  )

  return lines.join('\n')
}

// ── buildPreparePlan ─────────────────────────────────────────────────────

/**
 * Plan-only result for prepare-workdir — what WOULD be created.
 * Pure data, no IO. Caller renders this before executing.
 */
export interface PreparePlan {
  deckPath: string
  deckContent: string
  workDir: string
  skills: SkillDecl[]
  hasSkills: boolean
  agentsMd: string
}

/**
 * Build the prepare-workdir plan from raw inputs.
 *
 * Pure computation: deck path + content → what workdir would contain.
 * Caller does IO (reading deck, computing timestamp) and injects results.
 */
export function buildPreparePlan(params: {
  deckPath: string
  deckContent: string
  workDir: string
  skillCount: number
  brief?: string
}): PreparePlan {
  let deckParsed: Record<string, any> = {}
  try { deckParsed = Bun.TOML.parse(params.deckContent) as Record<string, any> } catch {}
  const skills = parseDeckSkills(deckParsed)
  const hasSkills = skills.length > 0

  const agentsMd = buildAgentsMd({
    mode: 'agent-orchestrated cell',
    combos: parseDeckCombos(deckParsed),
  })

  return { deckPath: params.deckPath, deckContent: params.deckContent, workDir: params.workDir, skills, hasSkills, agentsMd }
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
