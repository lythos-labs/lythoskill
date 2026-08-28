import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { extractCommands, extractFlags, extractDispatchLabels, validateCommand, loadClis, checkSite } from './check-site-commands'

const ROOT = resolve(import.meta.dirname, '..')
const GUARD = join(ROOT, 'scripts', 'check-site-commands.ts')

let fixtureRoot: string

function fixture(name: string, markdown: string): string {
  const dir = join(fixtureRoot, name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'page.md'), markdown)
  return dir
}

function runGuard(siteDir: string): { exitCode: number; stdout: string; stderr: string } {
  // NOTE: under `bun test` with coverage on (repo bunfig.toml), spawnSync
  // pipe capture returns empty buffers — so redirect to files via sh
  // (same pattern as scripts/test-report.ts) and read them back.
  const outPath = join(siteDir, 'guard.stdout')
  const errPath = join(siteDir, 'guard.stderr')
  const res = Bun.spawnSync(
    ['sh', '-c', `bun "${GUARD}" --site-dir "${siteDir}" >"${outPath}" 2>"${errPath}"`],
    { cwd: ROOT },
  )
  return {
    exitCode: res.exitCode ?? 1,
    stdout: readFileSync(outPath, 'utf8'),
    stderr: readFileSync(errPath, 'utf8'),
  }
}

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), 'check-site-commands-'))
})

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true })
})

describe('extractCommands', () => {
  it('extracts bunx commands from code blocks and inline code', () => {
    const cmds = extractCommands('p.md', [
      '```bash',
      'bunx @lythos/skill-deck@latest link',
      '```',
      'Run `bunx @lythos/skill-arena vs --config arena.toml` to compare.',
    ].join('\n'))
    expect(cmds).toHaveLength(2)
    expect(cmds[0].pkg).toBe('@lythos/skill-deck')
    expect(cmds[0].tokens).toEqual(['link'])
    expect(cmds[1].tokens).toEqual(['vs', '--config', 'arena.toml'])
  })

  it('strips trailing shell comments and stops at shell operators', () => {
    const cmds = extractCommands('p.md', 'bunx @lythos/skill-curator ~/.agents/skill-repos   # Index your cold pool\nbunx @lythos/skill-deck link && echo done')
    expect(cmds[0].tokens).toEqual(['~/.agents/skill-repos'])
    expect(cmds[1].tokens).toEqual(['link'])
  })
})

describe('extractFlags', () => {
  it('pulls long and short flags from CLI source', () => {
    const flags = extractFlags(`if (args[i] === '--deck' || args[i] === '-d') opts.deck = args[++i]`)
    expect(flags.has('--deck')).toBe(true)
    expect(flags.has('-d')).toBe(true)
    expect(flags.has('--deck-a')).toBe(false)
  })
})

describe('validateCommand', () => {
  const clis = loadClis(ROOT)
  const at = (pkg: string, tokens: string[]) => ({ file: 'p.md', pkg, tokens, raw: `bunx ${pkg} ${tokens.join(' ')}` })

  it('accepts the commands the site actually uses', () => {
    expect(validateCommand(clis, at('@lythos/skill-deck', ['link']))).toBeNull()
    expect(validateCommand(clis, at('@lythos/skill-deck', ['link', '--deck', 'phase-dev.toml']))).toBeNull()
    expect(validateCommand(clis, at('@lythos/skill-arena', ['single', '--deck', 'd.toml', '--brief', 'x']))).toBeNull()
    expect(validateCommand(clis, at('@lythos/skill-arena', ['vs', '--config', 'arena.toml', '--dry-run']))).toBeNull()
    expect(validateCommand(clis, at('@lythos/skill-curator', ['~/.agents/skill-repos']))).toBeNull()
    expect(validateCommand(clis, at('@lythos/skill-curator', ['<pool-path>']))).toBeNull()
    expect(validateCommand(clis, at('@lythos/skill-curator', ['find', 'fact-check']))).toBeNull()
    expect(validateCommand(clis, at('@lythos/skill-curator', ['query', 'SELECT']))).toBeNull()
  })

  it('detector A: rejects hallucinated flags (arena vs --deck-a)', () => {
    const problem = validateCommand(clis, at('@lythos/skill-arena', ['vs', '--deck-a', 'a.toml']))
    expect(problem).toContain('unknown flag "--deck-a"')
  })

  it('detector B: rejects fake subcommands (curator scan)', () => {
    const problem = validateCommand(clis, at('@lythos/skill-curator', ['scan']))
    expect(problem).toContain('"scan" is not a @lythos/skill-curator subcommand')
  })

  it('detector B: rejects fake subcommands on subcommand-shaped CLIs', () => {
    expect(validateCommand(clis, at('@lythos/skill-arena', ['battle']))).toContain('unknown subcommand "battle"')
    expect(validateCommand(clis, at('@lythos/skill-deck', ['install']))).toContain('unknown subcommand "install"')
  })

  it('fails closed on unknown packages', () => {
    expect(validateCommand(clis, at('@lythos/curator', ['scan']))).toContain('unknown package "@lythos/curator"')
  })
})

describe('CLI_TABLE drift tripwire', () => {
  // The subcommand table is hand-maintained; this test makes drift loud —
  // every `case 'x'` / `=== 'x'` dispatch label in a subcommand-shaped CLI's
  // source must be in its table row (or its ignoreDispatch list).
  // (Caught a real miss: deck's `update` was absent, ZK review 2026-08-28.)
  const clis = loadClis(ROOT)
  for (const cli of clis.values()) {
    // positional CLIs are included too — curator's dispatch is a label chain
    it(`${cli.pkg}: every dispatch label is in the table`, () => {
      const labels = extractDispatchLabels(readFileSync(join(ROOT, cli.source), 'utf8'))
      const ignored = new Set([...(cli.ignoreDispatch ?? []), ...cli.commands])
      const missing = labels.filter(l => !ignored.has(l))
      expect(missing).toEqual([])
    })
  }

  it('guard fails closed when a CLI source is unreadable', () => {
    // loadClis with a bogus root → every loadError must surface as an offender
    const dir = fixture('unreadable-cli', '```bash\nbunx @lythos/skill-deck link\n```\n')
    const { offenders } = checkSite(dir, '/nonexistent-root')
    expect(offenders.some(o => o.includes('cannot read CLI source'))).toBe(true)
  })
})

describe('checkSite on fixture pages', () => {
  it('exit 0 on a page with only real commands', () => {
    const dir = fixture('valid', '```bash\nbunx @lythos/skill-arena vs --config arena.toml --dry-run\nbunx @lythos/skill-deck@latest link\n```\n')
    const res = runGuard(dir)
    expect(res.exitCode).toBe(0)
    expect(res.stdout.toString()).toContain('✅')
  })

  it('negative (a): exit 1 loudly on `arena vs --deck-a`', () => {
    const dir = fixture('bad-flag', '```bash\nbunx @lythos/skill-arena vs --deck-a a.toml --deck-b b.toml\n```\n')
    const res = runGuard(dir)
    expect(res.exitCode).toBe(1)
    const stderr = res.stderr.toString()
    expect(stderr).toContain('❌')
    expect(stderr).toContain('unknown flag "--deck-a"')
  })

  it('negative (b): exit 1 loudly on `skill-curator scan`', () => {
    const dir = fixture('bad-subcommand', '```bash\nbunx @lythos/skill-curator scan\n```\n')
    const res = runGuard(dir)
    expect(res.exitCode).toBe(1)
    const stderr = res.stderr.toString()
    expect(stderr).toContain('❌')
    expect(stderr).toContain('"scan" is not a @lythos/skill-curator subcommand')
  })
})
