#!/usr/bin/env bun
import { mkdirSync, writeFileSync, symlinkSync, rmSync, readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// ── 类型定义 ──────────────────────────────────────────────────

export interface MockSkill {
  frontmatter: Record<string, unknown>
  body?: string
}

export interface Scenario {
  name: string
  given: {
    coldPool: Record<string, MockSkill>
    workingSet?: string[] // 预先放置的 skill 名（从 coldPool 复制）
    deck: {
      max_cards?: number
      cold_pool?: string
      working_set?: string
      innate?: string[]
      tool?: string[]
      combo?: string[]
      transient?: Record<string, { skills?: string[]; expires?: string }>
    }
  }
  when: string[]
  then: {
    workingSetHas?: string[]
    workingSetMissing?: string[]
    allSymlinks?: boolean
    lockValid?: boolean
    exitCode?: number
  }
}

export interface Result {
  name: string
  pass: boolean
  workdir: string
  errors: string[]
  duration: number
}

// ── 工具 ──────────────────────────────────────────────────────

function toTomlField(key: string, val: unknown, indent = ''): string {
  if (val == null) return ''
  if (Array.isArray(val)) {
    return `${indent}${key} = [${val.map(v => `"${v}"`).join(', ')}]\n`
  }
  if (typeof val === 'object') {
    let out = ''
    for (const [k, v] of Object.entries(val)) {
      out += toTomlField(k, v, indent)
    }
    return out
  }
  if (typeof val === 'string') {
    return `${indent}${key} = "${val}"\n`
  }
  return `${indent}${key} = ${val}\n`
}

function buildDeckToml(deck: Scenario['given']['deck']): string {
  let out = '[deck]\n'
  if (deck.max_cards != null) out += `max_cards = ${deck.max_cards}\n`
  if (deck.cold_pool != null) out += `cold_pool = "${deck.cold_pool}"\n`
  if (deck.working_set != null) out += `working_set = "${deck.working_set}"\n`

  for (const section of ['innate', 'tool', 'combo'] as const) {
    if (deck[section]?.length) {
      out += `\n[${section}]\n`
      out += toTomlField('skills', deck[section])
    }
  }

  if (deck.transient) {
    for (const [name, cfg] of Object.entries(deck.transient)) {
      out += `\n[transient.${name}]\n`
      if (cfg.skills) out += toTomlField('skills', cfg.skills)
      if (cfg.expires) out += `expires = "${cfg.expires}"\n`
    }
  }

  return out
}

function createMockSkill(dir: string, name: string, skill: MockSkill): void {
  const skillDir = join(dir, name)
  mkdirSync(skillDir, { recursive: true })
  const fm = Object.entries(skill.frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.map(x => `"${x}"`).join(', ')}]`
      return `${k}: ${typeof v === 'string' ? `"${v}"` : v}`
    })
    .join('\n')
  const body = skill.body || `# ${name}\n`
  writeFileSync(join(skillDir, 'SKILL.md'), `---\n${fm}\n---\n\n${body}`)
}

function setupWorkdir(scenario: Scenario, workdir: string): void {
  const cpDir = join(workdir, 'cold-pool')
  const wsDir = join(workdir, '.claude', 'skills')

  // 创建冷池
  mkdirSync(cpDir, { recursive: true })
  for (const [name, skill] of Object.entries(scenario.given.coldPool)) {
    createMockSkill(cpDir, name, skill)
  }

  //  innate skills 如果在 coldPool 找不到，从本包 skill/ 复制到项目本地 skills/
  const selfSkillDir = resolve(import.meta.dir, '..', 'skill')
  for (const section of ['innate', 'tool', 'combo'] as const) {
    for (const name of scenario.given.deck[section] ?? []) {
      if (name === 'lythoskill-deck' && existsSync(selfSkillDir)) {
        const localDir = join(workdir, 'skills', name)
        mkdirSync(localDir, { recursive: true })
        for (const entry of readdirSync(selfSkillDir, { withFileTypes: true, recursive: true })) {
          const src = join(entry.parentPath, entry.name)
          const rel = src.slice(selfSkillDir.length + 1)
          const dst = join(localDir, rel)
          if (entry.isDirectory()) {
            mkdirSync(dst, { recursive: true })
          } else {
            writeFileSync(dst, readFileSync(src))
          }
        }
      }
    }
  }

  // 创建 working set（如果有预先放置的 skill）
  if (scenario.given.workingSet?.length) {
    mkdirSync(wsDir, { recursive: true })
    for (const name of scenario.given.workingSet) {
      if (existsSync(join(cpDir, name))) {
        symlinkSync(join(cpDir, name), join(wsDir, name))
      }
    }
  }

  // 写入 skill-deck.toml
  const deck = { ...scenario.given.deck, cold_pool: scenario.given.deck.cold_pool || cpDir }
  writeFileSync(join(workdir, 'skill-deck.toml'), buildDeckToml(deck))

  return workdir
}

function runCommands(workdir: string, commands: string[]): { code: number; output: string } {
  let code = 0
  let output = ''
  for (const cmd of commands) {
    const args = cmd.split(/\s+/)
    // 如果命令是 lythoskill-deck，指向本地实现
    if (args[0] === 'lythoskill-deck') {
      const impl = resolve(import.meta.dir, '..', 'src', 'cli.ts')
      args[0] = 'bun'
      args.splice(1, 0, impl)
    }
    const result = spawnSync(args[0], args.slice(1), {
      cwd: workdir,
      encoding: 'utf-8',
      env: { ...process.env, PATH: process.env.PATH },
    })
    output += result.stdout + result.stderr
    if (result.status !== 0) {
      code = result.status ?? 1
      break
    }
  }
  return { code, output }
}

function assert(scenario: Scenario, workdir: string, code: number, output: string): string[] {
  const errors: string[] = []
  const then = scenario.then
  const wsDir = join(workdir, '.claude', 'skills')

  if (then.exitCode != null && code !== then.exitCode) {
    errors.push(`exit code: expected ${then.exitCode}, got ${code}`)
  }

  const actual = existsSync(wsDir) ? readdirSync(wsDir) : []

  for (const name of then.workingSetHas ?? []) {
    if (!actual.includes(name)) {
      errors.push(`working set missing: ${name}`)
    }
  }

  for (const name of then.workingSetMissing ?? []) {
    if (actual.includes(name)) {
      errors.push(`working set should not have: ${name}`)
    }
  }

  if (then.allSymlinks) {
    for (const name of actual) {
      const st = lstatSync(join(wsDir, name))
      if (!st.isSymbolicLink()) {
        errors.push(`${name} is not a symlink`)
      }
    }
  }

  if (then.lockValid) {
    const lockPath = join(workdir, 'skill-deck.lock')
    if (!existsSync(lockPath)) {
      errors.push('skill-deck.lock not generated')
    } else {
      try {
        const lock = JSON.parse(readFileSync(lockPath, 'utf-8'))
        if (!lock.version || !Array.isArray(lock.skills)) {
          errors.push('skill-deck.lock invalid schema')
        }
      } catch {
        errors.push('skill-deck.lock not valid JSON')
      }
    }
  }

  return errors
}

// ── 核心 ──────────────────────────────────────────────────────

export async function runScenario(scenario: Scenario, runsDir: string): Promise<Result> {
  const workdir = join(runsDir, scenario.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase())
  // 清理旧目录（支持重跑同一场景）
  if (existsSync(workdir)) rmSync(workdir, { recursive: true, force: true })

  const start = performance.now()
  setupWorkdir(scenario, workdir)
  const { code, output } = runCommands(workdir, scenario.when)
  const errors = assert(scenario, workdir, code, output)
  const duration = performance.now() - start

  return {
    name: scenario.name,
    pass: errors.length === 0,
    workdir,
    errors,
    duration,
  }
}

export async function runParallel(scenarios: Scenario[], runsDir: string, concurrency = 4): Promise<Result[]> {
  const results: Result[] = []
  const queue = [...scenarios]

  async function worker() {
    while (queue.length) {
      const s = queue.shift()!
      const r = await runScenario(s, runsDir)
      results.push(r)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

// ── CLI ──────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const parallelIdx = args.indexOf('--parallel')
  const concurrency = parallelIdx >= 0 ? Number(args[parallelIdx + 1]) || 4 : 1

  const outputIdx = args.indexOf('--output')
  const baseDir = outputIdx >= 0
    ? args[outputIdx + 1]
    : resolve(import.meta.dir, '..', '..', '..', 'playground', 'test-runs')

  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  const runsDir = join(baseDir, stamp)
  mkdirSync(runsDir, { recursive: true })

  // 自动加载 test/scenarios/*.ts
  const scenarioDir = join(import.meta.dir, 'scenarios')
  const files = readdirSync(scenarioDir).filter(f => f.endsWith('.ts'))

  const scenarios: Scenario[] = []
  for (const file of files) {
    const mod = await import(join(scenarioDir, file))
    const s = mod.default || mod.scenario
    if (s) scenarios.push(s)
  }

  console.log(`\n🧪 加载 ${scenarios.length} 个场景，并发度 ${concurrency}`)
  console.log(`📁 产物目录: ${runsDir}\n`)

  const results = concurrency > 1
    ? await runParallel(scenarios, runsDir, concurrency)
    : await Promise.all(scenarios.map(s => runScenario(s, runsDir)))

  let passed = 0
  for (const r of results) {
    const icon = r.pass ? '✅' : '❌'
    console.log(`${icon} ${r.name} (${r.duration.toFixed(0)}ms)`)
    if (!r.pass) {
      for (const e of r.errors) console.log(`   → ${e}`)
      console.log(`   📁 ${r.workdir}`)
    }
    if (r.pass) passed++
  }

  console.log(`\n${passed}/${results.length} passed\n`)
  process.exit(passed === results.length ? 0 : 1)
}

main()
