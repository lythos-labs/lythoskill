#!/usr/bin/env bun
/**
 * Sync README test stats from actual bun test output.
 * Run: bun scripts/sync-readme-stats.ts [package-name]
 *
 * Without arg: syncs all packages that have README.md + src/ directory.
 * With arg: syncs only that package (e.g. "lythoskill-curator").
 */
import { join } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import { runAndParse, injectStats, TestStats } from '../packages/lythoskill-test-utils/src/readme-stats.js'

const ROOT = join(import.meta.dir, '..')

const target = process.argv[2]

const packagesDir = join(ROOT, 'packages')
const dirs = target
  ? [target]
  : readdirSync(packagesDir).filter(n =>
      n.startsWith('lythoskill-') && existsSync(join(packagesDir, n, 'README.md'))
    )

let synced = 0
for (const name of dirs) {
  const pkgDir = join(packagesDir, name)
  console.log(`\n🧪 Running tests for ${name}...`)
  const stats = runAndParse(pkgDir)
  if (!stats) {
    console.log(`   ⚠️  No test targets found, skipping`)
    continue
  }
  console.log(`   ${stats.pass} pass, ${stats.fail} fail, ${stats.linesCoverage.toFixed(0)}% coverage`)

  const readmePath = join(pkgDir, 'README.md')
  const changed = injectStats(readmePath, stats)
  if (changed) {
    console.log(`   ✅ README stats synced`)
    synced++
  } else {
    console.log(`   ℹ️  Already up to date`)
  }
}

console.log(`\n📊 Synced ${synced} README(s)`)
if (synced > 0) {
  console.log('   Next: git add packages/*/README.md && git commit -m "docs: sync test stats"')
}
