#!/usr/bin/env bun
/**
 * scripts/check-site-deck-snippets.ts
 *
 * Site pages embed deck snippets for external users to copy-paste.
 * Those snippets are invisible to validate-example-decks (which only
 * scans examples/decks/*.toml), so an upstream rename (e.g. mattpocock's
 * diagnose → diagnosing-bugs, 2026-07) silently broke the quick start
 * while CI stayed green.
 *
 * Guard: every `path = "<locator>"` literal in site markdown pages must
 * appear in some examples/decks TOML file — those decks ARE remote-validated
 * in CI, so a site snippet can never drift past the validated set.
 *
 * Exit 0 = all site locators covered. Exit 1 = drift found (loud list).
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const SITE_DIR = join(ROOT, 'site')
const DECKS_DIR = join(ROOT, 'examples', 'decks')
const SKIP_DIRS = new Set(['node_modules', 'dist', 'cache', 'drafts'])

const PATH_RE = /path\s*=\s*"([^"]+)"/g

function walk(dir: string, ext: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) results.push(...walk(full, ext))
    } else if (entry.name.endsWith(ext)) {
      results.push(full)
    }
  }
  return results
}

function extractLocators(file: string): string[] {
  const content = readFileSync(file, 'utf8')
  return [...content.matchAll(PATH_RE)].map((m) => m[1])
}

function main(): void {
  const deckLocators = new Set<string>()
  for (const deck of walk(DECKS_DIR, '.toml')) {
    for (const loc of extractLocators(deck)) deckLocators.add(loc)
  }

  const offenders: string[] = []
  for (const page of walk(SITE_DIR, '.md')) {
    for (const loc of extractLocators(page)) {
      if (!deckLocators.has(loc)) {
        offenders.push(`${relative(ROOT, page)}: ${loc}`)
      }
    }
  }

  if (offenders.length > 0) {
    console.error('❌ Site deck snippets reference locators not present in any examples/decks/*.toml:')
    for (const o of offenders) console.error(`   ${o}`)
    console.error('')
    console.error('Fix: update the snippet to a validated locator, or add the locator to an example deck.')
    console.error('(examples/decks/*.toml are remote-validated in CI — the site must not drift past them.)')
    process.exit(1)
  }

  console.log(`✅ All site deck snippet locators covered by examples/decks (${deckLocators.size} validated locators)`)
}

main()
