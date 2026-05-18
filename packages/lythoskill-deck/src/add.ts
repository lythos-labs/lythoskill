#!/usr/bin/env bun
/**
 * deck-add.ts — Skill acquisition command
 *
 * Downloads a skill to the cold pool, updates skill-deck.toml, and links.
 * Single backend: git clone (delegated to @lythos/cold-pool's executeFetchPlan).
 * For feed-based discovery with decision tracking, use curator add instead.
 */

import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, basename, resolve } from 'node:path'
import { parse as parseToml, stringify as stringifyToml } from '@iarna/toml'
import {
  ColdPool,
  buildFetchPlan,
  executeFetchPlan,
  parseLocator,
  formatLocator,
  getRepoHeadRef,
  hashSkillMd,
  type Locator,
} from '@lythos/cold-pool'
import { probeConnectivity } from '@lythos/cold-pool/src/mirror.js'
import { findDeckToml, expandHome } from './link.js'
import { validateAlias } from './path-guard.js'

export function findSkillDir(repoPath: string, skill: string | null): string | null {
  if (skill) {
    const inSkills = join(repoPath, 'skills', skill)
    if (existsSync(join(inSkills, 'SKILL.md'))) return inSkills
    const direct = join(repoPath, skill)
    if (existsSync(join(direct, 'SKILL.md'))) return direct
    return null
  }
  if (existsSync(join(repoPath, 'SKILL.md'))) return repoPath
  const skillsDir = join(repoPath, 'skills')
  if (existsSync(skillsDir)) {
    const entries = readdirSync(skillsDir, { withFileTypes: true })
    const dirs = entries.filter(e => e.isDirectory())
    if (dirs.length === 1) {
      const candidate = join(skillsDir, dirs[0].name)
      if (existsSync(join(candidate, 'SKILL.md'))) return candidate
    }
  }
  // Flat structure: scan repo root for directories containing SKILL.md
  try {
    const rootEntries = readdirSync(repoPath, { withFileTypes: true })
    const rootSkillDirs = rootEntries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => join(repoPath, e.name))
      .filter(p => existsSync(join(p, 'SKILL.md')))
    if (rootSkillDirs.length === 1) return rootSkillDirs[0]
  } catch {}
  return null
}

/** Find a skill directory by name within a cloned repo (for @skill syntax). */
function findSkillByName(repoPath: string, name: string): string | null {
  try {
    const entries = readdirSync(repoPath, { withFileTypes: true, recursive: true })
    // First pass: match by frontmatter name:
    for (const e of entries) {
      if (!e.isFile() || e.name !== 'SKILL.md') continue
      const dir = e.parentPath ?? dirname(join(repoPath, e.name))
      try {
        const content = readFileSync(join(dir, 'SKILL.md'), 'utf-8')
        const fmMatch = content.match(/^---\s*\nname:\s*(.+)$/m)
        if (fmMatch && fmMatch[1].trim() === name) return dir
      } catch {}
    }
    // Second pass: fall back to directory name (skills.sh convention — dir name ≠ frontmatter name)
    for (const e of entries) {
      if (!e.isFile() || e.name !== 'SKILL.md') continue
      const dir = e.parentPath ?? dirname(join(repoPath, e.name))
      if (basename(dir) === name) return dir
    }
  } catch {}
  return null
}

function resolvePath(p: string): string {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2))
  return resolve(p)
}

function resolveColdPoolPath(deckPath: string, workdir: string): string {
  if (existsSync(deckPath)) {
    try {
      const deckRaw = readFileSync(deckPath, 'utf-8')
      const deck = parseToml(deckRaw) as { deck?: { cold_pool?: string } }
      return expandHome(deck.deck?.cold_pool || '~/.agents/skill-repos', workdir)
    } catch { /* fall through to default */ }
  }
  return join(homedir(), '.agents', 'skill-repos')
}

function fqOf(loc: Locator): string {
  return formatLocator(loc)
}

/**
 * Normalize skills.sh syntax to FQ locator (UX sugar — internal rep stays git-only).
 *
 *   owner/repo@skill            → github.com/owner/repo (skillFilter handled by discovery)
 *   owner/repo/subpath          → github.com/owner/repo/subpath
 *   github:owner/repo           → github.com/owner/repo
 *   owner/repo                  → github.com/owner/repo
 */
export interface NormalizedLocator {
  fq: string        // FQ locator for clone + parseLocator
  skillFilter?: string  // from @skill suffix — match by name after clone
}

export function normalizeSkillsSh(input: string): NormalizedLocator {
  // localhost: always pass through
  if (input.startsWith('localhost/')) return { fq: input }

  // Extract #ref suffix
  let ref = ''
  let base = input
  const hashIdx = input.indexOf('#')
  if (hashIdx >= 0) {
    base = input.slice(0, hashIdx)
    const afterHash = input.slice(hashIdx + 1)
    const atInRef = afterHash.indexOf('@')
    if (atInRef >= 0) {
      ref = `#${afterHash.slice(0, atInRef)}`
      base = `${base}@${afterHash.slice(atInRef + 1)}`
    } else {
      ref = input.slice(hashIdx)
    }
  }

  // Already an FQ locator
  if (base.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.+\/.+/)) return { fq: input }

  // github: prefix — extract @skill from remainder before building FQ
  const ghPrefix = base.match(/^github:(.+)$/)
  if (ghPrefix) {
    const rest = ghPrefix[1]
    const atInGh = rest.match(/^([^/]+)\/([^/@]+)@(.+)$/)
    if (atInGh) {
      const [, owner, repo, skill] = atInGh
      return { fq: `github.com/${owner}/${repo}${ref}`, skillFilter: skill }
    }
    return { fq: `github.com/${rest}${ref}` }
  }

  // owner/repo@skill — clone repo-level, discover exact path at runtime
  const atMatch = base.match(/^([^/]+)\/([^/@]+)@(.+)$/)
  if (atMatch && !base.includes(':') && !base.startsWith('.')) {
    const [, owner, repo, skill] = atMatch
    return { fq: `github.com/${owner}/${repo}${ref}`, skillFilter: skill }
  }

  // owner/repo[/subpath]
  const shortMatch = base.match(/^([^/.]+)\/([^/]+)(?:\/(.+?))?\/?$/)
  if (shortMatch && !base.includes(':') && !base.startsWith('.')) {
    const [, owner, repo, subpath] = shortMatch
    return {
      fq: subpath
        ? `github.com/${owner}/${repo}/${subpath}${ref}`
        : `github.com/${owner}/${repo}${ref}`,
    }
  }

  return { fq: input }
}

function exitInvalidLocator(locator: string): never {
  console.error(`❌ Invalid locator: ${locator}`)
  console.error(`   Accepted formats:`)
  console.error(`     github.com/owner/repo[/skill]   — FQ locator (cold pool path, NOT a browser URL)`)
  console.error(`     owner/repo                      — GitHub shorthand`)
  console.error(`     owner/repo@skill                — skills.sh syntax`)
  console.error(`     owner/repo/subpath              — subdirectory`)
  console.error(`     github:owner/repo               — explicit GitHub prefix`)
  console.error(`     localhost/me/<skill>             — local-only skill (host/owner/repo aligned)`)
  console.error(``)
  console.error(`   Note: FQ locators look like URLs but map to cold pool paths:`)
  console.error(`     github.com/o/r/skills/s → ~/.agents/skill-repos/github.com/o/r/skills/s/SKILL.md`)
  process.exit(1)
}

export async function addSkill(
  locator: string,
  options: { deck?: string; workdir?: string; alias?: string; type?: string; dryRun?: boolean; mode?: 'symlink' | 'snapshot' },
) {
  const dryRun = options.dryRun || false
  const workdir = options.workdir ? resolvePath(options.workdir) : process.cwd()
  const deckPath = options.deck
    ? resolvePath(options.deck)
    : findDeckToml(workdir) || join(workdir, 'skill-deck.toml')

  const { fq, skillFilter } = normalizeSkillsSh(locator)
  let parsed = parseLocator(fq)
  if (!parsed) exitInvalidLocator(fq)

  if (parsed.isLocalhost) {
    console.error(`❌ deck add does not support localhost locators (no remote to clone).`)
    console.error(`   For local skills, place SKILL.md in your cold pool manually then run "deck link".`)
    process.exit(1)
  }

  const coldPoolPath = resolveColdPoolPath(deckPath, workdir)
  const pool = new ColdPool(coldPoolPath)
  const fetchPlan = buildFetchPlan(pool, parsed)
  const skillName = parsed.skill ? basename(parsed.skill) : parsed.repo!
  let rawAlias = options.alias || skillName
  try { validateAlias(rawAlias) } catch (e: any) {
    console.error(`❌ Invalid alias: ${e.message}`)
    console.error('   Aliases may only contain letters, numbers, hyphens, and underscores.')
    process.exit(1)
  }
  const skillType = (options.type || 'tool').toLowerCase()

  if (!['innate', 'tool', 'combo'].includes(skillType)) {
    console.error(`❌ Invalid type: ${skillType}. Must be innate, tool, or combo.`)
    process.exit(1)
  }

  const fqPathBefore = fqOf(parsed) // pre-discovery — may be repo-level for @skill
  if (dryRun) {
    console.log(`🔎 Dry-run: deck add ${locator}`)
    console.log(`   Cold pool:  ${coldPoolPath}`)
    console.log(`   Deck:       ${deckPath}`)
    console.log()
    const repoStatus = existsSync(join(fetchPlan.targetDir, '.git'))
      ? 'already cloned'
      : existsSync(fetchPlan.targetDir)
        ? 'dir exists (partial clone?)'
        : 'not in cold pool'
    console.log(`📂 Repo status: ${repoStatus}`)
    if (!existsSync(join(fetchPlan.targetDir, '.git'))) {
      console.log(`📦 Would clone: ${fetchPlan.cloneUrl} --depth 1`)
    }
    if (parsed.skill) {
      const skillMd = join(fetchPlan.targetDir, parsed.skill, 'SKILL.md')
      if (existsSync(fetchPlan.targetDir) && existsSync(skillMd)) {
        console.log(`📄 Skill path:  valid — ${skillMd}`)
      } else if (existsSync(fetchPlan.targetDir)) {
        console.log(`⚠️  Skill path:  NOT FOUND — check repo layout`)
      }
    }
    console.log(`\n📝 Would add to skill-deck.toml:`)
    console.log(`   [${skillType}.skills.${alias}]`)
    console.log(`   path = "${fqPathBefore}"`)
    console.log(`\n💡 Remove --dry-run to execute.`)
    return
  }

  if (!existsSync(coldPoolPath)) {
    console.log(`📁 Creating cold pool: ${coldPoolPath}`)
    mkdirSync(coldPoolPath, { recursive: true })
  }
  // git clone needs the parent of the target dir (e.g. host/owner/) to exist
  mkdirSync(dirname(fetchPlan.targetDir), { recursive: true })

  // ── Plan→Apply boundary: probe network before any git operation ────────
  if (fetchPlan.cloneUrl) {
    const probe = await probeConnectivity(fetchPlan.cloneUrl, 5000)
    if (!probe) {
      console.error(`❌ Cannot reach ${fetchPlan.cloneUrl}`)
      console.error(`   Network probe failed — the host may be unreachable or blocked.`)
      console.error(``)
      console.error(`   To fix:`)
      console.error(`     export LYTHOSKILL_GH_MIRROR="https://your-mirror.com"`)
      console.error(`     # Or set LYTHOS_SOCKS_PROXY for SOCKS5 routing`)
      console.error(`     # See: AGENTS.md → Network Restrictions`)
      process.exit(1)
    }
    if (probe.path === 'mirror') {
      console.log(`🪞 Using mirror: ${probe.url} (${probe.latencyMs}ms)`)
    }
  }

  // Note: if cold pool already has the repo (fetchPlan.alreadyExists),
  // executeFetchPlan returns status: 'already-present' and skips clone.
  // We still want to write deck.toml + link this skill — critical for
  // monorepo case (second `deck add` from same repo, e.g. anthropics/skills/pdf
  // then anthropics/skills/docx). Used to early-exit here, which broke
  // the monorepo workflow and triggered post-compaction agent CPTSD
  // (see: 2026-05-07 morning skill-deck.toml overwrite incident).
  const fetchResult = executeFetchPlan(fetchPlan, {
    log: (msg) => console.log(msg),
  })

  if (fetchResult.status === 'failed') {
    rmSync(fetchPlan.targetDir, { recursive: true, force: true })
    console.error(`❌ Failed to fetch: ${fetchResult.message ?? 'unknown error'}`)
    process.exit(1)
  }

  if (fetchResult.status === 'already-present') {
    console.log(`✓ Repo already in cold pool — skipped clone.`)
    console.log(`   To check for upstream updates without pulling:`)
    console.log(`     bunx @lythos/skill-deck refresh ${parsed.host}/${parsed.owner}/${parsed.repo}`)
    console.log(`   (per ADR-20260507110332805, refresh defaults to discover-only)`)
  }

  const skillDir = findSkillDir(fetchPlan.targetDir, parsed.skill || null)
    ?? (skillFilter ? findSkillByName(fetchPlan.targetDir, skillFilter) : null)
  if (skillDir && skillFilter) {
    // If discovered by name, update skill path and alias
    const relPath = skillDir.slice(fetchPlan.targetDir.length + 1)
    parsed = { ...parsed, skill: relPath }
    if (!options.alias) rawAlias = basename(relPath)  // use discovered dir name as alias
  }
  const fqPath = fqOf(parsed)  // may be updated after @skill discovery
  const alias = rawAlias       // finalized after potential @skill override
  if (!skillDir) {
    console.error(`❌ No SKILL.md found in downloaded repo`)
    console.error(`   Checked: ${fetchPlan.targetDir}`)
    process.exit(1)
  }

  console.log(`✅ Skill ready: ${skillName} (alias: ${alias})`)
  console.log(`   Location: ${skillDir}`)
  if (parsed.host === 'github.com') {
    console.log(`   Source:   https://github.com/${parsed.owner}/${parsed.repo}`)
  }

  // ── 写 deck.toml ────────────────────────────────────────────

  if (existsSync(deckPath)) {
    const deckRaw = readFileSync(deckPath, 'utf-8')
    const deck = parseToml(deckRaw) as Record<string, any>

    // Alias collision check across all sections
    const allAliases = new Set<string>()
    for (const section of ['innate', 'tool', 'combo'] as const) {
      const skills = deck[section]?.skills
      if (skills && typeof skills === 'object' && !Array.isArray(skills)) {
        for (const key of Object.keys(skills)) allAliases.add(key)
      } else if (Array.isArray(skills)) {
        for (const name of skills) allAliases.add(name.split('/').pop() || name)
      }
    }
    for (const key of Object.keys(deck.transient || {})) {
      allAliases.add(key)
    }
    if (allAliases.has(alias)) {
      console.error(`❌ Alias "${alias}" already exists in deck`)
      process.exit(1)
    }

    // Auto-migrate old string-array format to dict
    for (const section of ['innate', 'tool', 'combo'] as const) {
      const sectionData = deck[section]
      if (sectionData && Array.isArray(sectionData.skills)) {
        const dict: Record<string, { path: string }> = {}
        for (const name of sectionData.skills) {
          const a = name.split('/').pop() || name
          dict[a] = { path: name }
        }
        deck[section].skills = dict
        console.log(`📝 Auto-migrated [${section}] from string-array to dict format`)
      }
    }

    // Ensure target section exists and is dict format
    if (!deck[skillType]) deck[skillType] = {}
    if (!deck[skillType].skills) deck[skillType].skills = {}
    if (Array.isArray(deck[skillType].skills)) {
      const dict: Record<string, { path: string }> = {}
      for (const name of deck[skillType].skills) {
        const a = name.split('/').pop() || name
        dict[a] = { path: name }
      }
      deck[skillType].skills = dict
    }

    const entry: Record<string, string> = { path: fqPath }
    if (parsed.host === 'github.com') {
      const skillRel = parsed.skill ? `/${parsed.skill}` : ''
      const rawRef = parsed.ref || 'HEAD'
      // Reject refs that could inject into URL (query, fragment, auth)
      if (/[?#@]/.test(rawRef)) {
        console.warn(`⚠️  Ref "${rawRef}" contains URL-special characters — source URL skipped`)
      } else {
        entry.source = `https://github.com/${parsed.owner}/${parsed.repo}/blob/${rawRef}${skillRel}/SKILL.md`
      }
    }
    deck[skillType].skills[alias] = entry
    writeFileSync(deckPath, stringifyToml(deck))
    console.log(`📝 Added "${alias}" to [${skillType}.skills] in ${deckPath}`)
  } else {
    const header = [
      '# Skill Deck — generated by lythoskill-deck',
      '# Edit working_set for your agent platform (uncomment one):',
      '#   working_set = ".claude/skills"   # Claude Code (also read by Cursor, Copilot)',
      '#   working_set = ".agents/skills"   # Codex CLI, OpenClaw (project-level)',
      '#   working_set = ".cursor/skills"   # Cursor-native',
      '#   working_set = ".github/skills"   # GitHub Copilot',
      '#   working_set = ".windsurf/skills" # Windsurf',
      '# For OpenClaw global skills: working_set = "~/.openclaw/skills" (global deck)',
      '# After editing, run:  bunx @lythos/skill-deck@latest link',
      '',
    ].join('\n')
    const minimal: Record<string, any> = {
      deck: {
        max_cards: 10,
        cold_pool: '~/.agents/skill-repos',
        working_set: '.claude/skills',
      },
    }
    minimal[skillType] = { skills: { [alias]: { path: fqPath } } }
    writeFileSync(deckPath, header + stringifyToml(minimal))
    console.log(`📝 Created ${deckPath} with "${alias}"`)
  }

  console.log('🔗 Running deck link...')
  const { linkDeck } = await import('./link.js')
  await linkDeck(deckPath, workdir, { mode: options.mode })

  // ── Metadata recording (content-level only; deck refs reconciled by link) ─

  try {
    const headRef = await getRepoHeadRef(fetchPlan.targetDir)
    const skillSubpath = parsed.skill || ''
    const skillMdPath = join(skillDir, 'SKILL.md')
    const contentSha256 = hashSkillMd(skillMdPath)

    pool.metadata.recordRepoRef(parsed.host, parsed.owner, parsed.repo, headRef)
    pool.metadata.recordSkillHash(parsed.host, parsed.owner, parsed.repo, skillSubpath, contentSha256, null, headRef)
  } catch (e: any) {
    console.warn(`⚠️  Metadata recording skipped: ${e.message}`)
  }
}
