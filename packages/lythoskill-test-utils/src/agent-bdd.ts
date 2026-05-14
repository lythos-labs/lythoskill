import { readFileSync, mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { homedir } from 'node:os'
import type { AgentAdapter, AgentRunResult, CheckpointEntry } from './agents/types'
import { createSanitizer } from './sanitize'
import { readCheckpoints } from './bdd-runner'
import { runLLMJudge } from './judge'
import { AgentScenario as AgentScenarioSchema, type AgentScenario, type JudgeVerdict, type JudgeInput, type Evidence } from './schema'

// Re-export for backward compat
export type { AgentScenario, JudgeVerdict, JudgeCriterion, JudgeInput, Evidence } from './schema'

// ── Scenario result type ───────────────────────────────────────────────────

export interface AgentScenarioResult {
  scenario: AgentScenario
  agentResult: AgentRunResult
  checkpoints: CheckpointEntry[]
  verdict: JudgeVerdict | null
  artifactDir: string
}

// Detect the monorepo root for sanitization — walk up from this file
const PROJECT_ROOT = (() => {
  let dir = resolve(import.meta.dir, '..', '..', '..')
  if (!existsSync(join(dir, 'package.json'))) {
    dir = resolve(import.meta.dir, '..', '..', '..', '..')
  }
  return dir
})()

// ── Artifact collection (Gap F: recursive, file-only) ─────────────────────

const ARTIFACT_SKIP = new Set([
  '.claude', 'skill-deck.toml', 'skill-deck.lock', 'AGENTS.md',
  'agent-stdout.txt', 'agent-stderr.txt', 'judge-verdict.json', '_checkpoints',
])

function collectArtifacts(dir: string, rootDir: string): string[] {
  const result: string[] = []
  let entries: string[]
  try { entries = readdirSync(dir) } catch { return result }
  for (const e of entries) {
    if (e.startsWith('.') || ARTIFACT_SKIP.has(e)) continue
    const full = join(dir, e)
    let stat
    try { stat = statSync(full) } catch { continue }
    if (stat.isDirectory()) {
      result.push(...collectArtifacts(full, rootDir))
    } else {
      result.push(relative(rootDir, full))
    }
  }
  return result
}

// ── parseAgentMd ───────────────────────────────────────────────────────────
// ## Judge section no longer extracted — judge criteria live in arena.toml
// or are passed as JudgeInput. Markdown is for LLM agents to read, not for
// regex-based structured-data extraction.

export function parseAgentMd(content: string): AgentScenario {
  const lines = content.split('\n')
  if (lines[0].trim() !== '---') {
    throw new Error('Invalid .agent.md: missing frontmatter')
  }
  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (endIdx === -1) {
    throw new Error('Invalid .agent.md: frontmatter not closed')
  }

  const fmLines = lines.slice(1, endIdx)
  const body = lines.slice(endIdx + 1).join('\n')

  let name = 'unnamed agent scenario'
  let description = ''
  let timeout = 30000

  for (const line of fmLines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    let value = line.slice(colonIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key === 'name') name = value
    if (key === 'description') description = value
    if (key === 'timeout') timeout = Number(value) || 30000
  }

  // Extract sections — ## Judge is intentionally excluded.
  // Judge criteria live as natural-language text (arena.toml [arena].judge
  // or judge.md), passed via JudgeInput, not regex-parsed from markdown.
  const sectionRegex = /##\s*(Given|When|Then)\s*\n/i
  const sections: Record<string, string> = {}
  let pos = 0
  while (true) {
    const match = body.slice(pos).match(sectionRegex)
    if (!match) break
    const secStart = pos + match.index! + match[0].length
    const nextMatch = body.slice(secStart).match(sectionRegex)
    const secEnd = nextMatch ? secStart + nextMatch.index! : body.length
    sections[match[1].toLowerCase()] = body.slice(secStart, secEnd).trim()
    pos = secStart
  }

  if (!sections.when) {
    throw new Error('Invalid .agent.md: missing ## When')
  }

  // Parse Given — look for deck declaration bullets
  const givenDeck: Record<string, unknown> = {}
  const givenText = sections.given || ''
  const toolMatch = givenText.match(/tool skills?:\s*([^\n]+)/i)
  if (toolMatch) {
    const items = toolMatch[1].split(/,\s*/).map(s => s.trim()).filter(Boolean)
    givenDeck.tool = {}
    for (const item of items) {
      let alias = item
      let path = `github.com/foo/bar/${item}`
      const parenMatch = item.match(/^([^(]+)\s*\(([^)]+)\)\s*$/)
      if (parenMatch) {
        alias = parenMatch[1].trim()
        path = `${parenMatch[2].trim()}/${alias}`
      }
      givenDeck.tool[alias] = { path }
    }
  }

  // Parse Then bullets
  const thenBullets: string[] = []
  const thenText = sections.then || ''
  for (const line of thenText.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      thenBullets.push(trimmed.slice(2).trim())
    }
  }

  const result = {
    name,
    description,
    timeout,
    given: { deck: givenDeck as Record<string, { path: string }> },
    when: sections.when,
    then: thenBullets,
    judge: '',  // no longer extracted from markdown
  }

  return AgentScenarioSchema.parse(result)
}

// ── runAgentScenario ───────────────────────────────────────────────────────

export async function runAgentScenario(opts: {
  scenarioPath?: string
  scenario?: AgentScenario
  agent: AgentAdapter
  setupWorkdir: (scenario: AgentScenario, workdir: string) => void | Promise<void>
  judgeAgent?: AgentAdapter
  /** Optional override — when provided, used directly instead of building from scenario.judge */
  judgeInput?: JudgeInput
  baseDir?: string
  timeoutMs?: number
  idleTimeoutMs?: number
}): Promise<AgentScenarioResult> {
  const {
    scenarioPath,
    scenario: prebuilt,
    agent,
    setupWorkdir,
    judgeAgent,
    judgeInput: externalJudgeInput,
    baseDir,
    timeoutMs,
    idleTimeoutMs,
  } = opts

  if (!prebuilt && !scenarioPath) {
    throw new Error('runAgentScenario: scenario or scenarioPath is required')
  }

  const scenario = prebuilt ?? parseAgentMd(readFileSync(scenarioPath!, 'utf-8'))

  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

  const artifactDir = join(
    baseDir ?? join(PROJECT_ROOT, 'runs', 'agent-bdd'),
    stamp,
    scenario.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  )

  mkdirSync(artifactDir, { recursive: true })

  // Deck-specific workdir setup (writes skill-deck.toml, etc.)
  await setupWorkdir(scenario, artifactDir)

  const agentResult = await agent.spawn({
    cwd: artifactDir,
    brief: scenario.when,
    timeoutMs: timeoutMs ?? scenario.timeout,
    idleTimeoutMs,
  })

  // Sanitize and persist agent output
  const sanitizer = createSanitizer({
    projectRoot: PROJECT_ROOT,
    homeDir: homedir(),
    workDir: artifactDir,
  })

  writeFileSync(join(artifactDir, 'agent-stdout.txt'), sanitizer.sanitize(agentResult.stdout), 'utf-8')
  writeFileSync(join(artifactDir, 'agent-stderr.txt'), sanitizer.sanitize(agentResult.stderr), 'utf-8')

  const checkpoints = readCheckpoints(artifactDir)

  // Collect agent-produced files recursively
  const artifactFiles = collectArtifacts(artifactDir, artifactDir)

  // Determine judge input: external override takes priority,
  // then legacy scenario.judge, otherwise skip judging entirely.
  let verdict: JudgeVerdict | null = null
  const effectiveJudgeInput = externalJudgeInput ?? (scenario.judge ? { criteria: scenario.judge, task_context: scenario.description } as JudgeInput : null)

  if (effectiveJudgeInput) {
    const judge = judgeAgent ?? agent
    const evidence: Evidence = {
      sandbox_cwd: artifactDir,
      stdout: agentResult.stdout,
      stderr: agentResult.stderr,
      artifact_files: artifactFiles,
    }
    const judgeResult = await runLLMJudge(effectiveJudgeInput, evidence, checkpoints, judge)

    writeFileSync(
      join(artifactDir, 'judge-verdict.json'),
      JSON.stringify(
        {
          verdict: judgeResult.verdict?.verdict ?? null,
          reason: judgeResult.verdict?.reason ?? null,
          criteria: judgeResult.verdict?.criteria ?? null,
          raw_output: judgeResult.raw,
          error: judgeResult.error ?? null,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    )

    verdict = judgeResult.verdict
  } else {
    writeFileSync(
      join(artifactDir, 'judge-verdict.json'),
      JSON.stringify(
        {
          verdict: null,
          reason: 'No judge criteria provided — arena.toml [arena].judge or scenario.judge both absent',
          error: null,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    )
  }

  return {
    scenario,
    agentResult,
    checkpoints,
    verdict,
    artifactDir,
  }
}
