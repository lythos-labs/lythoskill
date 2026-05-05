#!/usr/bin/env bun
/**
 * post-commit hook (TypeScript) — trailer-driven cortex flow.
 *
 * Replaces the shell trailer_block() in .husky/post-commit.
 * ADR-20260503003314901 (Option C): commit trailer + post-commit follow-up.
 */
import { parseTrailers, buildDispatchCommands } from '../lib/trailer.js'
import { spawnSync } from 'node:child_process'

function sh(cmd: string, args: string[]): { ok: boolean; stdout: string } {
  const r = spawnSync(cmd, args, { encoding: 'utf-8' })
  return { ok: r.status === 0, stdout: (r.stdout || '').trim() }
}

function git(args: string[]): ReturnType<typeof sh> { return sh('git', args) }

// Recursion guard + parse
const msg = git(['log', '-1', '--format=%B', 'HEAD']).stdout
const sha = git(['rev-parse', '--short', 'HEAD']).stdout
const result = parseTrailers(msg)

for (const w of result.warnings) console.warn(`⚠️  ${w}`)
if (result.skip || result.trailers.length === 0) process.exit(0)

// Dispatch
const cmds = buildDispatchCommands(result.trailers)
const successes: string[] = []

for (const cmd of cmds) {
  console.log(`🔁 cortex trailer dispatch: ${cmd}`)
  const r = spawnSync('bun', ['packages/lythoskill-project-cortex/src/cli.ts', ...cmd.split(' ')],
    { stdio: 'inherit' })
  if (r.status === 0) {
    successes.push(cmd)
  } else {
    console.warn(`⚠️  post-commit trailer: cortex CLI failed for: ${cmd}`)
  }
}

if (successes.length === 0) process.exit(0)

// Follow-up commit
git(['add', 'cortex/tasks', 'cortex/adr', 'cortex/epics', 'cortex/wiki/INDEX.md', 'INDEX.md'])
if (git(['diff', '--cached', '--quiet']).ok) process.exit(0)

const subject = successes.length === 1
  ? `chore(cortex): ${successes[0]}`
  : `chore(cortex): ${successes.length} trailer dispatches`
const body = ['', 'Dispatches:', ...successes.map(s => `  - ${s}`), '', `Triggered by: ${sha}`].join('\n')

spawnSync('git', ['commit', '--no-verify', '-m', `${subject}\n${body}`], { stdio: 'inherit' })
process.exit(0)
