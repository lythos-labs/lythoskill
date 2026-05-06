#!/usr/bin/env bun
/**
 * scripts/validate-example-decks.ts
 *
 * T9 of EPIC-20260507020846020. Iterates examples/decks/*.toml and
 * runs `deck validate --remote` on each. Fails CI if any deck has
 * structural errors (malformed TOML, non-FQ locator) or a 'invalid'
 * remote ValidationReport.
 *
 * 'ambiguous' remote results (rate-limited / private / network-error)
 * do NOT fail CI — they are informational.
 */

import { readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { buildDeckValidation } from '../packages/lythoskill-deck/src/validate.ts'

const EXAMPLES_DIR = resolve(import.meta.dirname, '..', 'examples', 'decks')

async function main(): Promise<void> {
  const decks = readdirSync(EXAMPLES_DIR)
    .filter((f) => f.endsWith('.toml'))
    .map((f) => join(EXAMPLES_DIR, f))
    .sort()

  if (decks.length === 0) {
    console.error(`❌ No example decks found in ${EXAMPLES_DIR}`)
    process.exit(1)
  }

  const skipRemote = process.env.LYTHOSKILL_VALIDATE_NO_REMOTE === '1'
  const remote = !skipRemote
  console.log(`🔍 Validating ${decks.length} example deck(s) [remote: ${remote ? 'on' : 'off'}]\n`)

  let failures = 0
  const summary: Array<{ deck: string; status: string; errorCount: number; ambiguous: number }> = []

  for (const deckPath of decks) {
    const name = deckPath.replace(EXAMPLES_DIR + '/', '')
    const report = await buildDeckValidation(deckPath, undefined, { remote })
    const ambiguousCount = report.entries.filter(
      (e) => e.remote && e.remote.status === 'ambiguous',
    ).length

    summary.push({
      deck: name,
      status: report.status,
      errorCount: report.errors.length,
      ambiguous: ambiguousCount,
    })

    const icon = report.status === 'valid' ? '✅' : '❌'
    console.log(`${icon} ${name}`)
    if (report.warnings.length > 0) {
      for (const w of report.warnings) console.log(`     ⚠️  ${w}`)
    }
    if (report.status === 'invalid') {
      for (const e of report.errors) console.log(`     ❌ ${e}`)
      failures++
    } else if (ambiguousCount > 0) {
      console.log(`     (${ambiguousCount} entr${ambiguousCount === 1 ? 'y' : 'ies'} ambiguous — likely rate-limited; not failing CI)`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Decks: ${decks.length}  Pass: ${decks.length - failures}  Fail: ${failures}`)

  if (failures > 0) {
    console.error(`\n❌ ${failures} deck(s) failed validation`)
    process.exit(1)
  }

  console.log('\n✅ All example decks validate cleanly')
}

main().catch((err) => {
  console.error('❌ validate-example-decks.ts crashed:', err)
  process.exit(1)
})
