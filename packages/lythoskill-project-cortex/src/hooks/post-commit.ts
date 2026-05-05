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

function git(args: string[]): string {
  const r = spawnSync('git', args, { encoding: 'utf-8' })
  return (r.stdout || '').trim()
}

const msg = git(['log', '-1', '--format=%B', 'HEAD'])
const sha = git(['rev-parse', '--short', 'HEAD'])

dispatchTrailers(msg, sha, {
  cortexCli: ['bun', join(ROOT, 'packages/lythoskill-project-cortex/src/cli.ts')],
})
