#!/usr/bin/env bun
/**
 * pre-commit hook (TypeScript) — Epic-ADR coupling + lane guard + in-progress reminder.
 *
 * Replaces the coupling guard (lines 21-37) and soft reminder (lines 39-57)
 * in .husky/pre-commit. ADR checks and skill rebuild stay in shell.
 */
import { spawnSync } from 'node:child_process'
import { basename } from 'node:path'
import { extractEpicIdFromFilename, findLinkedAdrs, buildAcceptCommands } from '../lib/coupling.js'
import { listActiveEpics, countByLane } from '../lib/lane.js'
import { loadConfig } from '../config.js'
import { scanFiles } from '../lib/fs.js'

function git(args: string[]): string {
  const r = spawnSync('git', args, { encoding: 'utf-8' })
  return (r.stdout || '').trim()
}

const ROOT = git(['rev-parse', '--show-toplevel'])

// ── 1. Epic-ADR coupling guard ──────────────────────────────────────────

const stagedEpics = git(['diff', '--cached', '--name-only', '--diff-filter=A'])
  .split('\n')
  .filter(f => f.startsWith('cortex/epics/01-active/EPIC-'))

if (stagedEpics.length > 0) {
  for (const epicFile of stagedEpics) {
    const epicId = extractEpicIdFromFilename(epicFile)
    if (!epicId) continue

    const linked = findLinkedAdrs(epicId, {
      proposedAdrDir: `${ROOT}/cortex/adr/01-proposed`,
      acceptedAdrDir: `${ROOT}/cortex/adr/02-accepted`,
    })
    for (const adrId of linked) {
      console.log(`🔗 Auto-accepting ${adrId} (linked to ${epicId})`)
      spawnSync('bun', ['packages/lythoskill-project-cortex/src/cli.ts', 'adr', 'accept', adrId],
        { stdio: 'inherit' })
    }
  }
  // Stage any ADR moves
  spawnSync('git', ['add', 'cortex/adr/', 'cortex/INDEX.md', 'cortex/wiki/INDEX.md'])
}

// ── 2. Lane guard (warn, non-blocking) ─────────────────────────────────

try {
  const config = loadConfig()
  const active = listActiveEpics(config)
  const counts = countByLane(active)
  if (counts.main > 1) {
    console.warn(`⚠️  main lane has ${counts.main} active epics (max 1)`)
  }
  if (counts.emergency > 1) {
    console.warn(`⚠️  emergency lane has ${counts.emergency} active epics (max 1)`)
  }
} catch {
  // Cortex may not be initialized — skip lane check
}

// ── 3. In-progress task reminder (non-blocking) ─────────────────────────

const progressDir = 'cortex/tasks/02-in-progress'
const tasks = scanFiles([`${ROOT}/${progressDir}`], 'TASK').files
const ids = tasks.map(f => {
  const name = basename(f)
  const m = name.match(/^(TASK-\d+)/)
  return m ? m[1] : name
})

if (ids.length > 0) {
  console.log()
  console.log(`💡 你有 ${ids.length} 张 in-progress task，如果本次 commit 完成了某张，在 message 末尾加 trailer:`)
  console.log('     Closes: TASK-<id>')
  console.log('   或 Task: TASK-<id> review/done')
  console.log(`   当前 in-progress: ${ids.join(', ')}`)
}

process.exit(0)
