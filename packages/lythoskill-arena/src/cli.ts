#!/usr/bin/env bun
import { writeFileSync, readFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { ZodError } from 'zod'
import { formatPlanOutput, type ArenaResult, buildArenaPrompt } from './runner'
import { parseArenaToml, buildExecutionPlan } from './arena-toml'
import { buildArchiveSidePlan, buildCopyPlan, buildPreparePlan, parseDeckSkills } from './preflight'
import { checkSkillExistence, formatSkillWarnings, resolveColdPoolDir } from './preflight'
import { resolveSingleMode } from './host'

// ─── ArenaCliIO interface (injected for testability) ───────────────────────

export interface ArenaCliIO {
  log?: (msg: string) => void
  error?: (msg: string) => void
  warn?: (msg: string) => void
  exit?: (code: number) => never
}

export const defaultArenaCliIO: Required<ArenaCliIO> = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  exit: (code) => { process.exit(code) },
}

// ─── fetchWithProxy (infra dependency, no package boundary) ─────────────────

async function fetchWithProxy(url: string, init?: RequestInit): Promise<Response> {
  const { LYTHOS_SOCKS_PROXY } = process.env
  if (!LYTHOS_SOCKS_PROXY) return fetch(url, init)
  const [host, portStr] = LYTHOS_SOCKS_PROXY.split(':')
  const port = parseInt(portStr || '1086', 10)
  if (!host) return fetch(url, init)
  try {
    const net = await import('node:net')
    const tls = await import('node:tls')
    const u = new URL(url)
    const isHttps = u.protocol === 'https:'
    const targetHost = u.hostname
    const targetPort = parseInt(u.port || (isHttps ? '443' : '80'), 10)
    const socket = await new Promise<import('node:net').Socket>((resolve, reject) => {
      const s = net.connect({ host, port }, () => resolve(s))
      s.on('error', reject)
    })
    try {
      if (isHttps) {
        await new Promise<void>((res, rej) => {
          socket.write(`CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n\r\n`)
          socket.once('data', (d: Buffer) => {
            const status = d.toString().split(' ')[1]
            if (status === '200') res()
            else rej(new Error(`SOCKS CONNECT rejected: ${status}`))
          })
        })
      }
      const agent = isHttps
        ? new tls.TLSSocket(socket, { isServer: false, servername: targetHost })
        : socket
      await new Promise<void>((res) => agent.once('secureConnect', res).once('connect', res))
      const method = init?.method ?? 'GET'
      const headers = init?.headers ? new Headers(init.headers) : new Headers()
      headers.set('Host', targetHost)
      const req = `${method} ${u.pathname}${u.search} HTTP/1.1\r\nHost: ${targetHost}\r\nConnection: close\r\n`
      let headerBlock = req
      for (const [k, v] of headers) headerBlock += `${k}: ${v}\r\n`
      headerBlock += '\r\n'
      agent.write(headerBlock)

      let body = init?.body
      if (body && init?.duplex !== 'half') {
        if (typeof body === 'string') agent.write(body)
        else agent.write(Buffer.from(await (body as Blob).arrayBuffer()))
      }
      agent.end()

      const chunks: Buffer[] = []
      for await (const chunk of agent) chunks.push(chunk as Buffer)
      const raw = Buffer.concat(chunks).toString()
      const headEnd = raw.indexOf('\r\n\r\n')
      const status = parseInt(raw.split(' ')[1] || '200', 10)
      return new Response(raw.slice(headEnd + 4), { status })
    } finally { socket.destroy() }
  } catch (e) { throw e }
}

// ── Link validation ────────────────────────────────────────────────────────
// "no skills found to symlink" is a warning, not an error — a deck may
// legitimately have only innate/innate-only cards.

function validateLinkResult(exitCode: number | null, stderr: string): { ok: boolean; error?: string } {
  if (exitCode === 0) return { ok: true }
  if (stderr.includes('Cannot find module')) {
    return { ok: false, error: `deck link failed: @lythos/skill-deck not installed or not found. Run: bun install` }
  }
  if (stderr.includes('no skills found to symlink')) return { ok: true }
  return { ok: false, error: `deck link exited with code ${exitCode}: ${stderr.slice(0, 200)}` }
}

// ═══════════════════════════════════════════════════════════════════════════
export async function main(args: string[] = process.argv.slice(2), io: ArenaCliIO = defaultArenaCliIO) {
  const { log, exit } = { ...defaultArenaCliIO, ...io }
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    log(`lythoskill-arena — skill evaluation CLI

Usage:
  lythoskill-arena single|vs|viz <options>

Commands:
  single   Test one deck against a task (--deck + --brief or --task)
  vs       Compare decks via arena.toml (declarative, Pareto-optimal)
  viz      Visualize a completed arena run (HTML + chart)

Modes (single):
  Inside an agent session  → host-handoff guidance (default; no external spawn)
  Anywhere else            → pass --player <name> (kimi|kimi-code|codex|claude|deepseek)

Examples:
  lythoskill-arena single --brief "find and research" --deck ./decks/scout.toml
  lythoskill-arena single --brief "find and research" --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml
  lythoskill-arena vs --config arena.toml --dry-run
  lythoskill-arena vs --config arena.toml
  lythoskill-arena viz runs/arena-20260504
  lythoskill-arena prepare-workdir --deck ./decks/scout.toml --out /tmp/arena-20260517-side-a
  lythoskill-arena archive --from /tmp/arena-20260517 --to playground/arena-20260517 --sides side-a,side-b
`)
    exit(0)
  }
  return cli(args, io)
}

function cli(args: string[], io: ArenaCliIO) {
  const cmd = args[0]
  const rest = args.slice(1)

  if (cmd === 'vs' || cmd === 'compare') return vsRun(rest, io)
  if (cmd === 'single' || cmd === 'run') return singleRun(rest, io)
  if (cmd === 'viz') return vizRun(rest, io)
  if (cmd === 'prepare-workdir') return prepareWorkdir(rest, io)
  if (cmd === 'archive') return archiveRun(rest, io)

  const { error, exit } = { ...defaultArenaCliIO, ...io }
  error(`Unknown command: ${cmd}`)
  exit(1)
}

// ── single: single-player deck test (exec shortcut) ──────────────────────

async function singleRun(args: string[], io: ArenaCliIO) {
  const { log, error, warn, exit } = { ...defaultArenaCliIO, ...io }
  const opts: Record<string, string | undefined> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--task' || args[i] === '-t') opts.task = args[++i]
    else if (args[i] === '--brief' || args[i] === '-b') opts.brief = args[++i]
    else if (args[i] === '--deck' || args[i] === '-d') opts.deck = args[++i]
    else if (args[i] === '--player' || args[i] === '-p') opts.player = args[++i]
    else if (args[i] === '--out' || args[i] === '-o') opts.out = args[++i]
    else if (args[i] === '--timeout') opts.timeout = args[++i]
  }

  if (opts.player !== undefined && !opts.player) {
    error(`❌ --player requires a non-empty name (e.g. --player kimi).
   Player setup: skills/lythoskill-arena/references/player-setup.md`)
    exit(1)
  }

  // Mode resolution comes FIRST (ADR-20260828004129143): with no --player, the
  // relevant failure/guidance is about execution mode, not about flags.
  const mode = resolveSingleMode(opts.player, process.env)
  if (mode.mode === 'no-player') {
    error(`❌ No --player given and no agent host detected.
   arena single runs in one of two modes:
     1. Inside an agent session → host-handoff is the default (the host orchestrates the run).
     2. Anywhere else → pass --player <name> to spawn an external CLI.
   Player setup: skills/lythoskill-arena/references/player-setup.md`)
    exit(1)
  }

  if (!opts.deck) {
    error(`❌ --deck <path|url> is required.
   --deck accepts local paths and http/https URLs (auto-fetched).

   Example (no local file needed — URL is auto-fetched):
     lythoskill-arena single \\
       --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml \\
       --brief "your task"

   Or with a local deck file you already have:
     lythoskill-arena single --deck ./examples/decks/scout.toml --brief "your task"`)
    exit(1)
  }
  if (!opts.task && (!opts.brief || !opts.brief.trim())) {
    error(`❌ --task <path> or --brief "<text>" is required.
   --task reads a .agent.md scenario file; --brief takes inline text.

   Example (no local file needed — URL is auto-fetched):
     lythoskill-arena single \\
       --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml \\
       --brief "your task"

   Or with a local deck file:
     lythoskill-arena single --deck ./examples/decks/scout.toml --brief "your task"`)
    exit(1)
  }

  let resolvedTaskPath: string | undefined
  if (opts.task) {
    resolvedTaskPath = resolve(opts.task)
    if (!existsSync(resolvedTaskPath)) {
      error(`❌ Task file not found: ${resolvedTaskPath}
   Use --brief for inline tasks, or point --task to an existing .agent.md file.
   Format: name + description + Given/When/Then sections.

   Example (URL):  lythoskill-arena single --brief "your task" --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml
   Or (local):     lythoskill-arena single --brief "your task" --deck ./examples/decks/scout.toml`)
      exit(1)
    }
    const raw = readFileSync(resolvedTaskPath, 'utf-8')
    if (!raw.startsWith('---')) {
      error(`❌ Invalid .agent.md: missing frontmatter (must start with "---")
   Correct format:
   ---
   name: my-scenario
   description: what this tests
   timeout: 120000
   ---
   ## Given
   ...
   ## When
   ...
   ## Then
   ...`)
      exit(1)
    }
    if (!raw.includes('## When')) {
      error(`❌ Invalid .agent.md: missing "## When" section.
   The ## When section defines what the agent should do.
   See template: playground/arena-one-shot/TASK-arena.agent.md`)
      exit(1)
    }
  }

  // Host-handoff: print HATEOAS guidance and return BEFORE any fetch/spawn —
  // no-spawn is structural (adapter dynamic imports below are never reached,
  // no agent-output-* dir is ever created).
  if (mode.mode === 'handoff') {
    // Fail fast on a bogus LOCAL deck path — the host agent would discover it
    // later otherwise. URLs are passed through (fetch validation is the host's).
    if (!/^https?:\/\//.test(opts.deck!) && !existsSync(resolve(opts.deck!))) {
      error(`❌ Deck file not found: ${resolve(opts.deck!)}
   Fix the path (or pass a URL) before handing off — the host agent needs a real deck.`)
      exit(1)
    }
    log(`🤝 Host-handoff mode — agent session detected (${mode.host.host}${mode.host.marker ? ` via ${mode.host.marker}` : ''})

   What: arena single is running inside an agent session and hands this run back to the host.
   Why:  host-orchestrated runs are the default (ADR-20260828004129143) — the host agent
         spawns subagents per deck and judges outputs itself; no external player CLI needed.
   How:  1. In a subagent workdir, link the deck: bunx @lythos/skill-deck link --deck ${opts.deck}
         2. Spawn a subagent with that workdir and this ${opts.task ? `task: ${opts.task}` : `brief: ${opts.brief}`}
         3. Judge the subagent output(s) against the brief.
   Docs: skills/lythoskill-arena/references/arena-runtime.md
   Override: pass --player <name> to force an external CLI run.`)
    return
  }

  const { existsSync: deckExists, writeFileSync: deckWrite } = await import('node:fs')
  let deckPath: string
  if (opts.deck.startsWith('http://') || opts.deck.startsWith('https://')) {
    let url = opts.deck
    try {
      const u = new URL(url)
      if (u.hostname === 'github.com' && u.pathname.includes('/blob/')) {
        url = `https://raw.githubusercontent.com${u.pathname.replace('/blob/', '/')}`
      }
    } catch (e: any) {
      if (e.code !== 'ERR_INVALID_URL') console.debug(`deck URL parse skipped (not a URL): ${url}`)
    }
    const { mirrorUrls, isLikelyGitHubBlock } = await import('../../lythoskill-cold-pool/src/mirror.js')
    const dest = resolve(process.cwd(), 'arena-deck.toml')
    log(`📥 Fetching arena deck: ${url}`)
    let res: Response | undefined
    let allFailed = true

    try { res = await fetchWithProxy(url, { signal: AbortSignal.timeout(30_000) }); if (res.ok) allFailed = false } catch {}

    if (!res?.ok) {
      for (const mirrorUrl of mirrorUrls(url)) {
        try {
          log(`   ↳ trying mirror: ${mirrorUrl}`)
          const r = await fetchWithProxy(mirrorUrl, { signal: AbortSignal.timeout(30_000) })
          if (r.ok) { res = r; allFailed = false; break }
        } catch {}
      }
    }

    if (!res?.ok) {
      const errorDetail = res ? `HTTP ${res.status}` : 'unreachable'
      error(`❌ Cannot reach ${url} (${errorDetail})`)
      if (allFailed) error('   Set LYTHOS_GH_MIRROR to use a custom mirror.')
      error('   Or download manually and reference the local file.')
      exit(1)
    }

    deckWrite(dest, await res.text())
    log(`   → saved to ${dest}`)
    deckPath = dest
  } else {
    deckPath = resolve(opts.deck)
    if (!deckExists(deckPath)) { error(`❌ Deck file not found: ${deckPath}
   Make sure the path is correct, or use a URL:
     --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml
   (URLs are auto-fetched — no local file needed)`); exit(1) }
  }

  const { useAgent } = await import('@lythos/test-utils/agents')
  try { await import('@lythos/agent-adapter-claude-sdk') } catch { /* package not installed */ }
  try { await import('@lythos/agent-adapter-deepseek-serve') } catch { /* package not installed */ }
  try { await import('@lythos/agent-adapter-codex') } catch { /* package not installed */ }
  const { resolvePlayer, playerAliasNote } = await import('./player')

  const player = resolvePlayer(mode.player)
  const agent = useAgent(player)
  const aliasNote = playerAliasNote(mode.player)
  if (aliasNote) log(`ℹ️  ${aliasNote}`)
  const outDir = opts.out ? resolve(opts.out) : join(process.cwd(), `agent-output-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`)
  mkdirSync(outDir, { recursive: true })

  // Direct agent.spawn — no parseAgentMd, no AgentScenario, no runAgentScenario.
  // Markdown is for LLM agents; task text is read/stored as a raw string.
  const taskText = resolvedTaskPath ? readFileSync(resolvedTaskPath, 'utf-8') : opts.brief!

  log(`🤖 agent-run: ${player} × ${deckPath}`)
  if (opts.task) log(`📋 task: ${resolve(opts.task!)}`)
  else log(`📋 brief: ${opts.brief!.slice(0, 60)}...`)

  // Setup workdir
  const agentWorkdir = join(tmpdir(), `arena-single-${Date.now()}`)
  mkdirSync(agentWorkdir, { recursive: true })
  writeFileSync(join(agentWorkdir, 'skill-deck.toml'), readFileSync(deckPath, 'utf-8'))
  writeFileSync(join(agentWorkdir, 'AGENTS.md'), [
    '# Arena Test Environment',
    `**Mode**: single`,
    '## How This Works',
    '- Isolated arena test directory. Skills in skill-deck.toml, linked via deck link.',
    '- Complete the task using available skills. Output to this directory.',
    '- MANDATORY: write decision-log.jsonl (see prompt for schema).',
  ].join('\n'))

  const deckRaw = readFileSync(join(agentWorkdir, 'skill-deck.toml'), 'utf-8')
  let deckParsed: Record<string, any> = {}
  try { deckParsed = Bun.TOML.parse(deckRaw) as Record<string, any> } catch {}
  const hasSkills = parseDeckSkills(deckParsed).length > 0

  if (hasSkills) {
    const { existsSync: es2 } = await import('node:fs')
    const localDeckCli = join(import.meta.dir, '..', '..', 'lythoskill-deck', 'src', 'cli.ts')
    const linkCmd = es2(localDeckCli)
      ? ['bun', localDeckCli, 'link']
      : ['bunx', '@lythos/skill-deck', 'link']
    const linkProc = Bun.spawn(linkCmd,
      { cwd: agentWorkdir, env: { ...process.env, HOME: process.env.HOME! } },
    )
    await linkProc.exited
    const linkStderr = await new Response(linkProc.stderr).text()
    const linkResult = validateLinkResult(linkProc.exitCode, linkStderr)
    if (!linkResult.ok) {
      error(`❌ ${linkResult.error}`)
      exit(1)
    }
  } else {
    log('ℹ️  No skills declared in deck — skipping link')
  }

  const { existsSync: es } = await import('node:fs')
  const { homedir: hd } = await import('node:os')
  try {
    const coldPoolDefault = join(hd(), '.agents', 'skill-repos')
    const coldPoolDir = resolveColdPoolDir(deckParsed?.deck?.cold_pool, hd(), coldPoolDefault)
    const skills = parseDeckSkills(deckParsed)
    const checks = checkSkillExistence(skills, coldPoolDir, es)
    for (const warning of formatSkillWarnings(checks)) {
      warn(`⚠️  ${warning}`)
    }
  } catch (e) {
    warn('⚠️  Could not check skill existence:', e instanceof Error ? e.message : e)
  }

  // Template injection: brief is the {task} variable, template carries fixed contract
  const fullPrompt = buildArenaPrompt({
    brief: taskText,
    cwd: agentWorkdir,
    deckPath: deckPath,
    outputDir: agentWorkdir,
  })
  const agentResult = await agent.spawn({
    cwd: agentWorkdir,
    brief: fullPrompt,
    timeoutMs: Number(opts.timeout ?? 120000),
  })

  // Persist agent output to outDir
  writeFileSync(join(outDir, 'agent-stdout.txt'), agentResult.stdout, 'utf-8')
  if (agentResult.stderr) writeFileSync(join(outDir, 'agent-stderr.txt'), agentResult.stderr, 'utf-8')

  // Copy agent-produced files to outDir
  const { cpSync, readdirSync, existsSync: es3 } = await import('node:fs')
  if (es3(agentWorkdir)) {
    const skipSet = new Set(['.claude', 'skill-deck.toml', 'skill-deck.lock', 'AGENTS.md'])
    try {
      const entries = readdirSync(agentWorkdir)
      const plan = buildCopyPlan(agentWorkdir, outDir, entries, skipSet)
      for (const { src, dest, name } of plan) {
        try { cpSync(src, dest, { recursive: true }) } catch (e) {
          warn(`⚠️  Failed to copy agent output: ${name} — ${e instanceof Error ? e.message : e}`)
        }
      }
    } catch (e) {
      warn(`⚠️  Failed to copy agent output: ${e instanceof Error ? e.message : e}`)
    }
  }

  // Summary (no judge — single mode is execution-only)
  log(`\n✅ Agent run complete → ${outDir}`)
  log(`   deck: ${deckPath}`)
  log(`   player: ${player}`)
}

// ── vs: arena.toml-driven comparison ──────────────────────────────────────

async function vsRun(args: string[], io: ArenaCliIO) {
  const { log, error, exit } = { ...defaultArenaCliIO, ...io }
  // Native TOML parser is simpler than adding smol-toml dependency
  const opts: Record<string, string | undefined> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' || args[i] === '-c') opts.config = args[++i]
    else if (args[i] === '--out' || args[i] === '-o') opts.out = args[++i]
    else if (args[i] === '--dry-run') opts.dryRun = 'true'
    else if (args[i] === '--player' || args[i] === '-p') opts.player = args[++i]
  }

  if (!opts.config) {
    error('❌ arena.toml path required: lythoskill-arena vs --config arena.toml')
    exit(1)
  }

  const configPath = resolve(opts.config)
  if (!existsSync(configPath)) {
    error(`❌ Config file not found: ${configPath}`)
    exit(1)
  }

  const toml = parseArenaToml(readFileSync(configPath, 'utf-8'))

  if (opts.player) {
    // Override all sides' player for --player flag
    for (const side of toml.side) {
      ;(side as Record<string, unknown>).player = opts.player
    }
  }

  const taskPath = toml.arena.task
  const isDryRun = opts.dryRun === 'true'

  if (isDryRun) {
    log(`🔍 Scanning arena.toml: ${configPath}`)
  } else {
    log(`🏟  Arena VS: ${configPath}`)
    log(`   sides: ${toml.side.length}`)
    log(`   runs per side: ${toml.arena.runs_per_side}`)
  }

  const { runArenaFromToml } = await import('./runner')
  const result = await runArenaFromToml({
    toml,
    taskPath,
    outDir: opts.out ? resolve(opts.out) : undefined,
    dryRun: isDryRun,
    log: log,
    configDir: resolve(configPath, '..'),
  })

  if ('plan' in result) {
    if (!isDryRun) log('📋 Execution plan (dry-run):')
    for (const line of formatPlanOutput(result.plan)) log(line)
  } else if ('manifest' in result) {
    const r = result
    log(`\n📊 Arena complete: ${r.manifest.id}`)
    log(`   report: ${r.artifactsDir}/report.md`)
    log(`   participants: ${r.manifest.participants.map(p => p.name).join(', ')}`)
  }
}

// ── viz: generate HTML report from arena.json ─────────────────────────────

async function vizRun(args: string[], io: ArenaCliIO) {
  const { error, exit, log } = { ...defaultArenaCliIO, ...io }
  const runsDir = args.find(a => !a.startsWith('-'))
  if (!runsDir) { error('❌ runs/<arena-id> path required: lythoskill-arena viz runs/arena-20260504'); exit(1) }

  const arenaJsonPath = resolve(runsDir, 'arena.json')
  if (!existsSync(arenaJsonPath)) { error(`❌ arena.json not found in: ${runsDir}`); exit(1) }

  log(`📈 Arena HTML report not yet implemented. See report.md in ${runsDir}/`)
}

// ═══════════════════════════════════════════════════════════════════════════
// ── prepare-workdir: reusable workdir setup (used by both CLI and agent) ──
// Intent: create an isolated arena workdir with deck linked and ready to run

async function prepareWorkdir(args: string[], io: ArenaCliIO) {
  const { log, error, warn, exit } = { ...defaultArenaCliIO, ...io }
  const opts: Record<string, string | undefined> = {}
  let dryRun = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--deck' || args[i] === '-d') opts.deck = args[++i]
    else if (args[i] === '--out' || args[i] === '-o') opts.out = args[++i]
    else if (args[i] === '--brief' || args[i] === '-b') opts.brief = args[++i]
    else if (args[i] === '--dry-run') dryRun = true
  }

  if (!opts.deck) {
    error(`❌ --deck <path> is required.
   lythoskill-arena prepare-workdir --deck ./skill-deck.toml --out /tmp/arena-side-a`)
    exit(1)
  }

  const deckPath = resolve(opts.deck)
  if (!existsSync(deckPath)) {
    error(`❌ Deck file not found: ${deckPath}`)
    exit(1)
  }

  const workDir = opts.out
    ? resolve(opts.out)
    : join(tmpdir(), `arena-${Date.now()}`)
  const deckContent = readFileSync(deckPath, 'utf-8')

  // ── Plan (pure computation — what WOULD be created) ────────────────────
  const plan = buildPreparePlan({
    deckPath,
    deckContent,
    workDir,
    skillCount: 0, // computed inside from deckContent
    brief: opts.brief,
  })

  log('📋 Prepare plan:')
  log(`   deck:    ${plan.deckPath}`)
  log(`   workdir: ${plan.workDir}`)
  log(`   skills:  ${plan.skills.length} declared (${plan.skills.map(s => s.name).join(', ') || 'none'})`)
  log(`   link:    ${plan.hasSkills ? 'Bun.spawn deck link' : 'skip (no skills)'}`)
  log(`   AGENTS.md: write (${plan.agentsMd.split('\n').length} lines)`)
  if (opts.brief) log(`   brief:   ${opts.brief!.slice(0, 60)}...`)

  if (dryRun) {
    log(`\n🏁 Dry-run complete (no files created). Remove --dry-run to execute.`)
    return
  }

  // ── Execute: create workdir ──────────────────────────────────────────
  mkdirSync(workDir, { recursive: true })
  writeFileSync(join(workDir, 'skill-deck.toml'), deckContent)
  writeFileSync(join(workDir, 'AGENTS.md'), plan.agentsMd)

  if (plan.hasSkills) {
    const { existsSync: es2 } = await import('node:fs')
    const localDeckCli = join(import.meta.dir, '..', '..', 'lythoskill-deck', 'src', 'cli.ts')
    const linkCmd = es2(localDeckCli)
      ? ['bun', localDeckCli, 'link']
      : ['bunx', '@lythos/skill-deck', 'link']
    const linkProc = Bun.spawn(linkCmd,
      { cwd: workDir, env: { ...process.env, HOME: process.env.HOME! } },
    )
    await linkProc.exited
    const linkStderr = await new Response(linkProc.stderr).text()
    const linkResult = validateLinkResult(linkProc.exitCode, linkStderr)
    if (!linkResult.ok) {
      error(`❌ ${linkResult.error}`)
      exit(1)
    }
  } else {
    log('ℹ️  No skills declared in deck — skipping link')
  }

  // Skill existence check
  try {
    const coldPoolDefault = join(homedir(), '.agents', 'skill-repos')
    const coldPoolDir = resolveColdPoolDir(Bun.TOML.parse(deckContent)?.deck?.cold_pool, homedir(), coldPoolDefault)
    const checks = checkSkillExistence(plan.skills, coldPoolDir, existsSync)
    for (const warning of formatSkillWarnings(checks)) {
      warn(`⚠️  ${warning}`)
    }
  } catch (e) {
    warn('⚠️  Could not check skill existence:', e instanceof Error ? e.message : e)
  }

  log(`✅ Workdir ready → ${workDir}`)
  log(`   deck: ${deckPath}`)
  if (opts.brief) log(`   brief: ${opts.brief!.slice(0, 60)}...`)
}

// ═══════════════════════════════════════════════════════════════════════════
// ── archive: copy agent outputs from workdir(s) to outDir ─────────────────
// Intent: same copy behavior as CLI singleRun, reusable for agent-orchestrated

async function archiveRun(args: string[], io: ArenaCliIO) {
  const { log, error, warn, exit } = { ...defaultArenaCliIO, ...io }
  const opts: Record<string, string | undefined> = {}
  let dryRun = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' || args[i] === '-f') opts.from = args[++i]
    else if (args[i] === '--to' || args[i] === '-o') opts.to = args[++i]
    else if (args[i] === '--sides') opts.sides = args[++i]
    else if (args[i] === '--report') opts.report = args[++i]
    else if (args[i] === '--dry-run') dryRun = true
  }

  if (!opts.from || !opts.to) {
    error(`❌ --from <workdir> and --to <outdir> are required.
   lythoskill-arena archive --from /tmp/arena-20260517 --to playground/arena-20260517 --sides side-a,side-b --report ./report.md`)
    exit(1)
  }

  const fromDir = resolve(opts.from)
  const outDir = resolve(opts.to)

  const sides = opts.sides ? opts.sides.split(',') : ['.']
  const plan = buildArchiveSidePlan(fromDir, sides, existsSync)

  // ── Plan output (always shown, also serves as dry-run) ──────────────────
  log('📋 Archive plan:')
  for (const pe of plan) {
    if (!pe.found) {
      log(`   ⚠️  ${pe.side}: not found (${pe.sourceDir}) — will skip`)
    } else if (pe.sourceDir === fromDir && pe.side !== '.') {
      log(`   ${pe.side}: ${pe.sourceDir} (fallback → root) → ${join(outDir, pe.side)}`)
    } else {
      log(`   ${pe.side}: ${pe.sourceDir} → ${join(outDir, pe.side)}`)
    }
  }
  if (dryRun) {
    log(`\n🏁 Dry-run complete (no files copied). Remove --dry-run to execute.`)
    return
  }

  // ── Execute: copy files ───────────────────────────────────────────────
  mkdirSync(outDir, { recursive: true })

  if (opts.report && existsSync(resolve(opts.report))) {
    const { cpSync: cpR } = await import('node:fs')
    cpR(resolve(opts.report), join(outDir, 'report.md'))
    log(`📄 report.md → ${outDir}/report.md`)
  }

  const { cpSync, readdirSync } = await import('node:fs')
  const skipSet = new Set(['.claude', 'skill-deck.toml', 'skill-deck.lock', 'AGENTS.md'])

  for (const planEntry of plan) {
    if (!planEntry.found) {
      warn(`⚠️  Side workdir not found: ${planEntry.sourceDir}`)
      continue
    }

    const sideOutDir = join(outDir, planEntry.side)
    mkdirSync(sideOutDir, { recursive: true })

    const entries = readdirSync(planEntry.sourceDir, { withFileTypes: true })
    for (const entry of entries) {
      if (skipSet.has(entry.name)) continue
      const src = join(planEntry.sourceDir, entry.name)
      const dest = join(sideOutDir, entry.name)
      try {
        cpSync(src, dest, { recursive: entry.isDirectory() })
        log(`   ${planEntry.side}/${entry.name} → ${dest}`)
      } catch (e) {
        warn(`⚠️  Failed to copy ${planEntry.side}/${entry.name}: ${e instanceof Error ? e.message : e}`)
      }
    }
  }

  log(`✅ Archive complete → ${outDir}`)
}

// ── Entry point ────────────────────────────────────────────────────────────
if (import.meta.main) {
  main().catch(err => {
    if (err instanceof ZodError) {
      console.error('❌ Schema validation failed:')
      for (const issue of err.issues) {
        console.error(`   - ${issue.path.join('.')}: ${issue.message}`)
      }
    } else {
      console.error('❌', err instanceof Error ? err.message : err)
    }
    process.exit(1)
  })
}
