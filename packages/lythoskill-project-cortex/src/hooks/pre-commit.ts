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

function git(args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const r = spawnSync('git', args, { encoding: 'utf-8' })
  return { ok: r.status === 0, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() }
}

const gRoot = git(['rev-parse', '--show-toplevel'])
if (!gRoot.ok) {
  console.error(`pre-commit: git rev-parse failed: ${gRoot.stderr}`)
  process.exit(1)
}
const ROOT = gRoot.stdout

// ── 1. Epic-ADR coupling guard ──────────────────────────────────────────

const gDiff = git(['diff', '--cached', '--name-only', '--diff-filter=A'])
if (!gDiff.ok) console.warn(`pre-commit: git diff failed: ${gDiff.stderr}`)
const stagedEpics = gDiff.stdout
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
      const rAccept = spawnSync('bun', ['packages/lythoskill-project-cortex/src/cli.ts', 'adr', 'accept', adrId],
        { stdio: 'inherit' })
      if (rAccept.status !== 0) console.warn(`pre-commit: ADR auto-accept failed for ${adrId}`)
    }
  }
  // Stage any ADR moves
  const rAdd = spawnSync('git', ['add', 'cortex/adr/', 'cortex/INDEX.md', 'cortex/wiki/INDEX.md'])
  if (rAdd.status !== 0) console.warn(`pre-commit: git add failed for ADR staging`)
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

// ── 4. Governance waterline (non-blocking tip) ──────────────────────────

try {
  const adrProposedDir = `${ROOT}/cortex/adr/01-proposed`
  const reviewDir = `${ROOT}/cortex/tasks/03-review`
  const activeEpicDir = `${ROOT}/cortex/epics/01-active`
  const proposedADRs = scanFiles([adrProposedDir], 'ADR').files.length
  const reviewTasks = scanFiles([reviewDir], 'TASK').files.length
  const activeEpics = scanFiles([activeEpicDir], 'EPIC').files.length

  const tips: string[] = []
  if (proposedADRs > 0) tips.push(`${proposedADRs} proposed ADR → 配套实现已落地？cortex adr accept <id>`)
  if (reviewTasks > 0) tips.push(`${reviewTasks} in review → 验收通过？cortex done <id>`)
  if (activeEpics > 0) {
    tips.push(`${activeEpics} active epic → 任务全完成？cortex epic done <id>`)
  } else {
    // Zero active epics — tip to create one if this looks like significant work.
    const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACM'])
    const stagedFiles = staged.ok ? staged.stdout.split('\n').filter(Boolean) : []
    const pkgCount = new Set(stagedFiles.filter((f: string) => f.startsWith('packages/')).map((f: string) => f.split('/')[1])).size
    if (pkgCount >= 2) {
      tips.push(`0 active epic, ${pkgCount} packages touched → 值得追踪？cortex epic "..." --lane main`)
    } else if (stagedFiles.length > 0) {
      tips.push('0 active epic → 本次改动跨多个 commit？cortex epic "..." --lane main')
    }
  }

  if (tips.length > 0) {
    console.log()
    console.log('🌊 Governance waterline — check before next commit:')
    for (const t of tips) console.log(`   ${t}`)
  }
} catch {
  // Cortex may not be initialized — skip
}

process.exit(0)
