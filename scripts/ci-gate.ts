#!/usr/bin/env bun
/**
 * scripts/ci-gate.ts
 *
 * One-command local gate replicating the CI test job's locally-runnable
 * steps (see .github/workflows/test.yml). Born from the 2026-10-13
 * incident: the unit-test gate was green while the cortex BDD fixture
 * still asserted the pre-fix INDEX.md location — CI went red on three
 * consecutive main pushes before anyone looked.
 *
 * Usage: bun scripts/ci-gate.ts
 * Collects every step's result, prints a summary, exits 1 on any failure.
 * The site-build job (VitePress build etc.) is not replicated here.
 */

import { spawnSync } from 'node:child_process'

interface GateStep {
  name: string
  run: () => boolean
}

function sh(command: string, args: string[]): boolean {
  const r = spawnSync(command, args, { stdio: 'inherit' })
  return r.status === 0
}

// artifacts-sync: same semantics as the CI step —
// build everything, then fail if skills/ drifted from packages/ source.
function artifactsInSync(): boolean {
  if (!sh('bun', ['packages/lythoskill-creator/src/cli.ts', 'build', '--all'])) {
    return false
  }
  const diff = spawnSync('git', ['diff', '--quiet', '--', 'skills/'])
  if (diff.status !== 0) {
    console.error(':: skills/ is stale relative to packages/ source. Run the build and commit the result:')
    spawnSync('git', ['diff', '--name-only', '--', 'skills/'], { stdio: 'inherit' })
    return false
  }
  return true
}

const steps: GateStep[] = [
  { name: 'unit tests (bun --filter)', run: () => sh('bun', ['--filter=*', 'run', 'test']) },
  { name: 'cortex BDD', run: () => sh('bun', ['packages/lythoskill-project-cortex/test/runner.ts']) },
  { name: 'deck BDD', run: () => sh('bun', ['packages/lythoskill-deck/test/runner.ts']) },
  { name: 'validate example decks', run: () => sh('bun', ['scripts/validate-example-decks.ts']) },
  { name: 'site deck snippets', run: () => sh('bun', ['scripts/check-site-deck-snippets.ts']) },
  { name: 'creator align', run: () => sh('bun', ['packages/lythoskill-creator/src/cli.ts', 'align']) },
  { name: 'skill artifacts in sync', run: artifactsInSync },
]

console.log('🚪 ci-gate — local replica of the CI test job\n')

const failed: string[] = []
for (const step of steps) {
  console.log(`── ${step.name} ──`)
  if (!step.run()) failed.push(step.name)
  console.log()
}

if (failed.length > 0) {
  console.error(`❌ ci-gate: ${failed.length}/${steps.length} step(s) failed:`)
  for (const name of failed) console.error(`   - ${name}`)
  process.exit(1)
}
console.log(`✅ ci-gate: all ${steps.length} steps green`)
