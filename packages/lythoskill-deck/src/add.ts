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
  type Locator,
} from '@lythos/cold-pool'
import { findDeckToml, expandHome } from './link.js'

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

function exitInvalidLocator(locator: string): never {
  console.error(`❌ Invalid locator: ${locator}`)
  console.error(`   Expected FQ form (per ADR-20260502012643244):`)
  console.error(`     host.tld/owner/repo[/skill]   — remote skill`)
  console.error(`     localhost/<name>              — local-only skill`)
  console.error(`   Bare names and shorthand 'owner/repo' are rejected.`)
  process.exit(1)
}

export async function addSkill(
  locator: string,
  options: { deck?: string; workdir?: string; alias?: string; type?: string; dryRun?: boolean },
) {
  const dryRun = options.dryRun || false
  const workdir = options.workdir ? resolvePath(options.workdir) : process.cwd()
  const deckPath = options.deck
    ? resolvePath(options.deck)
    : findDeckToml(workdir) || join(workdir, 'skill-deck.toml')

  const parsed = parseLocator(locator)
  if (!parsed) exitInvalidLocator(locator)

  if (parsed.isLocalhost) {
    console.error(`❌ deck add does not support localhost locators (no remote to clone).`)
    console.error(`   For local skills, place SKILL.md in your cold pool manually then run "deck link".`)
    process.exit(1)
  }

  const coldPoolPath = resolveColdPoolPath(deckPath, workdir)
  const pool = new ColdPool(coldPoolPath)
  const fetchPlan = buildFetchPlan(pool, parsed)
  const fqPath = fqOf(parsed)
  const skillName = parsed.skill ? basename(parsed.skill) : parsed.repo!
  const alias = options.alias || skillName
  const skillType = (options.type || 'tool').toLowerCase()

  if (!['innate', 'tool', 'combo'].includes(skillType)) {
    console.error(`❌ Invalid type: ${skillType}. Must be innate, tool, or combo.`)
    process.exit(1)
  }

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
    console.log(`   path = "${fqPath}"`)
    console.log(`\n💡 Remove --dry-run to execute.`)
    return
  }

  if (fetchPlan.alreadyExists) {
    console.error(`❌ Already exists in cold pool: ${fetchPlan.targetDir}`)
    console.error(`   To update: rm -rf ${fetchPlan.targetDir} and re-run`)
    process.exit(1)
  }

  if (!existsSync(coldPoolPath)) {
    console.log(`📁 Creating cold pool: ${coldPoolPath}`)
    mkdirSync(coldPoolPath, { recursive: true })
  }
  // git clone needs the parent of the target dir (e.g. host/owner/) to exist
  mkdirSync(dirname(fetchPlan.targetDir), { recursive: true })

  const fetchResult = executeFetchPlan(fetchPlan, {
    log: (msg) => console.log(msg),
  })

  if (fetchResult.status === 'failed') {
    rmSync(fetchPlan.targetDir, { recursive: true, force: true })
    console.error(`❌ Failed to fetch: ${fetchResult.message ?? 'unknown error'}`)
    process.exit(1)
  }

  const skillDir = findSkillDir(fetchPlan.targetDir, parsed.skill)
  if (!skillDir) {
    console.error(`❌ No SKILL.md found in downloaded repo`)
    console.error(`   Checked: ${fetchPlan.targetDir}`)
    process.exit(1)
  }

  console.log(`✅ Skill ready: ${skillName} (alias: ${alias})`)
  console.log(`   Location: ${skillDir}`)

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

    deck[skillType].skills[alias] = { path: fqPath }
    writeFileSync(deckPath, stringifyToml(deck))
    console.log(`📝 Added "${alias}" to [${skillType}.skills] in ${deckPath}`)
  } else {
    const minimal: Record<string, any> = { deck: { max_cards: 10 } }
    minimal[skillType] = { skills: { [alias]: { path: fqPath } } }
    writeFileSync(deckPath, stringifyToml(minimal))
    console.log(`📝 Created ${deckPath} with "${alias}"`)
  }

  console.log('🔗 Running deck link...')
  const { linkDeck } = await import('./link.js')
  linkDeck(deckPath, workdir)
}
