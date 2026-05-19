#!/usr/bin/env bun
// README version drift check — runs in pre-commit.
//
// Scans all packages/*/README.md for package@version references
// and verifies they match the corresponding package.json version.
//
// Exit codes:
//   0 — all versions match (or package has no version references)
//   1 — drift detected (blocks commit)
//
// Fix drift:
//   cd packages/<name> && bun ../../scripts/sync-readme-version.ts

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const packagesDir = join(root, 'packages')

let driftFound = false

for (const name of readdirSync(packagesDir)) {
  const pkgDir = join(packagesDir, name)
  const pkgJsonPath = join(pkgDir, 'package.json')
  const readmePath = join(pkgDir, 'README.md')

  if (!existsSync(pkgJsonPath) || !existsSync(readmePath)) continue

  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
  const version = pkg.version as string | undefined
  const pkgName = pkg.name as string | undefined
  if (!version || !pkgName) continue

  const readme = readFileSync(readmePath, 'utf-8')
  const escapedName = pkgName.replace('/', '\\/')

  // Find all version references for this package in README
  const pattern = new RegExp(`${escapedName}@(?:latest|[\\d.]+)`, 'g')
  const matches = [...readme.matchAll(pattern)].map((m) => m[0])

  if (matches.length === 0) continue // No version references — OK

  const expected = `${pkgName}@${version}`
  const allMatch = matches.every((m) => m === expected)

  if (!allMatch) {
    const offenders = [...new Set(matches.filter((m) => m !== expected))]
    console.error(`❌ ${name}: README has ${offenders.join(', ')} — package.json is ${version}`)
    driftFound = true
  }
}

if (driftFound) {
  console.error('\n💡 Fix: cd packages/<name> && bun ../../scripts/sync-readme-version.ts')
  process.exit(1)
} else {
  console.log('✅ README versions match package.json')
}
