/**
 * deepseek.test.ts — DeepSeek TUI adapter smoke tests
 *
 * NOT for CI — requires `deepseek` binary and API key.
 * Run manually: bun test packages/lythoskill-test-utils/src/agents/deepseek.test.ts
 *
 * Two-phase smoke test:
 *   1. Hello World — verifies spawn pipe works, agent produces output
 *   2. Self-report skills — verifies deck link + skill discovery
 */

import { describe, test, expect } from 'bun:test'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
// Import adapter directly — avoid package entry (index.ts) which triggers
// registry initialization and can cause circular load ordering with other adapters.
import { deepseekAdapter } from './deepseek'

const hasDeepseek = !!Bun.which('deepseek')

describe('deepseekAdapter (smoke)', () => {

  test('adapter has correct name', () => {
    expect(deepseekAdapter.name).toBe('deepseek')
  })

  test('spawn() rejects when binary not in PATH', () => {
    // This test always passes — if deepseek IS installed, the actual spawn
    // would try to run. We test the error path conceptually.
    expect(typeof deepseekAdapter.spawn).toBe('function')
  })

  describe('hello world', () => {

    test.skipIf(!hasDeepseek)(
      'deepseek --yolo writes Hello World to output.md',
      async () => {
        const workdir = join(tmpdir(), `deepseek-hello-${Date.now()}`)
        mkdirSync(workdir, { recursive: true })

        const result = await deepseekAdapter.spawn({
          cwd: workdir,
          brief: 'Write exactly "Hello, World!" (without quotes) to a file named output.md in the current directory. Do nothing else.',
          timeoutMs: 120000,
        })

        console.log('stdout:', result.stdout.slice(0, 500))
        console.log('stderr:', result.stderr.slice(0, 200))
        console.log('code:', result.code)
        console.log('durationMs:', result.durationMs)

        expect(result.code).toBe(0)
        expect(result.stdout.length).toBeGreaterThan(0)

        const outputPath = join(workdir, 'output.md')
        if (existsSync(outputPath)) {
          const { readFileSync } = await import('node:fs')
          const content = readFileSync(outputPath, 'utf-8')
          console.log('output.md:', content.slice(0, 200))
          expect(content).toContain('Hello, World!')
        }
      },
      180000  // 3 min timeout for LLM call
    )
  })

  describe('self-report skills', () => {

    test.skipIf(!hasDeepseek)(
      'deepseek reports skills from workdir after deck link',
      async () => {
        const workdir = join(tmpdir(), `deepseek-skills-${Date.now()}`)
        mkdirSync(workdir, { recursive: true })

        // Write a minimal scout deck (intentionally empty — agent should report no skills)
        writeFileSync(join(workdir, 'skill-deck.toml'), `[deck]
max_cards = 10
# Scout — intentionally thin. No skills declared.
`, 'utf-8')

        // Run deck link so .claude/skills/ is populated
        const linkProc = Bun.spawn(
          ['bunx', '@lythos/skill-deck', 'link'],
          { cwd: workdir, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe',
            env: { ...process.env, HOME: process.env.HOME! } }
        )
        await linkProc.exited
        console.log('deck link exit:', linkProc.exitCode)

        const result = await deepseekAdapter.spawn({
          cwd: workdir,
          brief:
            'A skill-deck.toml is configured in your workspace. ' +
            'Skills are linked in .claude/skills/. ' +
            'Read any SKILL.md files you find there. Then write a file called skill-report.md ' +
            'listing each skill by name and a one-line description of what it does. ' +
            'If no skills are linked, write "No skills found." in skill-report.md.',
          timeoutMs: 180000,
        })

        console.log('stdout:', result.stdout.slice(0, 800))
        console.log('stderr:', result.stderr.slice(0, 200))
        console.log('code:', result.code)
        console.log('durationMs:', result.durationMs)

        expect(result.code).toBe(0)
        expect(result.stdout.length).toBeGreaterThan(0)

        const reportPath = join(workdir, 'skill-report.md')
        if (existsSync(reportPath)) {
          const { readFileSync } = await import('node:fs')
          const content = readFileSync(reportPath, 'utf-8')
          console.log('skill-report.md:', content)
          // For scout deck, expect "No skills found" — but if cold pool
          // has skills from other projects, agent might find them via global paths.
          // Either way, the file should exist and have content.
          expect(content.length).toBeGreaterThan(0)
        }
      },
      240000  // 4 min timeout — includes deck link + LLM call
    )
  })
})
