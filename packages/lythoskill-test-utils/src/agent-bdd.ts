import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'
import type { AgentAdapter, AgentRunResult, CheckpointEntry } from './agents/types'
import { createSanitizer } from './sanitize'
import { readCheckpoints } from './bdd-runner'
import { runLLMJudge } from './judge'
import { AgentScenario as AgentScenarioSchema, type AgentScenario, type JudgeVerdict } from './schema'

// Re-export for backward compat
export type { AgentScenario, JudgeVerdict, JudgeCriterion } from './schema'

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

// ── parseAgentMd ───────────────────────────────────────────────────────────

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

  // Extract sections
  const sectionRegex = /##\s*(Given|When|Then|Judge)\s*\n/i
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
  const givenDeck: DeckConfig = {}
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
    given: { deck: givenDeck },
    when: sections.when,
    then: thenBullets,
    judge: sections.judge || '',
  }

  return AgentScenarioSchema.parse(result)
}

// ── runAgentScenario ───────────────────────────────────────────────────────

export async function runAgentScenario(opts: {
  scenarioPath: string
  agent: AgentAdapter
  setupWorkdir: (scenario: AgentScenario, workdir: string) => void | Promise<void>
  judgeAgent?: AgentAdapter
  baseDir?: string
  timeoutMs?: number
  idleTimeoutMs?: number
}): Promise<AgentScenarioResult> {
  const {
    scenarioPath,
    agent,
    setupWorkdir,
    judgeAgent,
    baseDir,
    timeoutMs,
    idleTimeoutMs,
  } = opts

  const content = readFileSync(scenarioPath, 'utf-8')
  const scenario = parseAgentMd(content)

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

  // Optional LLM judge
  let verdict: JudgeVerdict | null = null
  if (scenario.judge) {
    const judge = judgeAgent ?? agent
    const judgeResult = await runLLMJudge(scenario, agentResult, checkpoints, artifactDir, judge)

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
          reason: 'No ## Judge section in scenario',
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

