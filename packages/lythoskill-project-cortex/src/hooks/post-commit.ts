#!/usr/bin/env bun
/**
 * post-commit hook — trailer-driven cortex flow (lythoskill self-bootstrap).
 *
 * For external projects, use `bunx @lythos/project-cortex dispatch-trailers`
 * which calls the same underlying logic via the cortex CLI.
 */
import { dispatchTrailers } from './dispatch.js'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { resolve } from 'node:path'

const ROOT = resolve(process.cwd())

function git(args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const r = spawnSync('git', args, { encoding: 'utf-8' })
  return { ok: r.status === 0, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() }
}

const g1 = git(['log', '-1', '--format=%B', 'HEAD'])
const g2 = git(['rev-parse', '--short', 'HEAD'])
if (!g1.ok) console.warn(`post-commit: git log failed: ${g1.stderr}`)
if (!g2.ok) console.warn(`post-commit: git rev-parse failed: ${g2.stderr}`)
const msg = g1.stdout
const sha = g2.stdout

dispatchTrailers(msg, sha, {
  cortexCli: ['bun', join(ROOT, 'packages/lythoskill-project-cortex/src/cli.ts')],
})
