#!/usr/bin/env bun
/**
 * BDD Coverage Dashboard — scan reproduce.sh scenarios, aggregate verdicts.
 *
 * Usage:
 *   bun scripts/bdd-coverage.ts           # markdown table
 *   bun scripts/bdd-coverage.ts --impact  # change-impact: which scenarios need re-run
 *
 * Zero dependencies, zero LLM calls, CI-safe.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { spawnSync } from 'node:child_process'

interface ScenarioVerdict {
  scenario: string
  package: string
  verdict: string
  lastRun: string
  criteria: string
  path: string
}

function findScenarios(): ScenarioVerdict[] {
  const results: ScenarioVerdict[] = []

  // Package-co-located scenarios
  const pkgDir = 'packages'
  if (existsSync(pkgDir)) {
    for (const pkg of readdirSync(pkgDir)) {
      const scenariosDir = join(pkgDir, pkg, 'test', 'scenarios')
      if (!existsSync(scenariosDir)) continue
      for (const dir of readdirSync(scenariosDir)) {
        if (!dir.endsWith('-bdd')) continue
        const verdictPath = join(scenariosDir, dir, 'judge-verdict.json')
        if (!existsSync(verdictPath)) continue
        try {
          const v = JSON.parse(readFileSync(verdictPath, 'utf-8'))
          const criteria = v.criteria || {}
          const total = Object.keys(criteria).length
          const pass = Object.values(criteria as Record<string, any>).filter(
            (c: any) => c.pass === true || c.met === true || c.status === 'PASS'
          ).length
          results.push({
            scenario: dir.replace(/-bdd$/, ''),
            package: pkg,
            verdict: v.verdict || 'UNKNOWN',
            lastRun: v.judged_at?.slice(0, 10) || v.timestamp?.slice(0, 10) || 'unknown',
            criteria: `${pass}/${total}`,
            path: join(scenariosDir, dir),
          })
        } catch { /* skip invalid */ }
      }
    }
  }

  // Showcase cross-cutting scenarios
  const showcaseDir = 'showcase'
  if (existsSync(showcaseDir)) {
    for (const dir of readdirSync(showcaseDir)) {
      if (!dir.includes('-bdd-')) continue
      const verdictPath = join(showcaseDir, dir, 'judge-verdict.json')
      if (!existsSync(verdictPath)) continue
      try {
        const v = JSON.parse(readFileSync(verdictPath, 'utf-8'))
        const criteria = v.criteria || {}
        const total = Object.keys(criteria).length
        const pass = Object.values(criteria as Record<string, any>).filter(
          (c: any) => c.pass === true || c.met === true || c.status === 'PASS'
        ).length
        results.push({
          scenario: dir,
          package: 'showcase',
          verdict: v.verdict || 'UNKNOWN',
          lastRun: v.judged_at?.slice(0, 10) || v.timestamp?.slice(0, 10) || 'unknown',
          criteria: total > 0 ? `${pass}/${total}` : '-',
          path: join(showcaseDir, dir),
        })
      } catch { /* skip */ }
    }
  }

  return results
}

function printTable(scenarios: ScenarioVerdict[]): void {
  if (scenarios.length === 0) {
    console.log('No BDD scenarios found.')
    return
  }

  const pass = scenarios.filter(s => s.verdict === 'PASS').length
  const fail = scenarios.filter(s => s.verdict === 'FAIL').length
  const total = scenarios.length

  console.log(`## BDD Coverage Dashboard — ${new Date().toISOString().slice(0, 10)}`)
  console.log()
  console.log(`| Scenario | Package | Verdict | Last Run | Criteria |`)
  console.log(`|----------|---------|---------|----------|----------|`)
  for (const s of scenarios) {
    const stale = (Date.now() - new Date(s.lastRun).getTime()) > 7 * 24 * 60 * 60 * 1000 ? ' ⚠️' : ''
    console.log(`| ${s.scenario} | ${s.package} | ${s.verdict} | ${s.lastRun}${stale} | ${s.criteria} |`)
  }
  console.log()
  console.log(`**${total} scenarios**: ${pass} PASS, ${fail} FAIL`)
}

function printImpact(scenarios: ScenarioVerdict[]): void {
  const changed = spawnSync('git', ['diff', '--name-only', 'HEAD~1'], { encoding: 'utf-8' })
  if (changed.status !== 0 || !changed.stdout.trim()) {
    console.log('No git changes detected.')
    return
  }
  const changedFiles = changed.stdout.trim().split('\n')
  const affectedPackages = new Set<string>()
  for (const f of changedFiles) {
    const m = f.match(/^packages\/([^/]+)/)
    if (m) affectedPackages.add(m[1])
  }

  if (affectedPackages.size === 0) {
    console.log('No package source changes — no BDD re-run needed.')
    return
  }

  const affected = scenarios.filter(s => affectedPackages.has(s.package))
  console.log(`## Change Impact — ${changedFiles.length} file(s) changed`)
  console.log()
  console.log(`Affected packages: ${[...affectedPackages].join(', ')}`)
  console.log()
  if (affected.length === 0) {
    console.log('No BDD scenarios affected by these changes.')
  } else {
    console.log(`**${affected.length} scenario(s) may need re-run:**`)
    for (const s of affected) {
      console.log(`  - ${s.package}/${s.scenario} (last run: ${s.lastRun})`)
    }
  }
}

const args = process.argv.slice(2)
const scenarios = findScenarios()

if (args.includes('--impact')) {
  printImpact(scenarios)
} else {
  printTable(scenarios)
}
