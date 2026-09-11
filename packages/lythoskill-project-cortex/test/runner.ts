#!/usr/bin/env bun
/**
 * Cortex BDD Runner — verifies trailer + lane FSM via real CLI invocations.
 *
 * Pattern: read markdown scenario files → set up tmpdir git repo + cortex →
 * run CLI commands → assert file state. No mocks; every assertion hits the
 * real filesystem.
 */

import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { runCli, assertOutput, setupWorkdir } from '@lythos/test-utils/bdd-runner'
import { createTaskTemplate, createEpicTemplate, createAdrTemplate } from '../src/lib/template.js'
import { ensureDir } from '../src/lib/fs.js'
import { generateTimestampId } from '../src/lib/id.js'
import { parse } from '../src/lib/status-history.js'

// ── Types ─────────────────────────────────────────────────────

export interface Scenario {
  name: string
  sourcePath: string
  given: {
    // Cortex docs to create before the test action
    // `rawFile` = write the fixture's bytes verbatim instead of `createTaskTemplate` —
    // the only way to materialise a card that did NOT come from the template, which is
    // the whole class of card TASK-20260911080931450 is about.
    tasks?: Array<{ title: string; id?: string; status?: string; rawFile?: string }>
    epics?: Array<{ title: string; id?: string; lane?: string; checklist?: string; status?: string }>
    adrs?: Array<{ title: string; id?: string; status?: string }>
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
const PACKAGE_ROOT = resolve(import.meta.dir, '..')
const BUN = 'bun'

/** The task subdir ↔ status table, both directions (the Given DSL names the dir). */
const TASK_SUBDIRS: Array<[string, string]> = [
  ['01-backlog', 'backlog'],
  ['02-in-progress', 'in-progress'],
  ['03-review', 'review'],
  ['04-completed', 'completed'],
  ['05-suspended', 'suspended'],
  ['06-terminated', 'terminated'],
  ['07-archived', 'archived'],
]

function taskStatusFromDirHint(hint: string): string {
  const hit = TASK_SUBDIRS.find(([dir]) => hint.includes(dir))
  return hit ? hit[1] : 'backlog'
}

function taskSubdirForStatus(status: string): string {
  const hit = TASK_SUBDIRS.find(([, st]) => st === status)
  return hit ? hit[0] : '01-backlog'
}

/** The single task file under `cortex/tasks`, if there is exactly one. */
function findAllTaskFiles(workdir: string): string[] {
  const tasksDir = join(workdir, 'cortex', 'tasks')
  const found: string[] = []
  const walk = (dir: string): void => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.md') && entry.name.startsWith('TASK-')) found.push(full)
    }
  }
  walk(tasksDir)
  return found
}

/** The task file a Then assertion should read: the one in `04-completed/` when present
 *  (the trailer scenarios), otherwise the only task file in the fixture. */
function resolveTaskFileForAssertion(workdir: string): string | null {
  const completedDir = join(workdir, 'cortex', 'tasks', '04-completed')
  if (existsSync(completedDir)) {
    const entries = readdirSync(completedDir).filter(f => f.endsWith('.md'))
    if (entries.length > 0) return join(completedDir, entries[0])
  }
  const all = findAllTaskFiles(workdir)
  return all.length === 1 ? all[0] : (all[0] ?? null)
}

// ── Scenario Loader ───────────────────────────────────────────

function parseFrontmatter(md: string): { name: string; description?: string; body: string } {
  const lines = md.split('\n')
  if (lines[0].trim() !== '---') {
    return { name: 'unknown', body: md }
  }
  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (endIdx === -1) {
    return { name: 'unknown', body: md }
  }
  const fmLines = lines.slice(1, endIdx)
  const body = lines.slice(endIdx + 1).join('\n')

  let name = 'unknown'
  let description: string | undefined
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
  }
  return { name, description, body }
}

function extractSection(body: string, heading: string): string {
  const regex = new RegExp(`^##\\s+${heading}\\s*$`, 'im')
  const match = body.match(regex)
  if (!match) return ''
  const start = match.index! + match[0].length
  const rest = body.slice(start)
  const nextHeading = rest.match(/\n##\s/)
  const end = nextHeading ? nextHeading.index! : rest.length
  return rest.slice(0, end).trim()
}

function parseBulletList(text: string): string[] {
  const lines = text.split('\n')
  const bullets: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      bullets.push(trimmed.slice(2).trim())
    }
  }
  return bullets
}

/** Split a shell-like command string respecting double quotes. */
function splitCommand(cmd: string): string[] {
  const args: string[] = []
  let current = ''
  let inQuote = false
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i]
    if (ch === '"') {
      inQuote = !inQuote
      continue
    }
    if (ch === ' ' && !inQuote) {
      if (current.length > 0) {
        args.push(current)
        current = ''
      }
      continue
    }
    current += ch
  }
  if (current.length > 0) {
    args.push(current)
  }
  return args
}

function parseScenario(mdPath: string): Scenario {
  const md = readFileSync(mdPath, 'utf-8')
  const { name, body } = parseFrontmatter(md)

  const givenText = extractSection(body, 'Given')
  const whenText = extractSection(body, 'When')
  const thenText = extractSection(body, 'Then')

  const given: Scenario['given'] = {}
  const when: Scenario['when'] = { commands: [] }
  const then: Scenario['then'] = {}

  // Parse Given
  const givenBullets = parseBulletList(givenText)
  for (const bullet of givenBullets) {
    // A cortex project initialized in a git repo
    if (/cortex project initialized/i.test(bullet)) {
      continue // handled by fixture setup
    }
    // A hand-written task `TASK-x` exists in `01-backlog/` with content from `test/fixtures/x.md`
    // ("writer-damaged" is the same form; the adjective is documentation, not behaviour)
    const rawMatch = bullet.match(/(?:hand-written|writer-damaged|raw)\s+task\s+`?([^`]+)`?\s+exists\s+in\s+`?([^`]+)`?\s+with\s+content\s+from\s+`?([^`]+)`?/i)
    if (rawMatch) {
      given.tasks = given.tasks || []
      given.tasks.push({
        id: rawMatch[1],
        title: 'Raw fixture task',
        status: taskStatusFromDirHint(rawMatch[2]),
        rawFile: rawMatch[3],
      })
      continue
    }
    // A task `TASK-TEST-001` exists in `01-backlog/`
    const taskMatch = bullet.match(/task\s+`?([^`]+)`?\s+exists\s+in\s+`?([^`]+)`?/i)
    if (taskMatch) {
      given.tasks = given.tasks || []
      given.tasks.push({ id: taskMatch[1], title: 'Test Task', status: 'backlog' })
      continue
    }
    // An epic `EPIC-MAIN-001` exists in `01-active/` with `lane: main`
    const epicMatch = bullet.match(/epic\s+`?([^`]+)`?\s+exists\s+in\s+`?([^`]+)`?(?:\s+with\s+`?lane:\s*([^`]+)`?)?/i)
    if (epicMatch) {
      given.epics = given.epics || []
      const dirHint = epicMatch[2].toLowerCase()
      const status = dirHint.includes('done') ? 'done' :
                     dirHint.includes('suspended') ? 'suspended' :
                     dirHint.includes('archived') ? 'archived' : 'active'
      given.epics.push({ id: epicMatch[1], title: 'Fixture Epic', lane: epicMatch[3] || undefined, status })
      continue
    }
    // An ADR `ADR-TEST-001` exists in `01-proposed/`
    const adrMatch = bullet.match(/adr\s+`?([^`]+)`?\s+exists\s+in\s+`?([^`]+)`?/i)
    if (adrMatch) {
      given.adrs = given.adrs || []
      const dirHint = adrMatch[2].toLowerCase()
      const status = dirHint.includes('accepted') ? 'accepted' :
                     dirHint.includes('rejected') ? 'rejected' :
                     dirHint.includes('superseded') ? 'superseded' : 'proposed'
      given.adrs.push({ id: adrMatch[1], title: 'Test ADR', status })
      continue
    }
  }

  // Parse When
  const whenBullets = parseBulletList(whenText)
  for (const bullet of whenBullets) {
    // Run `cortex epic "Second focus" --lane main`
    const runMatch = bullet.match(/run\s+`([^`]+)`/i)
    if (runMatch) {
      const cmd = runMatch[1]
      // Replace 'cortex' with 'bun <cli_path>'
      if (cmd.startsWith('cortex ')) {
        const rest = cmd.slice('cortex '.length)
        when.commands.push(`${BUN} ${CLI_PATH} ${rest}`)
      } else {
        when.commands.push(cmd)
      }
      continue
    }
    // A commit is made with message body containing: ...
    if (/commit.*message body containing/i.test(bullet)) {
      // Extract trailer from code block in whenText
      const codeBlockMatch = whenText.match(/```[\s\S]*?\n([\s\S]*?)```/)
      if (codeBlockMatch) {
        const trailer = codeBlockMatch[1].trim()
        when.trailer = trailer
        // Convert trailer to equivalent CLI command
        // Closes: TASK-TEST-001 -> bun cli.ts complete TASK-TEST-001
        const closesMatch = trailer.match(/Closes:\s*(\S+)/i)
        if (closesMatch) {
          when.commands.push(`${BUN} ${CLI_PATH} complete ${closesMatch[1]}`)
        }
      }
      continue
    }
    // The post-commit hook dispatches `task complete TASK-TEST-001`
    const dispatchMatch = bullet.match(/dispatches\s+`([^`]+)`/i)
    if (dispatchMatch) {
      const cmd = dispatchMatch[1]
      if (cmd.startsWith('task ')) {
        when.commands.push(`${BUN} ${CLI_PATH} ${cmd.slice('task '.length)}`)
      } else {
        when.commands.push(`${BUN} ${CLI_PATH} ${cmd}`)
      }
    }
  }

  // Parse Then
  const thenBullets = parseBulletList(thenText)
  for (const bullet of thenBullets) {
    // CLI exits 0 / non-zero
    const exitMatch = bullet.match(/CLI exits (\d+|non-zero)/i)
    if (exitMatch) {
      then.exitCode = exitMatch[1] === 'non-zero' ? -1 : parseInt(exitMatch[1], 10)
      continue
    }
    // stderr contains "..."
    const stderrMatch = bullet.match(/stderr contains\s+"([^"]+)"/i)
    if (stderrMatch) {
      then.stderrContains = then.stderrContains || []
      then.stderrContains.push(stderrMatch[1])
      continue
    }
    // No new epic file is created in `01-active/`
    const noFileMatch = bullet.match(/no new (\w+) file is created in\s+`?([^`]+)`?/i)
    if (noFileMatch) {
      // We'll handle this as a negative assertion after running
      continue
    }
    // New epic file exists in `01-active/`
    const newFileMatch = bullet.match(/new (\w+) file exists in\s+`?([^`]+)`?/i)
    if (newFileMatch) {
      // Dynamic: will scan directory
      continue
    }
    // Task file exists at `cortex/tasks/04-completed/TASK-TEST-001-*.md`
    const existsMatch = bullet.match(/(\w+) file exists at\s+`?([^`]+)`?/i)
    if (existsMatch) {
      then.fileExists = then.fileExists || []
      then.fileExists.push(existsMatch[2])
      continue
    }
    // Task file does NOT exist in `01-backlog/`
    const missingMatch = bullet.match(/(\w+) file does NOT exist in\s+`?([^`]+)`?/i)
    if (missingMatch) {
      then.fileMissing = then.fileMissing || []
      then.fileMissing.push(missingMatch[2])
      continue
    }
    // Frontmatter contains `lane_override_reason: "security incident"`
    const fmMatch = bullet.match(/frontmatter contains\s+`?([^`:]+):\s*"?([^"`]+)"?`?/i)
    if (fmMatch) {
      then.fileContains = then.fileContains || {}
      // We'll set a special key for frontmatter assertions
      then.fileContains['__frontmatter__'] = then.fileContains['__frontmatter__'] || []
      then.fileContains['__frontmatter__'].push(`${fmMatch[1]}: ${fmMatch[2].trim()}`)
      continue
    }
    // Status History last record is `completed`
    const statusMatch = bullet.match(/status history last record is\s+`?([^`]+)`?/i)
    if (statusMatch) {
      then.fileContains = then.fileContains || {}
      then.fileContains['__status_history__'] = then.fileContains['__status_history__'] || []
      then.fileContains['__status_history__'].push(statusMatch[1])
      continue
    }
    // The task file contains the verbatim Status History block
    if (/verbatim status history block/i.test(bullet)) {
      then.fileContains = then.fileContains || {}
      then.fileContains['__verbatim_block__'] = ['verbatim']
      continue
    }
    // INDEX.md was regenerated
    const indexMatch = bullet.match(/INDEX\.md was regenerated/i)
    if (indexMatch) {
      then.fileExists = then.fileExists || []
      then.fileExists.push('INDEX.md')
      continue
    }
  }

  return { name, sourcePath: mdPath, given, when, then }
}

// ── Fixture Setup ─────────────────────────────────────────────

function setupCortexFixture(workdir: string, scenario: Scenario): void {
  // 1. git init
  const gitResult = runCli(workdir, ['git', 'init'])
  if (gitResult.code !== 0) {
    throw new Error(`git init failed: ${gitResult.stderr}`)
  }
  runCli(workdir, ['git', 'config', 'user.email', 'test@example.com'])
  runCli(workdir, ['git', 'config', 'user.name', 'Test User'])

  // 2. Run `bun cli.ts init` in workdir
  const initResult = runCli(workdir, [BUN, CLI_PATH, 'init'])
  if (initResult.code !== 0) {
    throw new Error(`cortex init failed: ${initResult.stderr}`)
  }

  // 3. Create given.tasks / given.epics / given.adrs via direct file write
  const today = new Date().toISOString().split('T')[0]

  for (const task of scenario.given.tasks ?? []) {
    const id = task.id || 'TASK-TEST-001'
    const title = task.title || 'Test Task'
    const status = task.status || 'backlog'
    const subdir = taskSubdirForStatus(status)
    const filename = `${id}-test-task.md`
    const dir = join(workdir, 'cortex', 'tasks', subdir)
    ensureDir(dir)

    // `rawFile`: the card's bytes come from the fixture verbatim — never through
    // `createTaskTemplate`, which is the point (a template card always carries a correct
    // `## Status History` section, so it can never reproduce this defect).
    let content: string
    if (task.rawFile) {
      const fixture = resolve(PACKAGE_ROOT, task.rawFile)
      if (!existsSync(fixture)) {
        throw new Error(`raw fixture not found: ${task.rawFile} (resolved to ${fixture})`)
      }
      content = readFileSync(fixture, 'utf-8')
    } else {
      content = createTaskTemplate(id, title)
    }
    writeFileSync(join(dir, filename), content)
  }

  for (const epic of scenario.given.epics ?? []) {
    // Use real timestamp IDs for epics so lane scanning (which relies on
    // scanFiles' \d{17} pattern) can find them.
    const id = epic.id?.startsWith('EPIC-TEST-') || epic.id?.startsWith('EPIC-MAIN-')
      ? generateTimestampId('EPIC')
      : (epic.id || generateTimestampId('EPIC'))
    const title = epic.title || 'Fixture Epic'
    const lane = (epic.lane as 'main' | 'emergency') || 'main'
    const status = epic.status || 'active'
    const subdir = status === 'active' ? '01-active' :
                   status === 'done' ? '99-done' :
                   status === 'suspended' ? '03-suspended' :
                   status === 'archived' ? '04-archived' : '01-active'
    const filename = `${id}-fixture-epic.md`
    const dir = join(workdir, 'cortex', 'epics', subdir)
    ensureDir(dir)
    const content = createEpicTemplate(id, title, {
      lane,
      checklistCompleted: true,
    })
    writeFileSync(join(dir, filename), content)
  }

  for (const adr of scenario.given.adrs ?? []) {
    const id = adr.id || 'ADR-TEST-001'
    const title = adr.title || 'Test ADR'
    const status = adr.status || 'proposed'
    const subdir = status === 'proposed' ? '01-proposed' :
                   status === 'accepted' ? '02-accepted' :
                   status === 'rejected' ? '03-rejected' :
                   status === 'superseded' ? '04-superseded' : '01-proposed'
    const filename = `${id}-test-adr.md`
    const dir = join(workdir, 'cortex', 'adr', subdir)
    ensureDir(dir)
    writeFileSync(join(dir, filename), createAdrTemplate(id, title))
  }
}

// ── Assertions ────────────────────────────────────────────────

function resolveGlobPattern(workdir: string, pattern: string): string[] {
  // Simple glob: supports * wildcard in filename only
  const parts = pattern.split('/')
  const dirParts: string[] = []
  let filePattern = ''

  for (let i = 0; i < parts.length; i++) {
    if (parts[i].includes('*')) {
      filePattern = parts.slice(i).join('/')
      break
    }
    dirParts.push(parts[i])
  }

  if (!filePattern) {
    // No wildcard, check exact path
    const fullPath = join(workdir, pattern)
    return existsSync(fullPath) ? [fullPath] : []
  }

  const baseDir = join(workdir, ...dirParts)
  if (!existsSync(baseDir)) return []

  const entries = readdirSync(baseDir, { withFileTypes: true })
  const regex = new RegExp('^' + filePattern.replace(/\\/g, '\\\\').replace(/\./g, '\\.').replace(/\*/g, '.*') + '$')
  return entries
    .filter(e => !e.isDirectory() && regex.test(e.name))
    .map(e => join(baseDir, e.name))
}

function runAssertions(workdir: string, scenario: Scenario, cliResult: { code: number; stdout: string; stderr: string }): string[] {
  const errors: string[] = []
  const then = scenario.then

  // Exit code
  if (then.exitCode !== undefined) {
    if (then.exitCode === -1) {
      // non-zero expected
      if (cliResult.code === 0) {
        errors.push(`exit code: expected non-zero, got 0`)
      }
    } else if (cliResult.code !== then.exitCode) {
      errors.push(`exit code: expected ${then.exitCode}, got ${cliResult.code}`)
    }
  }

  // stdout assertions
  for (const str of then.stdoutContains ?? []) {
    if (!cliResult.stdout.includes(str)) {
      errors.push(`stdout missing: "${str}"`)
    }
  }
  for (const str of then.stdoutNotContains ?? []) {
    if (cliResult.stdout.includes(str)) {
      errors.push(`stdout unexpectedly contains: "${str}"`)
    }
  }

  // stderr assertions
  for (const str of then.stderrContains ?? []) {
    if (!cliResult.stderr.includes(str)) {
      errors.push(`stderr missing: "${str}"`)
    }
  }

  // File exists
  for (const pattern of then.fileExists ?? []) {
    const matches = resolveGlobPattern(workdir, pattern)
    if (matches.length === 0) {
      errors.push(`file missing: ${pattern}`)
    }
  }

  // File missing
  for (const pattern of then.fileMissing ?? []) {
    const matches = resolveGlobPattern(workdir, pattern)
    if (matches.length > 0) {
      errors.push(`file unexpectedly exists: ${pattern} (found: ${matches.map(m => m.slice(workdir.length + 1)).join(', ')})`)
    }
  }

  // File content assertions
  if (then.fileContains) {
    for (const [pattern, expectedStrings] of Object.entries(then.fileContains)) {
      if (pattern === '__frontmatter__') {
        // Find the most recently created epic file in 01-active/ for frontmatter check
        const epicDir = join(workdir, 'cortex', 'epics', '01-active')
        if (existsSync(epicDir)) {
          const entries = readdirSync(epicDir)
            .filter(f => f.endsWith('.md') && !f.includes('EPIC-MAIN-001') && !f.includes('EPIC-TEST-'))
          if (entries.length === 0) {
            errors.push('no new epic file found for frontmatter assertion')
          } else {
            const newest = entries.sort().reverse()[0]
            const content = readFileSync(join(epicDir, newest), 'utf-8')
            for (const expected of expectedStrings) {
              if (!content.includes(expected)) {
                errors.push(`frontmatter missing: "${expected}" in ${newest}`)
              }
            }
          }
        }
        continue
      }

      if (pattern === '__status_history__') {
        // Read the record with the SAME definition the CLI uses — `parse()` from
        // lib/status-history.ts. A bespoke regex here is how the assertion and the CLI
        // drift apart, which is exactly the class of defect this scenario exists for.
        const taskFile = resolveTaskFileForAssertion(workdir)
        if (!taskFile) {
          errors.push('no task file found for status history assertion')
        } else {
          const content = readFileSync(taskFile, 'utf-8')
          const record = parse(content)
          const last = record.singleStatus ?? (record.lines.length > 0 ? record.lines[record.lines.length - 1] : null)
          const rel = taskFile.slice(workdir.length + 1)
          if (last === null) {
            errors.push(`status history is empty or unreadable: ${rel}`)
          } else {
            for (const expected of expectedStrings) {
              if (!last.toLowerCase().includes(expected.toLowerCase())) {
                errors.push(`status history last record is "${last}", expected "${expected}" in ${rel}`)
              }
            }
          }
        }
        continue
      }

      if (pattern === '__verbatim_block__') {
        // The block is written verbatim: heading, comment, blank line, header, separator.
        // "A heading + a bare row" must NOT satisfy this (AC1).
        const taskFile = resolveTaskFileForAssertion(workdir)
        if (!taskFile) {
          errors.push('no task file found for verbatim block assertion')
        } else {
          const content = readFileSync(taskFile, 'utf-8')
          const rel = taskFile.slice(workdir.length + 1)
          const block = [
            '## Status History',
            '<!-- machine-parseable table: directory = current status, last row = latest record -->',
            '',
            '| Status | Date | Note |',
            '|--------|------|------|',
          ].join('\n')
          if (!content.includes(block)) {
            errors.push(`verbatim Status History block missing in ${rel}`)
          }
          // The table must be the one the reader reads: last row = last recorded status,
          // and no vocabulary row may be left outside the table.
          const record = parse(content)
          const last = record.singleStatus ?? (record.lines.length > 0 ? record.lines[record.lines.length - 1] : null)
          if (last === null) {
            errors.push(`Status History is unreadable in ${rel}`)
          }
        }
        continue
      }

      const matches = resolveGlobPattern(workdir, pattern)
      if (matches.length === 0) {
        errors.push(`file not found for content assertion: ${pattern}`)
        continue
      }
      const content = readFileSync(matches[0], 'utf-8')
      for (const expected of expectedStrings) {
        if (!content.includes(expected)) {
          errors.push(`content missing in ${pattern}: "${expected}"`)
        }
      }
    }
  }

  return errors
}

// ── Scenario Runner ───────────────────────────────────────────

export async function runScenario(scenario: Scenario): Promise<Result> {
  const start = Date.now()
  const errors: string[] = []

  const workdir = setupWorkdir('/tmp', `cortex-bdd-${scenario.name}`)

  try {
    // 1. Setup fixture
    setupCortexFixture(workdir, scenario)

    // 2. Run commands
    let lastCode = 0
    let lastStdout = ''
    let lastStderr = ''

    for (const cmd of scenario.when.commands) {
      const args = splitCommand(cmd)
      // Auto-inject --skip-checklist for epic creation in non-TTY test env
      const epicCreateIdx = args.findIndex((a, i) =>
        i >= 2 && a === 'epic' && args[i + 1] !== 'done' && args[i + 1] !== 'suspend' && args[i + 1] !== 'resume'
      )
      if (epicCreateIdx !== -1 && !args.includes('--skip-checklist')) {
        args.push('--skip-checklist', 'BDD runner non-TTY')
      }
      const result = runCli(workdir, args)
      lastCode = result.code
      lastStdout = result.stdout
      lastStderr = result.stderr
      if (result.code !== 0) {
        // Stop on first failure (like deck runner)
        break
      }
    }

    // 3. Run assertions
    const assertionErrors = runAssertions(workdir, scenario, {
      code: lastCode,
      stdout: lastStdout,
      stderr: lastStderr,
    })
    errors.push(...assertionErrors)

    // 4. Special assertions parsed from raw Then bullets
    const md = readFileSync(scenario.sourcePath, 'utf-8')
    const { body } = parseFrontmatter(md)
    const thenText = extractSection(body, 'Then')
    const thenBullets = parseBulletList(thenText)

    for (const bullet of thenBullets) {
      // No new epic file is created in `01-active/`
      const noFileMatch = bullet.match(/no new (\w+) file is created in\s+`?([^`]+)`?/i)
      if (noFileMatch) {
        const dir = join(workdir, noFileMatch[2])
        if (existsSync(dir)) {
          const entries = readdirSync(dir).filter(f => f.endsWith('.md'))
          // Filter out fixture files
          const fixtureIds = (scenario.given.epics ?? []).map(e => e.id).filter(Boolean)
          const newFiles = entries.filter(f => !fixtureIds.some(id => f.includes(id!)))
          if (newFiles.length > 0) {
            errors.push(`unexpected new file(s) in ${noFileMatch[2]}: ${newFiles.join(', ')}`)
          }
        }
      }
      // New epic file exists in `01-active/`
      const newFileMatch = bullet.match(/new (\w+) file exists in\s+`?([^`]+)`?/i)
      if (newFileMatch) {
        const dir = join(workdir, newFileMatch[2])
        if (existsSync(dir)) {
          const entries = readdirSync(dir).filter(f => f.endsWith('.md'))
          const fixtureIds = (scenario.given.epics ?? []).map(e => e.id).filter(Boolean)
          const newFiles = entries.filter(f => !fixtureIds.some(id => f.includes(id!)))
          if (newFiles.length === 0) {
            errors.push(`no new file found in ${newFileMatch[2]}`)
          }
        } else {
          errors.push(`directory does not exist: ${newFileMatch[2]}`)
        }
      }
    }

  } catch (e) {
    errors.push(`exception: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    // Cleanup
    rmSync(workdir, { recursive: true, force: true })
  }

  return {
    name: scenario.name,
    pass: errors.length === 0,
    errors,
    duration: Date.now() - start,
  }
}

// ── Main ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  const files = readdirSync(SCENARIOS_DIR).filter(f => f.endsWith('.md'))
  const scenarios: Scenario[] = []

  for (const file of files) {
    const path = join(SCENARIOS_DIR, file)
    try {
      scenarios.push(parseScenario(path))
    } catch (e) {
      console.error(`❌ Failed to parse ${file}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  console.log(`\n🧪 Cortex BDD Runner — ${scenarios.length} scenario(s)\n`)

  let passed = 0
  const results: Result[] = []

  for (const scenario of scenarios) {
    const result = await runScenario(scenario)
    results.push(result)
    const icon = result.pass ? '✅' : '❌'
    console.log(`${icon} ${result.name} (${result.duration}ms)`)
    if (!result.pass) {
      for (const e of result.errors) {
        console.log(`   → ${e}`)
      }
    }
    if (result.pass) passed++
  }

  console.log(`\n${passed}/${results.length} passed\n`)
  process.exit(passed === results.length ? 0 : 1)
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e)
    process.exit(1)
  })
}
