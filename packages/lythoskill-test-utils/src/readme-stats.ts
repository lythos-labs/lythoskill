/**
 * README stats sync — extracts test results from bun test output and injects
 * coverage table + pass/fail count into README between markers.
 *
 * Markers in README:
 *   <!-- test-stats -->
 *   ... auto-generated content ...
 *   <!-- /test-stats -->
 *
 * Usage: bun run scripts/sync-readme-stats.ts [package-name]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

export interface TestStats {
  pass: number
  fail: number
  total: number
  funcsCoverage: number
  linesCoverage: number
  table: string
}

const MARKER_OPEN = '<!-- test-stats -->'
const MARKER_CLOSE = '<!-- /test-stats -->'

/** Run bun test and extract coverage + pass/fail counts from output. */
export function runAndParse(packageDir: string): TestStats | null {
  const srcDir = join(packageDir, 'src')
  const testDir = join(packageDir, 'test')
  const targets: string[] = []
  if (existsSync(srcDir)) targets.push(srcDir)
  if (existsSync(testDir)) targets.push(testDir)
  if (targets.length === 0) return null

  // Only test src/ to avoid counting readme-stats check tests
  const srcTargets: string[] = []
  if (existsSync(srcDir)) srcTargets.push(srcDir)
  if (existsSync(testDir)) srcTargets.push(testDir)
  if (srcTargets.length === 0) return null

  const r = spawnSync('bun', ['test', '--coverage', ...srcTargets], {
    encoding: 'utf-8',
    cwd: packageDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120_000,
  })

  const output = r.stdout + r.stderr // bun test writes coverage to stderr

  // Parse pass/fail
  const passMatch = output.match(/(\d+)\s+pass/)
  const failMatch = output.match(/(\d+)\s+fail/)
  const totalMatch = output.match(/Ran\s+(\d+)\s+tests/)
  const pass = passMatch ? parseInt(passMatch[1]) : 0
  const fail = failMatch ? parseInt(failMatch[1]) : 0
  const total = totalMatch ? parseInt(totalMatch[1]) : 0

  // Parse coverage table — extract from "File ... |" header to the closing "---" separator.
  // Compress wide terminal spacing for markdown readability.
  const lines = output.split('\n')
  const rawLines: string[] = []
  let inTable = false
  for (const line of lines) {
    if (line.startsWith('File') && line.includes('| % Funcs')) { inTable = true }
    if (inTable) {
      if (line.startsWith('---') && rawLines.length > 1) break // closing separator — stop
      rawLines.push(line)
    }
  }
  // Normalize spacing, insert markdown table separator after header
  const clean = rawLines
    .filter(l => !/^-{3,}\|/.test(l)) // skip separator lines from terminal output
    .map(l => l.replace(/\s{2,}/g, ' ').replace(/ \| /g, ' | '))
  // Insert markdown separator after header (first line)
  if (clean.length >= 1) {
    const cols = clean[0].split('|').length - 1
    clean.splice(1, 0, '|' + ' --- |'.repeat(cols))
  }
  const table = clean.join('\n')

  // Parse All files coverage row
  const allFilesMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/)
  const funcsCoverage = allFilesMatch ? parseFloat(allFilesMatch[1]) : 0
  const linesCoverage = allFilesMatch ? parseFloat(allFilesMatch[2]) : 0

  return { pass, fail, total, funcsCoverage, linesCoverage, table }
}

/** Build the markdown block to inject between markers. */
export function buildStatsBlock(stats: TestStats): string {
  const badge = stats.fail === 0
    ? `![pass](https://img.shields.io/badge/${stats.pass}_pass-0_fail-brightgreen)`
    : `![fail](https://img.shields.io/badge/${stats.pass}_pass-${stats.fail}_fail-red)`
  const covBadge = stats.linesCoverage >= 90
    ? `![coverage](https://img.shields.io/badge/coverage-${stats.linesCoverage.toFixed(0)}%25-brightgreen)`
    : stats.linesCoverage >= 70
    ? `![coverage](https://img.shields.io/badge/coverage-${stats.linesCoverage.toFixed(0)}%25-yellow)`
    : `![coverage](https://img.shields.io/badge/coverage-${stats.linesCoverage.toFixed(0)}%25-red)`

  return [
    `${badge} ${covBadge}`,
    '',
    '```',
    stats.table,
    '```',
  ].join('\n')
}

/** Inject stats block into README between markers. Returns true if changed. */
export function injectStats(readmePath: string, stats: TestStats): boolean {
  let content = readFileSync(readmePath, 'utf-8')
  const block = buildStatsBlock(stats)
  const marked = `${MARKER_OPEN}\n${block}\n${MARKER_CLOSE}`

  if (content.includes(MARKER_OPEN)) {
    const newContent = content.replace(
      new RegExp(`${MARKER_OPEN}[\\s\\S]*?${MARKER_CLOSE}`, 'g'),
      marked
    )
    if (newContent === content) return false
    writeFileSync(readmePath, newContent)
    return true
  }

  // No marker yet — append at end
  writeFileSync(readmePath, content.trimEnd() + '\n\n' + marked + '\n')
  return true
}
