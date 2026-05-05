// ── Curator core: pure functions extracted from CLI ────────────────────────
// Architecture: Feed → Cold Pool → Working Set
//
//   Feeds (Layer -1)     Cold Pool (Layer 0)     Working Set (Layer 1)
//   ────────────────     ───────────────────     ──────────────────────
//   LobeHub trending     ~/.agents/skill-repos/   .claude/skills/
//   GitHub search        ├── github.com/...       ├── deck -> cold pool
//   agentskill.sh        ├── localhost/...        └── (deny-by-default)
//   skills.sh            └── ...
//   npm registry
//
//   FeedAdapter wraps heterogeneous upstream sources (REST, GraphQL, HTML scrape)
//   into uniform FeedItem[]. The agent reviews candidates → curator add → cold pool.
//   Cold pool is the local cache (like ~/.m2/repository). Feed is the remote mirror
//   (like Maven Central / Nexus). Agent's superpower: wrapping disparate APIs into
//   one interface — no need for every source to be a Maven repo.
//
// Future: remote feed adapters (LobeHub, agentskill.sh, GitHub) unite under FeedAdapter.

// ── Layer -1: Feed — upstream discovery source ───────────────────────────────

export interface Feed {
  type: 'github' | 'marketplace' | 'lobehub' | 'npm' | 'url'
  locator: string           // URL, org/repo, or registry identifier
  label: string             // human-readable name
}

export interface FeedItem {
  locator: string           // how to download (e.g. github.com/owner/repo)
  name: string
  description: string
  source: string            // which feed discovered it (e.g. "lobehub")
}

export interface FeedAdapter {
  readonly feed: Feed
  /** Discover candidate skills from this feed. Pure planner: no mutation. */
  discover(): Promise<FeedItem[]>
}

// ── Layer 0: Cold Pool — local skill cache ───────────────────────────────────

export interface ColdPool {
  path: string              // ~/.agents/skill-repos
}

export interface SkillItem {
  path: string              // absolute path in cold pool
  source: string            // inferred: "github.com/owner/repo" or "localhost"
  name: string
  relPath: string           // relative to cold pool root
}

/** Scan the cold pool filesystem for skill directories. Synchronous — local IO. */
export function scanColdPool(poolPath: string): SkillItem[] {
  const dirs = findSkillDirs(poolPath)
  return dirs.map(dir => ({
    path: dir,
    source: inferSource(dir),
    name: basename(dir),
    relPath: dir.slice(poolPath.length + 1),
  }))
}

// ── Frontmatter parser ─────────────────────────────────────────────────────

export function parseFrontmatter(text: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) return { frontmatter: {}, body: text }
  // YAML parsing requires yaml dep; caller handles
  const raw = match[1]
  const body = match[2].trim()
  return { frontmatter: { _raw: raw }, body }
}

// ── Source inference ───────────────────────────────────────────────────────

export function inferSource(path: string): string {
  const parts = path.split('/')
  const ghIdx = parts.indexOf('github.com')
  if (ghIdx >= 0 && ghIdx + 2 < parts.length) {
    return `github.com/${parts[ghIdx + 1]}/${parts[ghIdx + 2]}`
  }
  const localhostIdx = parts.indexOf('localhost')
  if (localhostIdx >= 0) {
    return 'localhost'
  }
  return parts.slice(0, -1).join('/') || 'unknown'
}

// ── Extract quoted phrases (for search indexing) ───────────────────────────

export function extractQuotedPhrases(text: string): string[] {
  const phrases: string[] = []
  const regex = /"([^"]+)"/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    phrases.push(match[1].trim())
  }
  return [...new Set(phrases)]
}

// ── Skill directory finder ──────────────────────────────────────────────────

import { readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

const SKIP_DIRS = new Set(['node_modules', '.git', '.claude', '.cortex', '.lythoskill-curator', 'tmp', 'playground', 'dist', 'build'])

export function findSkillDirs(root: string): string[] {
  const results: string[] = []

  function walk(dir: string, depth: number) {
    if (depth > 6) return
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        if (entry.name.startsWith('.')) continue
        if (SKIP_DIRS.has(entry.name)) continue

        const full = join(dir, entry.name)
        if (existsSync(join(full, 'SKILL.md'))) {
          results.push(full)
          continue
        }
        walk(full, depth + 1)
      }
    } catch {}
  }

  walk(root, 0)
  return results
}

// ── Plan: skill directory listing ──────────────────────────────────────────

export interface CuratorPlan {
  coldPool: ColdPool
  feeds: FeedAdapter[]
  skillDirs: string[]
}

export function buildCuratorPlan(poolPath: string): CuratorPlan {
  return {
    coldPool: { path: poolPath },
    feeds: [],
    skillDirs: [],
  }
}

// ── Add plan (pure: compute target path from source) ────────────────────────

export interface AddPlan {
  feed: Feed                 // the feed that discovered this skill
  targetPath: string         // where in cold pool
  relPath: string            // relative to cold pool root
}

/** Compute where a skill should land in the cold pool. Pure — no git clone. */
export function buildAddPlan(locator: string, coldPool: string, feedType?: string): AddPlan {
  const type = feedType || (/^github\.com/.test(locator) ? 'github' : 'url') as Feed['type']
  const clean = locator.replace(/^https?:\/\//, '').replace(/\.git$/, '')
  const targetPath = join(coldPool, clean)
  const relPath = clean

  return {
    feed: { type, locator, label: locator },
    targetPath,
    relPath,
  }
}

// ── Skill addition record (cold pool decision history) ─────────────────────
// Appended to {pool}/.lythoskill-curator/additions.jsonl on each curator add.
// Tracks the full lifecycle: added → evaluated (arena) → forked → activated.
// Arena writes evaluation results; deck writes activation. Curator owns the log.

export interface SkillAddition {
  locator: string            // what was added (github.com/owner/repo)
  feed: Feed                 // which feed discovered it
  addedAt: string            // ISO timestamp
  reason: string             // why it was added (agent reasoning or user intent)
  forkedFrom: string | null  // original skill locator if this is a fork
  arenaResult: {             // populated after arena evaluation (L3 buyer's review)
    score: number
    verdict: string
    evaluatedAt: string
  } | null
  status: 'added' | 'evaluated' | 'forked' | 'activated'
}

/** Build a skill addition record. Pure — no IO. */
export function buildAdditionRecord(
  locator: string, feed: Feed, reason: string, forkedFrom?: string
): SkillAddition {
  return {
    locator,
    feed,
    addedAt: new Date().toISOString(),
    reason,
    forkedFrom: forkedFrom || null,
    arenaResult: null,
    status: forkedFrom ? 'forked' : 'added',
  }
}

// ── Skill metadata (pure transform: file content → structured) ─────────────

export interface ParsedSkillMeta {
  name: string
  description: string
  type: string
  version: string
  source: string
  author: string
  whenToUse: string
  allowedTools: string[]
  triggerPhrases: string[]
  niches: string[]
  tags: string[]
  userInvocable: boolean | null
  deckSkillType: string | null
  hasScripts: boolean
  bodyPreview: string
}

export function buildSkillMeta(frontmatter: Record<string, unknown>, path: string, body: string): ParsedSkillMeta {
  const str = (v: unknown): string => {
    if (typeof v === 'string') return v
    if (Array.isArray(v)) return v.join(' ')
    return v != null ? String(v) : ''
  }

  const arr = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map(String)
    if (typeof v === 'string') {
      const inner = v.replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean)
      return inner.length > 0 ? inner : [v]
    }
    return v != null ? [String(v)] : []
  }

  const source = frontmatter.source ? str(frontmatter.source) : inferSource(path)
  const name = str(frontmatter.name)
  const description = str(frontmatter.description)
  const type = (frontmatter.type as string) || 'standard'
  // when_to_use is an agent-internal field used by some agent runtimes
  const whenToUse = str(frontmatter.whenToUse ?? frontmatter.when_to_use)

  return {
    name,
    description,
    type,
    version: str(frontmatter.version) || 'unknown',
    source,
    author: str(frontmatter.author),
    whenToUse,
    allowedTools: arr(frontmatter['allowed-tools'] ?? frontmatter.allowedTools ?? []),
    triggerPhrases: [...new Set([...extractQuotedPhrases(description), ...extractQuotedPhrases(whenToUse)])],
    niches: arr(frontmatter.niches ?? []),
    tags: arr(frontmatter.tags ?? []),
    userInvocable: frontmatter['user-invocable'] != null ? Boolean(frontmatter['user-invocable']) : null,
    deckSkillType: (frontmatter.deckSkillType as string) || (frontmatter['deck-skill-type'] as string) || null,
    hasScripts: frontmatter.hasScripts === true || frontmatter.has_scripts === true,
    bodyPreview: body.slice(0, 200).replace(/\n/g, ' '),
  }
}

// ── Markdown table formatter ───────────────────────────────────────────────

export function formatMarkdownTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '*No results.*'
  const MAX_COL_WIDTH = 60
  const cols = Object.keys(rows[0])
  const normalize = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
  const widths = cols.map(c =>
    Math.min(MAX_COL_WIDTH, Math.max(c.length, ...rows.map(r => normalize(r[c]).length)))
  )
  const truncate = (s: string, width: number) =>
    s.length <= width ? s.padEnd(width) : s.slice(0, width - 1) + '…'
  const sep = cols.map((_, i) => '-'.repeat(widths[i])).join(' | ')
  const header = cols.map((c, i) => c.padEnd(widths[i])).join(' | ')
  const lines = [header, sep]
  for (const row of rows) {
    lines.push(cols.map((c, i) => truncate(normalize(row[c]), widths[i])).join(' | '))
  }
  return lines.join('\n')
}
