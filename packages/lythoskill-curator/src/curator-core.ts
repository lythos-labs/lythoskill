// ── Curator core: pure functions extracted from CLI ────────────────────────
// Design: RSS feed manager for skills.
// Sources (feeds) → items (skills) → index (REGISTRY.json + catalog.db)
// Future: remote source adapters (LobeHub, agentskill.sh, GitHub) unite under same interface.

// ── Source abstraction (forward-compatible: local + remote) ─────────────────

export interface SkillSource {
  type: 'cold-pool' | 'github' | 'url' | 'marketplace'
  locator: string           // path, URL, or org/repo
  label: string             // human-readable name
}

export interface SkillItem {
  path: string              // absolute path in cold pool
  source: string            // inferred: "github.com/owner/repo" or "localhost"
  name: string
  relPath: string           // relative to cold pool root
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
  if (ghIdx >= 0 && ghIdx + 3 < parts.length) {
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

// ── Plan: skill directory listing (pure after filesystem scan) ─────────────

export interface CuratorPlan {
  source: SkillSource
  skillDirs: string[]
}

export function buildCuratorPlan(poolPath: string): CuratorPlan {
  return {
    source: { type: 'cold-pool', locator: poolPath, label: poolPath },
    skillDirs: [],  // populated by findSkillDirs (IO)
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

  return {
    name,
    description,
    type,
    version: str(frontmatter.version) || 'unknown',
    source,
    author: str(frontmatter.author),
    whenToUse: str(frontmatter.whenToUse),
    allowedTools: arr(frontmatter['allowed-tools'] ?? frontmatter.allowedTools ?? []),
    triggerPhrases: extractQuotedPhrases(description),
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
