import { describe, test, expect } from 'bun:test'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseAgentMd, runAgentScenario } from '../src/agent-bdd'
import type { AgentAdapter } from '../src/agents/types'

describe('parseAgentMd', () => {
  test('parses frontmatter fields (name, description, timeout)', () => {
    const content = `---
name: "Test scenario"
description: A sample scenario
timeout: 120000
---

## When
Do something useful.
`
    const result = parseAgentMd(content)
    expect(result.name).toBe('Test scenario')
    expect(result.description).toBe('A sample scenario')
    expect(result.timeout).toBe(120000)
    expect(result.when).toBe('Do something useful.')
  })

  test('defaults for missing frontmatter fields', () => {
    const content = `---
---

## When
Just do it.
`
    const result = parseAgentMd(content)
    expect(result.name).toBe('unnamed agent scenario')
    expect(result.description).toBe('')
    expect(result.timeout).toBe(30000)
  })

  test('throws on missing frontmatter', () => {
    expect(() => parseAgentMd('# Not frontmatter\n\n## When\n')).toThrow('Invalid .agent.md: missing frontmatter')
  })

  test('throws on unclosed frontmatter', () => {
    expect(() => parseAgentMd('---\nname: test\n## When\n')).toThrow('Invalid .agent.md: frontmatter not closed')
  })

  test('throws on missing ## When section', () => {
    const content = `---
name: test
---

## Given
Some setup
`
    expect(() => parseAgentMd(content)).toThrow('Invalid .agent.md: missing ## When')
  })

  test('parses ## Judge section when present', () => {
    const content = `---
name: Judged scenario
---

## Given
- tool skills: skill-a, skill-b

## When
Run a command.

## Then
- Result should be correct

## Judge
Verify the output is correct.
`
    const result = parseAgentMd(content)
    expect(result.judge).toBe('Verify the output is correct.')
    expect(result.then).toEqual(['Result should be correct'])
  })

  test('empty judge when no ## Judge section', () => {
    const content = `---
name: No judge
---

## When
Just run it.
`
    const result = parseAgentMd(content)
    expect(result.judge).toBe('')
    expect(result.then).toEqual([])
  })

  test('parses tool skills from ## Given with alias (localhost) syntax', () => {
    const content = `---
name: Localhost test
---

## Given
- tool skills: my-skill (localhost), other-skill

## When
Do stuff.
`
    const result = parseAgentMd(content)
    expect(result.given.deck.tool).toBeDefined()
    const tool = result.given.deck.tool!
    expect(Object.keys(tool)).toHaveLength(2)
    expect(tool['my-skill']).toEqual({ path: 'localhost/my-skill' })
    expect(tool['other-skill']).toEqual({ path: 'github.com/foo/bar/other-skill' })
  })

  test('parses tool skills from ## Given without alias', () => {
    const content = `---
name: Simple test
---

## Given
- tool skills: skill-a, skill-b, skill-c

## When
Execute.
`
    const result = parseAgentMd(content)
    const tool = result.given.deck.tool!
    expect(Object.keys(tool)).toHaveLength(3)
    expect(tool['skill-a']).toEqual({ path: 'github.com/foo/bar/skill-a' })
  })
})

describe('runAgentScenario', () => {
  const mockAdapter: AgentAdapter = {
    name: 'mock',
    async spawn() {
      return {
        stdout: 'task completed',
        stderr: '',
        code: 0,
        durationMs: 5,
        checkpoints: [],
      }
    },
  }

  test('runs scenario end-to-end with mock agent (no judge)', async () => {
    const baseDir = join('/tmp', 'agent-bdd-test-' + Date.now())
    const agentMdPath = join(baseDir, 'test.agent.md')
    mkdirSync(baseDir, { recursive: true })
    writeFileSync(agentMdPath, `---
name: Mock Scenario
timeout: 5000
---

## When
Please say "task completed".
`)

    const setupCalled = { called: false }

    const result = await runAgentScenario({
      scenarioPath: agentMdPath,
      agent: mockAdapter,
      setupWorkdir(_scenario, workdir) {
        setupCalled.called = true
        mkdirSync(workdir, { recursive: true })
      },
      baseDir,
    })

    expect(result.scenario.name).toBe('Mock Scenario')
    expect(result.agentResult.stdout).toBe('task completed')
    expect(result.agentResult.code).toBe(0)
    expect(result.checkpoints).toEqual([])
    expect(result.verdict).toBeNull() // no Judge section
    expect(result.artifactDir).toContain('mock-scenario')
    expect(setupCalled.called).toBe(true)

    // Verify artifacts were persisted
    expect(existsSync(join(result.artifactDir, 'agent-stdout.txt'))).toBe(true)
    expect(existsSync(join(result.artifactDir, 'agent-stderr.txt'))).toBe(true)
    expect(existsSync(join(result.artifactDir, 'judge-verdict.json'))).toBe(true)

    const judgeVerdict = JSON.parse(readFileSync(join(result.artifactDir, 'judge-verdict.json'), 'utf-8'))
    expect(judgeVerdict.verdict).toBeNull()
    expect(judgeVerdict.reason).toContain('No ## Judge')

    // Cleanup
    rmSync(baseDir, { recursive: true, force: true })
  })

  test('runs scenario with judge section', async () => {
    const baseDir = join('/tmp', 'agent-bdd-judge-' + Date.now())
    const agentMdPath = join(baseDir, 'judge-test.agent.md')
    mkdirSync(baseDir, { recursive: true })
    writeFileSync(agentMdPath, `---
name: Judged Scenario
---

## When
Run the task.

## Judge
Check correctness.

## Then
- Output correct
`)

    // Mock judge that returns PASS
    const judgeAdapter: AgentAdapter = {
      name: 'mock-judge',
      async spawn() {
        return {
          stdout: '{"verdict":"PASS","reason":"Looks good.","criteria":[{"name":"correctness","passed":true}]}',
          stderr: '',
          code: 0,
          durationMs: 3,
          checkpoints: [],
        }
      },
    }

    const result = await runAgentScenario({
      scenarioPath: agentMdPath,
      agent: mockAdapter,
      setupWorkdir(_s, wd) { mkdirSync(wd, { recursive: true }) },
      judgeAgent: judgeAdapter,
      baseDir,
    })

    expect(result.verdict).not.toBeNull()
    expect(result.verdict!.verdict).toBe('PASS')

    rmSync(baseDir, { recursive: true, force: true })
  })
})
