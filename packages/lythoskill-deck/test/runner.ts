#!/usr/bin/env bun
import { mkdirSync, writeFileSync, symlinkSync, rmSync, readFileSync, readdirSync, lstatSync, existsSync, chmodSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { type CheckpointEntry } from '../../lythoskill-test-utils/src/bdd-runner.ts'
import { runAgentScenario as runAgentScenarioExt, type AgentScenario, type JudgeVerdict } from '../../lythoskill-test-utils/src/agent-bdd'
import { useAgent } from '../../lythoskill-test-utils/src/agents'

// ── 类型定义 ──────────────────────────────────────────────────

export interface MockSkill {
  frontmatter: Record<string, unknown>
  body?: string
}

export interface SkillEntryLike {
  path: string
  role?: string
  why_in_deck?: string
}

export interface Scenario {
  name: string
  given: {
    coldPool: Record<string, MockSkill>
    workingSet?: string[] // 预先放置的 skill 名（从 coldPool 复制）
    preExistingDirs?: string[] // 预先在 working set 创建的真目录（vendor tree 等）
    deck: {
      max_cards?: number
      cold_pool?: string
      working_set?: string
      innate?: string[] | Record<string, SkillEntryLike>
      tool?: string[] | Record<string, SkillEntryLike>
      combo?: string[] | Record<string, SkillEntryLike>
      transient?: Record<string, { path?: string; skills?: string[]; expires?: string }>
    }
  }
  when: string[]
  then: {
    workingSetHas?: string[]
    workingSetMissing?: string[]
    allSymlinks?: boolean
    lockValid?: boolean
    exitCode?: number
    stderrContains?: string[]
    stderrExcludes?: string[]
    stdoutContains?: string[]
    stdoutExcludes?: string[]
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
    const entries = deck[section]
    if (!entries) continue
    if (Array.isArray(entries)) {
      if (entries.length) {
        out += `\n[${section}]\n`
        out += toTomlField('skills', entries)
      }
    } else if (Array.isArray(entries.skills)) {
      // Legacy object wrapper: { skills: ['...'] }
      if (entries.skills.length) {
        out += `\n[${section}]\n`
        out += toTomlField('skills', entries.skills)
      }
    } else {
      // alias-as-key dict 格式
      for (const [alias, entry] of Object.entries(entries)) {
        out += `\n[${section}.skills.${alias}]\n`
        out += `path = "${entry.path}"\n`
        if (entry.role) out += `role = "${entry.role}"\n`
        if (entry.why_in_deck) out += `why_in_deck = "${entry.why_in_deck}"\n`
      }
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
    const entries = scenario.given.deck[section] ?? []
    const names = Array.isArray(entries) ? entries : Object.keys(entries)
    for (const name of names) {
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

  // 在 working set 预先创建真目录（vendor tree 等）
  if (scenario.given.preExistingDirs?.length) {
    mkdirSync(wsDir, { recursive: true })
    for (const dir of scenario.given.preExistingDirs) {
      mkdirSync(join(wsDir, dir), { recursive: true })
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

  if (then.stderrContains) {
    const lowerOutput = output.toLowerCase()
    for (const needle of then.stderrContains) {
      if (!lowerOutput.includes(needle.toLowerCase())) {
        errors.push(`stderr missing: "${needle}"`)
      }
    }
  }

  if (then.stderrExcludes) {
    const lowerOutput = output.toLowerCase()
    for (const needle of then.stderrExcludes) {
      if (lowerOutput.includes(needle.toLowerCase())) {
        errors.push(`stderr should not contain: "${needle}"`)
      }
    }
  }

  if (then.stdoutContains) {
    const lowerOutput = output.toLowerCase()
    for (const needle of then.stdoutContains) {
      if (!lowerOutput.includes(needle.toLowerCase())) {
        errors.push(`stdout missing: "${needle}"`)
      }
    }
  }

  if (then.stdoutExcludes) {
    const lowerOutput = output.toLowerCase()
    for (const needle of then.stdoutExcludes) {
      if (lowerOutput.includes(needle.toLowerCase())) {
        errors.push(`stdout should not contain: "${needle}"`)
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

// ── Agent BDD extensions ──────────────────────────────────────

export { parseAgentMd, type AgentScenario, type JudgeVerdict } from '../../lythoskill-test-utils/src/agent-bdd'
export type { JudgeCriterion } from '../../lythoskill-test-utils/src/agent-bdd'
export { runAgentScenario } from '../../lythoskill-test-utils/src/agent-bdd'

function setupAgentWorkdir(scenario: AgentScenario, workdir: string): void {
  if (existsSync(workdir)) rmSync(workdir, { recursive: true, force: true })
  mkdirSync(workdir, { recursive: true })

  // Isolate cold pool to workdir so agent ops never touch ~/.agents/skill-repos
  const deck = { ...scenario.given.deck }
  if (!deck.cold_pool) {
    deck.cold_pool = './cold-pool'
  }
  if (Object.keys(deck).length > 0) {
    writeFileSync(join(workdir, 'skill-deck.toml'), buildDeckToml(deck))
  }

  // Create a local deck CLI wrapper so the agent can use `./deck <cmd>`
  // Use a relative path so the wrapper is portable across machines.
  const deckCliPath = relative(workdir, resolve(import.meta.dir, '..', 'src', 'cli.ts'))
  const wrapperPath = join(workdir, 'deck')
  writeFileSync(
    wrapperPath,
    `#!/usr/bin/env sh\nexec bun "${deckCliPath}" "$@"\n`,
  )
  chmodSync(wrapperPath, 0o755)
}

// ── Deck-specific validation ────────────────────────────────────

function validateDeckCheckpoints(scenario: AgentScenario, checkpoints: CheckpointEntry[]): string[] {
  const errors: string[] = []

  const nameLower = scenario.name.toLowerCase()
  // Only validate deck-specific scenarios; skip generic/adapter smoke tests
  const isDeckScenario =
    nameLower.includes('deck') || nameLower.includes('introspection') ||
    nameLower.includes('add') || nameLower.includes('refresh') ||
    nameLower.includes('remove') || nameLower.includes('prune')
  if (!isDeckScenario) return errors

  let expectedStep = 'deck.introspection'
  if (nameLower.includes('add')) expectedStep = 'deck.add'
  else if (nameLower.includes('refresh')) expectedStep = 'deck.refresh'
  else if (nameLower.includes('remove')) expectedStep = 'deck.remove'
  else if (nameLower.includes('prune')) expectedStep = 'deck.prune'

  if (checkpoints.length === 0) {
    errors.push('no checkpoints found in _checkpoints/')
  } else {
    const cp = checkpoints[0]
    if (cp.step !== expectedStep) {
      errors.push(`expected step "${expectedStep}", got "${cp.step ?? '(missing)'}"`)
    }
    if (expectedStep === 'deck.introspection') {
      const count = cp.final_state?.tool_skill_count
      if (count !== 2) {
        errors.push(`expected final_state.tool_skill_count 2, got ${count ?? '(missing)'}`)
      }
    }
  }

  return errors
}

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const parallelIdx = args.indexOf('--parallel')
  const concurrency = parallelIdx >= 0 ? Number(args[parallelIdx + 1]) || 4 : 1

  const outputIdx = args.indexOf('--output')
  const baseDir = outputIdx >= 0
    ? args[outputIdx + 1]
    : resolve(import.meta.dir, '..', '..', '..', 'playground', 'test-runs')

  const runAgent = args.includes('--agent')

  const playerIdx = args.indexOf('--player')
  const player = playerIdx >= 0 ? args[playerIdx + 1] : 'claude'

  const scenarioDir = join(import.meta.dir, 'scenarios')

  // Load CLI BDD scenarios (.ts)
  const tsFiles = readdirSync(scenarioDir).filter(f => f.endsWith('.ts'))
  const cliScenarios: Scenario[] = []
  for (const file of tsFiles) {
    const mod = await import(join(scenarioDir, file))
    const s = mod.default || mod.scenario
    if (s) cliScenarios.push(s)
  }

  // Load Agent BDD scenarios (.agent.md) only when --agent
  const agentFiles = runAgent ? readdirSync(scenarioDir).filter(f => f.endsWith('.agent.md')) : []
  if (runAgent && !Bun.which(player)) {
    console.warn(`⚠️  ${player} not found in PATH, skipping Agent BDD scenarios`)
  }

  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

  const cliSandboxDir = join(baseDir, stamp)
  mkdirSync(cliSandboxDir, { recursive: true })
  if (agentFiles.length > 0) {
    console.log(`\n🧪 加载 ${cliScenarios.length} 个 CLI 场景 + ${agentFiles.length} 个 Agent 场景`)
    console.log(`📁 CLI 产物目录: ${cliSandboxDir}`)
    console.log(`📁 Agent BDD evidence → runs/agent-bdd/<ts>/ (tracked)\n`)
  } else {
    console.log(`\n🧪 加载 ${cliScenarios.length} 个 CLI 场景，并发度 ${concurrency}`)
    console.log(`📁 产物目录: ${cliSandboxDir}\n`)
  }

  const results: Result[] = []

  // Run CLI BDD scenarios in sandbox (parallel supported)
  const cliResults = concurrency > 1
    ? await runParallel(cliScenarios, cliSandboxDir, concurrency)
    : await Promise.all(cliScenarios.map(s => runScenario(s, cliSandboxDir)))
  results.push(...cliResults)

  // Run Agent BDD scenarios via unified test-utils runner (serial, claude-heavy)
  for (const file of agentFiles) {
    const scenarioPath = join(scenarioDir, file)
    const start = performance.now()
    const errors: string[] = []

    try {
      const result = await runAgentScenarioExt({
        scenarioPath,
        agent: useAgent(player),
        setupWorkdir: setupAgentWorkdir,
        baseDir: join(import.meta.dir, '..', '..', '..', 'runs', 'agent-bdd'),
      })

      // Deck-specific checkpoint validation
      errors.push(...validateDeckCheckpoints(result.scenario, result.checkpoints))

      if (result.agentResult.code !== 0) {
        errors.push(`agent exit code: ${result.agentResult.code}`)
      }

      if (result.verdict?.verdict === 'FAIL') {
        errors.push(`LLM judge: ${result.verdict.reason}`)
      } else if (result.verdict?.verdict === 'ERROR') {
        console.warn(`⚠️  LLM judge ERROR for "${result.scenario.name}": ${result.verdict.error ?? 'unknown'}`)
      }

      results.push({
        name: result.scenario.name,
        pass: errors.length === 0,
        workdir: result.artifactDir,
        errors,
        duration: performance.now() - start,
      })
    } catch (e) {
      errors.push(`scenario exception: ${e instanceof Error ? e.message : String(e)}`)
      results.push({
        name: file.replace('.agent.md', ''),
        pass: false,
        workdir: '',
        errors,
        duration: performance.now() - start,
      })
    }
  }

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

if (import.meta.main) {
  main()
}
