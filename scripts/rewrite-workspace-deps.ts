#!/usr/bin/env bun
/**
 * rewrite-workspace-deps.ts — pre-publish translator
 *
 * npm publish does not rewrite `workspace:*` protocol specifiers in
 * published manifests (unlike pnpm publish). Packages with workspace:*
 * internal deps ship to npm with unresolvable specifiers, breaking
 * every external consumer (bunx, npm install).
 *
 * This script translates `"@lythos/<pkg>": "workspace:*"` to
 * `"@lythos/<pkg>": "^<root-version>"` in a single package.json so
 * `npm publish` ships resolvable specifiers. publish.sh calls this
 * before each `npm publish` and restores via `git checkout` after.
 *
 * Usage:
 *   bun scripts/rewrite-workspace-deps.ts <path-to-package.json>
 *
 * Caller is responsible for restoring the file (`git checkout --`) after
 * publish — this script only writes the rewrite, it does not back up.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'

const target = process.argv[2]
if (!target) {
  console.error('Usage: bun scripts/rewrite-workspace-deps.ts <path-to-package.json>')
  process.exit(1)
}

// Find the monorepo root (walk up looking for the workspace package.json).
function findRootVersion(start: string): string {
  let cur = resolve(start)
  while (cur !== dirname(cur)) {
    try {
      const pj = JSON.parse(readFileSync(join(cur, 'package.json'), 'utf-8'))
      if (pj.workspaces) return pj.version
    } catch {
      // no package.json here or unreadable — keep walking
    }
    cur = dirname(cur)
  }
  throw new Error(`No workspace root package.json found walking up from ${start}`)
}

const targetAbs = resolve(target)
const version = findRootVersion(dirname(targetAbs))
const manifest = JSON.parse(readFileSync(targetAbs, 'utf-8'))

const SECTIONS = ['dependencies', 'optionalDependencies', 'peerDependencies'] as const
let rewriteCount = 0
for (const section of SECTIONS) {
  const deps = manifest[section]
  if (!deps) continue
  for (const dep of Object.keys(deps)) {
    if (dep.startsWith('@lythos/') && deps[dep] === 'workspace:*') {
      deps[dep] = `^${version}`
      rewriteCount += 1
    }
  }
}

if (rewriteCount > 0) {
  writeFileSync(targetAbs, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`  ✓ rewrote ${rewriteCount} workspace:* → ^${version} in ${target}`)
} else {
  console.log(`  · no workspace:* @lythos/* deps in ${target}`)
}
