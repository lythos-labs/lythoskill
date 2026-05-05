#!/usr/bin/env bun
/**
 * Shared trailer dispatch — used by both post-commit hook and CLI dispatch-trailers command.
 * Pure function: takes commit message + sha → dispatches + creates follow-up commit.
 */
import { parseTrailers, buildDispatchCommands } from '../lib/trailer.js'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

function sh(cmd: string, args: string[]): { ok: boolean; stdout: string } {
  const r = spawnSync(cmd, args, { encoding: 'utf-8' })
  return { ok: r.status === 0, stdout: (r.stdout || '').trim() }
}

function git(args: string[]): ReturnType<typeof sh> { return sh('git', args) }

export interface DispatchOptions {
  /** Path to the cortex CLI (for recursive spawn). Default: uses bunx. */
  cortexCli: string[]
}

export function dispatchTrailers(msg: string, sha: string, opts: DispatchOptions): number {
  const result = parseTrailers(msg)

  for (const w of result.warnings) console.warn(`⚠️  ${w}`)
  if (result.skip || result.trailers.length === 0) return 0

  const cmds = buildDispatchCommands(result.trailers)
  const successes: string[] = []

  for (const cmd of cmds) {
    console.log(`🔁 cortex trailer dispatch: ${cmd}`)
    const r = spawnSync(opts.cortexCli[0], [...opts.cortexCli.slice(1), ...cmd.split(' ')],
      { stdio: 'inherit' })
    if (r.status === 0) {
      successes.push(cmd)
    } else {
      console.warn(`⚠️  post-commit trailer: cortex CLI failed for: ${cmd}`)
    }
  }

  if (successes.length === 0) return 0

  // Follow-up commit
  git(['add', 'cortex/tasks', 'cortex/adr', 'cortex/epics', 'cortex/wiki/INDEX.md', 'INDEX.md'])
  if (git(['diff', '--cached', '--quiet']).ok) return 0

  const subject = successes.length === 1
    ? `chore(cortex): ${successes[0]}`
    : `chore(cortex): ${successes.length} trailer dispatches`
  const body = ['', 'Dispatches:', ...successes.map(s => `  - ${s}`), '', `Triggered by: ${sha}`].join('\n')

  spawnSync('git', ['commit', '--no-verify', '-m', `${subject}\n${body}`], { stdio: 'inherit' })
  return 0
}
