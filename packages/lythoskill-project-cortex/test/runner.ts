#!/usr/bin/env bun
/**
 * Cortex BDD Runner — verifies trailer + lane FSM via real CLI invocations.
 *
 * Pattern: read markdown scenario files → set up tmpdir git repo + cortex →
 * run CLI commands → assert file state. No mocks; every assertion hits the
 * real filesystem.
 */

import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { runCli, assertOutput, setupWorkdir } from '@lythos/test-utils'

// ── Types ─────────────────────────────────────────────────────

export interface Scenario {
  name: string
  given: {
    // Cortex docs to create before the test action
    tasks?: Array<{ title: string; id?: string; status?: string }>
    epics?: Array<{ title: string; lane?: string; checklist?: string }>
    adrs?: Array<{ title: string; status?: string }>
  }
  when: {
    // CLI commands to run (each is a shell command string)
    commands: string[]
    // Or a simulated commit trailer (runner will create a commit with this trailer)
    trailer?: string
  }
  then: {
    // Assertions on filesystem state
    fileExists?: string[]
    fileMissing?: string[]
    // Assertions on CLI output
    stdoutContains?: string[]
    stdoutNotContains?: string[]
    stderrContains?: string[]
    exitCode?: number
    // Assertions on file content
    fileContains?: Record<string, string[]>
  }
}

export interface Result {
  name: string
  pass: boolean
  errors: string[]
  duration: number
}

// ── Constants ─────────────────────────────────────────────────

const SCENARIOS_DIR = join(import.meta.dir, 'scenarios')
const CLI_PATH = resolve(import.meta.dir, '..', 'src', 'cli.ts')
const BUN = 'bun'

// ── Scenario Loader ───────────────────────────────────────────

function parseScenario(mdPath: string): Scenario {
  // TODO: parse markdown frontmatter + body into Scenario
  throw new Error('parseScenario not yet implemented')
}

// ── Fixture Setup ─────────────────────────────────────────────

function setupCortexFixture(workdir: string, scenario: Scenario): void {
  // TODO:
  // 1. git init
  // 2. Run `bun <cli> init` in workdir
  // 3. Create given.tasks / given.epics / given.adrs via CLI
  throw new Error('setupCortexFixture not yet implemented')
}

// ── Scenario Runner ───────────────────────────────────────────

export async function runScenario(scenario: Scenario): Promise<Result> {
  const start = Date.now()
  const errors: string[] = []

  // TODO:
  // 1. Setup workdir
  // 2. Setup fixture
  // 3. Run when.commands (or create commit with trailer)
  // 4. Collect assertions
  // 5. Cleanup

  throw new Error('runScenario not yet implemented')
}

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  // TODO:
  // 1. Read all .md files in SCENARIOS_DIR
  // 2. Parse each into Scenario
  // 3. Run each scenario
  // 4. Print report (pass/fail, errors, duration)
  // 5. Exit with non-zero if any failed

  console.log('Cortex BDD Runner — scaffold. Implement me.')
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e)
    process.exit(1)
  })
}
