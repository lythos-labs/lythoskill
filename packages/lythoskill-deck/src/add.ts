#!/usr/bin/env bun
/**
 * deck-add.ts — Skill acquisition command
 *
 * Downloads a skill to the cold pool, updates skill-deck.toml, and links.
 * Supports multiple backends (git clone, skills.sh) without locking users
 * into a single download method.
 */

import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { mkdtempSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join, basename, dirname, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { parse as parseToml, stringify as stringifyToml } from '@iarna/toml'
import { findDeckToml, expandHome } from './link.js'
import { parseDeck } from './parse-deck.js'

const CLAUDE_SKILLS_DIR = join(homedir(), '.claude', 'skills')

interface ParsedLocator {
  host: string
  owner: string
  repo: string
  skill: string | null
  raw: string
}

function parseLocator(input: string): ParsedLocator | null {
  // Format: host.tld/owner/repo/skill  or  host.tld/owner/repo
  //         owner/repo/skill           or  owner/repo  (shorthand for github.com)
  const parts = input.split('/').filter(Boolean)
  if (parts.length < 2) return null

  const hasHost = parts[0].includes('.')

  if (hasHost) {
    if (parts.length < 3) return null
    const host = parts[0]
    const owner = parts[1]
    const repo = parts[2]
    const skill = parts.length > 3 ? parts.slice(3).join('/') : null
    return { host, owner, repo, skill, raw: input }
  }

  const host = 'github.com'
  const owner = parts[0]
  const repo = parts[1]
  const skill = parts.length > 2 ? parts.slice(2).join('/') : null
  return { host, owner, repo, skill, raw: input }
}

function findSkillDir(repoPath: string, skill: string | null): string | null {
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
  return null
}

function resolvePath(p: string): string {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2))
  return resolve(p)
}

export async function addSkill(locator: string, options: { via?: string; deck?: string; workdir?: string; as?: string; type?: string }) {
  const workdir = options.workdir ? resolvePath(options.workdir) : process.cwd()
  const deckPath = options.deck
    ? resolvePath(options.deck)
    : findDeckToml(workdir) || join(workdir, 'skill-deck.toml')

  const parsed = parseLocator(locator)
  if (!parsed) {
    console.error(`❌ Invalid locator: ${locator}`)
    console.error(`   Expected: github.com/owner/repo[/skill] or owner/repo[/skill]`)
    process.exit(1)
  }

  const backend = options.via || 'git'

  let coldPool = join(homedir(), '.agents', 'skill-repos')
  if (existsSync(deckPath)) {
    try {
      const deckRaw = readFileSync(deckPath, 'utf-8')
      const deck = parseToml(deckRaw) as any
      coldPool = expandHome(deck.deck?.cold_pool || '~/.agents/skill-repos', workdir)
    } catch { /* use default */ }
  }

  const targetDir = join(coldPool, parsed.host, parsed.owner, parsed.repo)

  if (existsSync(targetDir)) {
    console.error(`❌ Already exists in cold pool: ${targetDir}`)
    console.error(`   To update: rm -rf ${targetDir} and re-run`)
    process.exit(1)
  }

  if (!existsSync(coldPool)) {
    console.log(`📁 Creating cold pool: ${coldPool}`)
    mkdirSync(coldPool, { recursive: true })
  }

  const tmpDir = mkdtempSync(join(tmpdir(), 'lythoskill-deck-add-'))
  const tmpRepo = join(tmpDir, 'repo')

  try {
    let skillSourceDir: string

    if (backend === 'skills.sh' || backend === 'vercel') {
      const skillsShLocator = `${parsed.owner}/${parsed.repo}`
      console.log(`📦 Downloading via skills.sh: ${skillsShLocator}`)

      // Snapshot existing directories in ~/.claude/skills/
      const beforeDirs = existsSync(CLAUDE_SKILLS_DIR)
        ? new Set(readdirSync(CLAUDE_SKILLS_DIR, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => e.name))
        : new Set<string>()

      execFileSync('npx', ['skills', 'add', skillsShLocator, '-g'], { cwd: tmpDir, stdio: 'inherit' })

      // Detect the newly installed directory
      const afterDirs = existsSync(CLAUDE_SKILLS_DIR)
        ? readdirSync(CLAUDE_SKILLS_DIR, { withFileTypes: true })
            .filter(e => e.isDirectory())
            .map(e => e.name)
        : []
      const newDirs = afterDirs.filter(d => !beforeDirs.has(d))

      if (newDirs.length === 0) {
        console.error(`❌ skills.sh installed nothing new to ~/.claude/skills/`)
        console.error(`   The skill may already be installed, or the install failed.`)
        process.exit(1)
      }
      if (newDirs.length > 1) {
        console.warn(`⚠️  Multiple new directories detected in ~/.claude/skills/`)
        console.warn(`   Using the first one: ${newDirs[0]}`)
      }
      const installedName = newDirs[0]
      skillSourceDir = join(CLAUDE_SKILLS_DIR, installedName)
      console.log(`   Detected install: ${installedName}`)
    } else {
      const gitUrl = `https://${parsed.host}/${parsed.owner}/${parsed.repo}.git`
      console.log(`📦 Cloning: ${gitUrl}`)
      execFileSync('git', ['clone', '--depth', '1', gitUrl, tmpRepo], { stdio: 'inherit' })
      skillSourceDir = tmpRepo
    }

    if (!existsSync(skillSourceDir)) {
      console.error(`❌ Download failed: expected output not found at ${skillSourceDir}`)
      process.exit(1)
    }

    mkdirSync(dirname(targetDir), { recursive: true })
    renameSync(skillSourceDir, targetDir)

    const skillDir = findSkillDir(targetDir, parsed.skill)
    if (!skillDir) {
      console.error(`❌ No SKILL.md found in downloaded repo`)
      console.error(`   Checked: ${targetDir}`)
      process.exit(1)
    }

    const skillName = parsed.skill ? basename(parsed.skill) : parsed.repo
    const alias = options.as || skillName
    const skillType = (options.type || 'tool').toLowerCase()

    if (!['innate', 'tool', 'combo'].includes(skillType)) {
      console.error(`❌ Invalid type: ${skillType}. Must be innate, tool, or combo.`)
      process.exit(1)
    }

    const fqPath = parsed.skill
      ? `${parsed.host}/${parsed.owner}/${parsed.repo}/${parsed.skill}`
      : `${parsed.host}/${parsed.owner}/${parsed.repo}`

    console.log(`✅ Skill ready: ${skillName} (alias: ${alias})`)
    console.log(`   Location: ${skillDir}`)

    // ── 写 deck.toml ────────────────────────────────────────────

    if (existsSync(deckPath)) {
      const deckRaw = readFileSync(deckPath, 'utf-8')
      const deck = parseToml(deckRaw) as any

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
      const minimal: any = { deck: { max_cards: 10 } }
      minimal[skillType] = { skills: { [alias]: { path: fqPath } } }
      writeFileSync(deckPath, stringifyToml(minimal))
      console.log(`📝 Created ${deckPath} with "${alias}"`)
    }

    console.log('🔗 Running deck link...')
    const { linkDeck } = await import('./link.js')
    linkDeck(deckPath === join(workdir, 'skill-deck.toml') ? undefined : deckPath, workdir)

  } catch (err) {
    console.error(`❌ Failed to add skill: ${err}`)
    process.exit(1)
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}
