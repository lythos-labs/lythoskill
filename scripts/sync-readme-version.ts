#!/usr/bin/env bun
/**
 * Sync README version placeholders to match package.json version.
 *
 * Run from a package directory via prepublishOnly:
 *   "scripts": { "prepublishOnly": "bun ../../scripts/sync-readme-version.ts" }
 *
 * Replaces patterns like @lythos/skill-deck@0.14.0 or @lythos/skill-deck@latest
 * with the current version from package.json. If any replacements occur,
 * README.md is rewritten in place.
 *
 * Exit codes:
 *   0 — success (with or without changes)
 *   1 — missing package.json, version, or name
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const pkgDir = process.cwd()
const pkgJsonPath = join(pkgDir, 'package.json')

if (!existsSync(pkgJsonPath)) {
  console.error('❌ No package.json in', pkgDir)
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
const version = pkg.version
const name = pkg.name

if (!version || !name) {
  console.error('❌ Missing version or name in package.json')
  process.exit(1)
}

const readmePath = join(pkgDir, 'README.md')
if (!existsSync(readmePath)) {
  console.log('ℹ️  No README.md, skipping')
  process.exit(0)
}

let readme = readFileSync(readmePath, 'utf-8')
const escapedName = name.replace('/', '\\/')
const pattern = new RegExp(`${escapedName}@(?:latest|[\\d.]+)`, 'g')

const before = readme
readme = readme.replace(pattern, `${name}@${version}`)

if (readme !== before) {
  writeFileSync(readmePath, readme)
  const count = (before.match(pattern) || []).length
  console.log(`✅ Synced ${name}@${version} in README.md (${count} occurrence(s))`)
} else {
  console.log(`ℹ️  No version placeholders to sync for ${name}`)
}
