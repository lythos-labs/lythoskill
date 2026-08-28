#!/usr/bin/env bun
/**
 * scripts/check-site-commands.ts
 *
 * Site pages show `bunx @lythos/<pkg>` commands for external users to copy-paste.
 * Twice in one week (2026-08) the site documented commands that don't exist:
 *
 *   - `bunx @lythos/curator scan`      — wrong package name AND a subcommand
 *                                        curator doesn't have (it takes a
 *                                        pool-path positional, not `scan`)
 *   - `arena vs --deck-a/--deck-b`     — flags that don't exist; real form is
 *                                        `vs --config arena.toml`
 *
 * Guard: every `bunx @lythos/<pkg>` command in site markdown pages must verify against
 * the real CLI. Two detector shapes, because the two historical bugs were
 * two different shapes:
 *
 *   A. Flag validation — every `--flag` used on the site must appear in the
 *      CLI's own source (packages/<name>/src/cli.ts). Source is scanned
 *      dynamically so the table cannot rot; over-approximation (a flag
 *      mentioned anywhere in the CLI source, incl. help text, counts as
 *      real) is intentional — the guard fails closed on hallucinated flags,
 *      never on flags the CLI genuinely documents.
 *
 *   B. Subcommand / positional validation — the first token must be a real
 *      subcommand from the CLI's dispatch code (static table below, with
 *      provenance pointers). Curator is the special case: it takes a
 *      pool-path positional, so a bare non-path word (`scan`) is rejected
 *      as a would-be subcommand. The table itself is tripwired by the
 *      "CLI_TABLE drift" test in check-site-commands.test.ts, which extracts
 *      dispatch labels (`case 'x'` / `=== 'x'`) from each CLI source and
 *      fails when a label is missing from the table — the same rot class
 *      this guard exists to kill (ZK review 2026-08-28 caught `update`
 *      missing from the deck table this way).
 *
 * Numbers policy ("N decks / N packages / N tests"): DEFERRED, documented
 * per TASK-20260828003758156. Build-time injection (inject-version.ts-style)
 * is the right end state, but the stale numbers live in prose across EN+ZH
 * page pairs — injecting there needs a markdown-it plugin or placeholder
 * replacement in every page, which is not a cheap extension of
 * inject-version.ts. Lint-checking numbers is brittle ("600+" ranges).
 * This round ships the command guard only; numbers get their own task
 * (TASK-20260828141622988).
 *
 * Exit 0 = all site commands verify. Exit 1 = violations found (loud list).
 *
 * Usage:
 *   bun scripts/check-site-commands.ts                    # check site/
 *   bun scripts/check-site-commands.ts --site-dir <path>  # check fixtures (tests)
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const SITE_DIR = join(ROOT, 'site')
const SKIP_DIRS = new Set(['node_modules', 'dist', 'cache', 'drafts'])

// ── Detector shape B: known-command table ────────────────────────────────
// Built from each CLI's actual dispatch code (provenance in comments).
// Flags are NOT listed here — they are extracted from the CLI source at
// runtime (detector shape A) so flag additions never stale this table.
// Add new CLIs here as the site starts referencing them.
//
// `ignoreDispatch`: literal `case 'x'` / `=== 'x'` matches in the source
// that are NOT subcommands (type checks, verb-level routing) — consumed by
// the drift tripwire test so it can require every real dispatch label to
// appear in `commands`.

export type CliShape = 'subcommand' | 'positional'

export interface CliSpec {
  pkg: string
  source: string // CLI entry, relative to repo root — scanned for flags
  shape: CliShape
  commands: string[]
  ignoreDispatch?: string[]
}

const CLI_TABLE: CliSpec[] = [
  {
    pkg: '@lythos/skill-arena',
    source: 'packages/lythoskill-arena/src/cli.ts',
    shape: 'subcommand',
    // dispatch: cli() switch — packages/lythoskill-arena/src/cli.ts (`if (cmd === ...)` chain)
    commands: ['single', 'run', 'vs', 'compare', 'viz', 'prepare-workdir', 'archive'],
    ignoreDispatch: ['string', 'true'], // typeof / literal comparisons, not subcommands
  },
  {
    pkg: '@lythos/skill-deck',
    source: 'packages/lythoskill-deck/src/cli.ts',
    shape: 'subcommand',
    // dispatch: switch (command) + HELP_CONFIG — packages/lythoskill-deck/src/cli.ts
    commands: ['link', 'add', 'refresh', 'update', 'validate', 'remove', 'to-symlink', 'to-snapshot', 'migrate-schema'],
    ignoreDispatch: ['json'], // mode comparison, not a subcommand
  },
  {
    pkg: '@lythos/skill-curator',
    source: 'packages/lythoskill-curator/src/cli.ts',
    shape: 'positional',
    // dispatch: printHelp + import.meta.main chain — packages/lythoskill-curator/src/cli.ts
    // No subcommand (or only flags) = scan mode with a pool-path positional.
    // Drift tripwire skips positional CLIs (dispatch is not a label switch).
    commands: ['add', 'tag', 'refresh-plan', 'refresh-execute', 'query', 'audit', 'find', 'restore'],
  },
  {
    pkg: '@lythos/skill-creator',
    source: 'packages/lythoskill-creator/src/cli.ts',
    shape: 'subcommand',
    // dispatch: switch — packages/lythoskill-creator/src/cli.ts
    commands: ['init', 'build', 'add-skill', 'align', 'bump'],
  },
  {
    pkg: '@lythos/project-cortex',
    source: 'packages/lythoskill-project-cortex/src/cli.ts',
    shape: 'subcommand',
    // dispatch: switch — packages/lythoskill-project-cortex/src/cli.ts
    commands: [
      'init', 'task', 'epic', 'adr', 'wiki', 'list', 'stats', 'next-id', 'index', 'probe', 'flow',
      'start', 'review', 'done', 'complete', 'suspend', 'resume', 'reject', 'terminate', 'archive',
      'dispatch-trailers',
    ],
    ignoreDispatch: ['accept', 'supersede', 'create'], // verb-level routing (adr accept, task create), not top-level subcommands
  },
]

// ── Extraction ───────────────────────────────────────────────────────────

export interface SiteCommand {
  file: string
  pkg: string
  tokens: string[]
  raw: string
}

// bunx @lythos/<name>[@version] <args...>  — args stop at EOL or closing backtick
const CMD_RE = /bunx\s+(@lythos\/[a-z0-9-]+)(?:@[\w.^~*-]+)?([^\n`]*)/g
const SHELL_OPS = new Set(['&&', '||', '|', ';'])

export function extractCommands(file: string, content: string): SiteCommand[] {
  // Join shell line continuations so multi-line commands tokenize as one.
  const joined = content.replace(/\\\n/g, ' ')
  const results: SiteCommand[] = []
  for (const m of joined.matchAll(CMD_RE)) {
    const raw = m[0].trim()
    // Strip trailing shell comments, then tokenize; stop at shell operators.
    const argText = m[2].replace(/#.*$/, '')
    const tokens: string[] = []
    for (const tok of argText.split(/\s+/)) {
      const clean = tok.replace(/^["']|["']$/g, '')
      if (!clean) continue
      if (SHELL_OPS.has(clean)) break
      tokens.push(clean)
    }
    results.push({ file, pkg: m[1], tokens, raw })
  }
  return results
}

// ── Detector shape A: flags from CLI source ──────────────────────────────
// Whole-source scan, deliberate over-approximation: a flag passes only if
// the CLI's own source mentions it somewhere (parser, help, error text).

const FLAG_RE = /(--[a-z][a-z0-9-]*)/g
const SHORT_FLAG_RE = /(?<![\w`-])(-[a-z])(?![\w-])/g

export function extractFlags(sourceText: string): Set<string> {
  const flags = new Set<string>(['--help', '-h', '--version'])
  for (const m of sourceText.matchAll(FLAG_RE)) flags.add(m[1])
  for (const m of sourceText.matchAll(SHORT_FLAG_RE)) flags.add(m[1])
  return flags
}

// ── Drift tripwire support: dispatch labels from CLI source ─────────────
// Extracts `case 'word'` and `=== 'word'` literals — the candidate set of
// dispatched subcommands. The test asserts every extracted label of a
// subcommand-shaped CLI is in its `commands` (or `ignoreDispatch`) row.

export function extractDispatchLabels(sourceText: string): string[] {
  const labels = new Set<string>()
  for (const m of sourceText.matchAll(/case '([a-z][a-z0-9-]*)'/g)) labels.add(m[1])
  for (const m of sourceText.matchAll(/=== '([a-z][a-z0-9-]*)'/g)) labels.add(m[1])
  return [...labels]
}

export interface LoadedCli extends CliSpec {
  flags: Set<string>
  loadError?: string
}

export function loadClis(root: string = ROOT): Map<string, LoadedCli> {
  const map = new Map<string, LoadedCli>()
  for (const spec of CLI_TABLE) {
    // Fail closed: an unreadable CLI source means we cannot verify — the
    // load error is recorded on the entry and reported by checkSite as an
    // offender (a silently empty flag set would let hallucinated-flag
    // detection pass vacuously).
    let flags = new Set<string>()
    let loadError: string | undefined
    try {
      flags = extractFlags(readFileSync(join(root, spec.source), 'utf8'))
    } catch (e) {
      loadError = `cannot read CLI source ${spec.source}: ${(e as Error).message}`
    }
    map.set(spec.pkg, { ...spec, flags, loadError })
  }
  return map
}

// ── Validation ───────────────────────────────────────────────────────────

function isPathLike(token: string): boolean {
  // <pool-path>-style placeholders count — they document the positional slot.
  if (token.startsWith('<') && token.endsWith('>')) return true
  return token.includes('/') || token.startsWith('~') || token.startsWith('.')
}

export function validateCommand(clis: Map<string, LoadedCli>, cmd: SiteCommand): string | null {
  const cli = clis.get(cmd.pkg)
  if (!cli) {
    return `unknown package "${cmd.pkg}" — not in the guard's CLI table (check-site-commands.ts CLI_TABLE); if this package is real, add it there`
  }

  const [first, ...rest] = cmd.tokens

  if (first !== undefined && !first.startsWith('-')) {
    if (cli.commands.includes(first)) {
      // real subcommand — fall through to flag validation
    } else if (cli.shape === 'positional' && isPathLike(first)) {
      // pool-path positional (curator scan form) — OK
    } else if (cli.shape === 'positional') {
      return `"${first}" is not a ${cli.pkg} subcommand and doesn't look like a pool path — ${cli.pkg} takes a pool-path positional (scan mode) or one of: ${cli.commands.join(', ')}`
    } else {
      return `unknown subcommand "${first}" — ${cli.pkg} supports: ${cli.commands.join(', ')}`
    }
  }

  for (const tok of first !== undefined && first.startsWith('-') ? [first, ...rest] : rest) {
    if (!tok.startsWith('-')) continue
    const flag = tok.startsWith('--') ? tok.split('=')[0] : tok
    if (!cli.flags.has(flag)) {
      return `unknown flag "${flag}" — not found in ${cli.source} (the CLI's real option set)`
    }
  }
  return null
}

// ── Site walk + report ───────────────────────────────────────────────────

function walk(dir: string, ext: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) results.push(...walk(full, ext))
    } else if (entry.name.endsWith(ext)) {
      results.push(full)
    }
  }
  return results
}

export function checkSite(siteDir: string, root: string = ROOT): { offenders: string[]; checked: number } {
  const clis = loadClis(root)
  const offenders: string[] = []
  // Fail closed: a CLI source we cannot read is itself a violation —
  // without its flags, detector A would pass vacuously.
  for (const cli of clis.values()) {
    if (cli.loadError) offenders.push(`${cli.pkg}: ${cli.loadError}`)
  }
  let checked = 0
  for (const page of walk(siteDir, '.md')) {
    const content = readFileSync(page, 'utf8')
    for (const cmd of extractCommands(page, content)) {
      checked++
      const problem = validateCommand(clis, cmd)
      if (problem) {
        offenders.push(`${relative(root, cmd.file)}: \`${cmd.raw}\`\n     ${problem}`)
      }
    }
  }
  return { offenders, checked }
}

// ── Main ─────────────────────────────────────────────────────────────────

function main(): void {
  const argv = process.argv.slice(2)
  let siteDir = SITE_DIR
  const idx = argv.indexOf('--site-dir')
  if (idx >= 0 && argv[idx + 1]) siteDir = resolve(argv[idx + 1])

  const { offenders, checked } = checkSite(siteDir)

  if (offenders.length > 0) {
    console.error('❌ Site pages document bunx commands that do not match the real CLIs:')
    for (const o of offenders) console.error(`   ${o}`)
    console.error('')
    console.error('Fix: correct the site page to the real command, or — if the CLI genuinely')
    console.error('gained a subcommand — update CLI_TABLE in scripts/check-site-commands.ts.')
    console.error('(Flags are read live from each CLI source; subcommand drift is tripwired')
    console.error('by the CLI_TABLE drift test in check-site-commands.test.ts.)')
    process.exit(1)
  }

  console.log(`✅ All bunx @lythos/* commands on the site match the real CLIs (${checked} commands checked)`)
}

if (import.meta.main) {
  main()
}
