#!/usr/bin/env bun
/**
 * Intent/Plan coverage evaluator.
 *
 * For each package, classifies exported functions as plan (pure, L0-testable)
 * or execute (IO-injected, L2 BDD-covered). Cross-references Bun's coverage
 * output to surface the real gaps: plan functions below threshold are bugs;
 * execute functions below threshold are expected (BDD covers them).
 *
 * Usage: bun scripts/intent-plan-coverage.ts [--package <name>]
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { $ } from 'bun'

const PKG_DIR = 'packages'
const PLAN_THRESHOLD = 80  // plan functions below this are suspicious
const EXEC_NAMES = new Set(['execute', 'run', 'link', 'add', 'remove', 'refresh', 'fetch', 'clone', 'spawn', 'sync', 'prune', 'archive'])

interface FuncMeta {
  name: string
  file: string
  isPlan: boolean      // pure logic, no IO param
  isExec: boolean      // takes io? parameter or has exec-verb name
  hasIOParam: boolean   // explicit io?: parameter in signature
  lines?: { start: number; end: number }
}

interface CoverageLine {
  file: string
  stmtPct: number
  branchPct: number
  uncoveredLines: string
}

/** Walk source files in a package (skip test files). */
function walkSource(pkgPath: string): string[] {
  const srcDir = join(pkgPath, 'src')
  if (!existsSync(srcDir)) return []
  const files: string[] = []
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      if (entry.isDirectory()) { walk(p) }
      else if (entry.name.endsWith('.ts') && !entry.name.includes('.test.')) { files.push(p) }
    }
  }
  walk(srcDir)
  return files
}

/** Parse exported functions from source. */
function parseFuncs(filePath: string): FuncMeta[] {
  const src = readFileSync(filePath, 'utf-8')
  const funcs: FuncMeta[] = []
  const re = /export (?:async )?function (\w+)\s*\(([^)]*)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const name = m[1]
    const params = m[2]
    const hasIOParam = /\bio\?\s*:/.test(params) || /\bio\s*:/.test(params)
    // A function is a plan if it does NOT have an IO param and its name doesn't start with exec verbs
    const nameStem = name.toLowerCase()
    const isExecVerb = EXEC_NAMES.has(nameStem) ||
      EXEC_NAMES.has(nameStem.replace(/^run|^execute/, '').toLowerCase()) ||
      nameStem.startsWith('execute') || nameStem.startsWith('run')
    // If it has an IO param, it's definitely an executor
    // If it has an exec-verb name AND no IO param, it might be a plan-builder for that execute phase (e.g. buildRefreshPlan)
    const isExec = hasIOParam
    const isPlan = !hasIOParam && (nameStem.startsWith('build') || nameStem.startsWith('parse') ||
      nameStem.startsWith('resolve') || nameStem.startsWith('validate') ||
      nameStem.startsWith('find') || nameStem.startsWith('format') ||
      nameStem.startsWith('normalize') || nameStem.startsWith('detect') ||
      nameStem.startsWith('expand') || nameStem.startsWith('migrate') ||
      nameStem.startsWith('is') || nameStem === 'schema' ||
      (!isExecVerb && !hasIOParam))
    funcs.push({ name, file: basename(filePath), isPlan, isExec, hasIOParam })
  }
  return funcs
}

/** Parse Bun coverage output (from stdin or file). */
function parseCoverage(text: string): CoverageLine[] {
  const lines: CoverageLine[] = []
  for (const line of text.split('\n')) {
    const parts = line.split('|').map(s => s.trim())
    const file = parts[0]
    if (!file || !file.includes('packages/')) continue
    const stmtPct = parseFloat(parts[1]) || 0
    const branchPct = parseFloat(parts[2]) || 0
    const uncovered = parts[3] || ''
    lines.push({ file, stmtPct, branchPct, uncoveredLines: uncovered })
  }
  return lines
}

/** Find BDD reproduce.sh scenes for a package. */
function findBddScenes(pkgPath: string): string[] {
  const scenesDir = join(pkgPath, 'test', 'scenarios')
  if (!existsSync(scenesDir)) return []
  const scenes: string[] = []
  function walk(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) { walk(join(dir, entry.name)) }
      else if (entry.name === 'reproduce.sh') { scenes.push(dir) }
    }
  }
  walk(scenesDir)
  return scenes
}

// ── Main ──

async function main() {
  const filterPkg = process.argv.includes('--package') ? process.argv[process.argv.indexOf('--package') + 1] : null

  // Run coverage once
  const pkgDirs = readdirSync(PKG_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => join(PKG_DIR, e.name))
    .filter(p => !filterPkg || p.includes(filterPkg))

  const srcDirs = pkgDirs.filter(p => existsSync(join(p, 'src')))
  const args = srcDirs.map(p => join(p, 'src')).join(' ')
  const result = await $`bun test --coverage ${args}`.nothrow().quiet()
  const covText = result.stderr.toString() + result.stdout.toString()

  const coverage = parseCoverage(covText)

  console.log('# Intent / Plan / Execute Coverage Assessment\n')
  console.log(`> Generated ${new Date().toISOString().split('T')[0]}`)
  console.log(`> Plan threshold: ${PLAN_THRESHOLD}% — below this is a real gap\n`)

  for (const pkg of pkgDirs) {
    const pkgName = basename(pkg)
    const srcFiles = walkSource(pkg)
    if (srcFiles.length === 0) continue

    const bddScenes = findBddScenes(pkg)
    const allFuncs: FuncMeta[] = []
    for (const f of srcFiles) { allFuncs.push(...parseFuncs(f)) }
    const plans = allFuncs.filter(f => f.isPlan)
    const execs = allFuncs.filter(f => f.isExec)
    const total = allFuncs.length

    // Cross-ref with coverage
    const pkgCoverage = coverage.filter(c => c.file.includes(`/${pkgName}/`))
    const avgStmt = pkgCoverage.length > 0
      ? pkgCoverage.reduce((s, c) => s + c.stmtPct, 0) / pkgCoverage.length
      : 0

    console.log(`## ${pkgName}`)
    console.log(`- ${plans.length} plan functions, ${execs.length} execute functions (${total} total)`)
    console.log(`- Coverage: ${avgStmt.toFixed(1)}% stmt`)
    console.log(`- BDD scenes: ${bddScenes.length}`)

    // Flag: plans with concerning names (might be executors misclassified)
    const suspiciousExecs = execs.filter(e => !e.hasIOParam)
    if (suspiciousExecs.length > 0) {
      console.log(`- ⚠️  ${suspiciousExecs.length} executor(s) without IO injection:`)
      for (const e of suspiciousExecs) {
        console.log(`  - \`${e.name}\` in ${e.file}`)
      }
    }

    // Flag: low-coverage files that are plan-heavy (these are real gaps)
    const planHeavy = pkgCoverage.filter(c => {
      const fName = basename(c.file)
      const funcsInFile = allFuncs.filter(f => f.file === fName)
      const planCount = funcsInFile.filter(f => f.isPlan).length
      return planCount > 0 && c.stmtPct < PLAN_THRESHOLD
    })
    if (planHeavy.length > 0) {
      console.log(`- 🔴 Plan functions below ${PLAN_THRESHOLD}%:`)
      for (const c of planHeavy) {
        const funcsInFile = allFuncs.filter(f => f.file === basename(c.file))
        const planNames = funcsInFile.filter(f => f.isPlan).map(f => f.name).join(', ')
        console.log(`  - ${basename(c.file)}: ${c.stmtPct.toFixed(0)}% (plan funcs: ${planNames})`)
      }
    }

    console.log()
  }

  console.log('---')
  console.log('**Plan** = pure logic, L0-testable (no IO param, build/parse/resolve/validate prefix).')
  console.log('**Execute** = IO glue, BDD-covered (takes `io?` param or exec-verb name).')
  console.log(`🔴 = plan function coverage below ${PLAN_THRESHOLD}% → real gap, needs L0 tests.`)
}

main().catch(console.error)
