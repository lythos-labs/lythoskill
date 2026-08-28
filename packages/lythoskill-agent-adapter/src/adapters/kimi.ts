import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import type { AgentAdapter, AgentRunResult, CheckpointEntry } from '../types'
import { readCheckpoints } from '../checkpoint'
import { registerAgent } from '../registry'

// ── Pure functions (testable without CLI) ────────────────────────────────────

/** kimi-cli = legacy Python CLI (v1.x, binary `kimi-cli`); kimi-code = TS CLI (v0.x, binary `kimi`). */
export type KimiUpstream = 'kimi-cli' | 'kimi-code'

/** Supported range across both upstreams (ADR-20260828004129233 Option B). */
export const KIMI_VERSION_RANGE = '>=0.30.0 <2.0.0'

/** Detect which kimi binary to use. Prefers kimi-cli (legacy, v1.x) over kimi (kimi-code, v0.x). */
export function detectKimiBinary(): string {
  if (Bun.which('kimi-cli')) {
    return 'kimi-cli'
  }
  if (Bun.which('kimi')) {
    return 'kimi'
  }
  return ''
}

/**
 * Parse the first semver triple from `<binary> --version` output.
 * Both upstreams self-report as "kimi" — kimi-code prints "0.38.0",
 * kimi-cli prints "kimi, version 1.45.0" — so discriminate on the
 * version, never on the product name.
 */
export function parseKimiVersion(output: string): { version: string; major: number } | null {
  const m = output.match(/(\d+)\.(\d+)\.(\d+)/)
  if (!m) return null
  return { version: m[0], major: parseInt(m[1], 10) }
}

/** major 0 = kimi-code, major 1 = kimi-cli, anything else = unknown (fail closed). */
export function classifyKimiUpstream(major: number): KimiUpstream | null {
  if (major === 0) return 'kimi-code'
  if (major === 1) return 'kimi-cli'
  return null
}

/** Minimal semver-triple check against space-separated comparators (>=, >, <=, <). No semver dep. */
export function satisfiesVersionRange(version: string, range: string): boolean {
  const v = version.split('.').map(n => parseInt(n, 10))
  for (const cmp of range.trim().split(/\s+/)) {
    const m = cmp.match(/^(>=|<=|>|<)(\d+\.\d+\.\d+)$/)
    if (!m) return false
    const t = m[2].split('.').map(n => parseInt(n, 10))
    let d = 0
    for (let i = 0; i < 3; i++) {
      d = (v[i] ?? 0) - (t[i] ?? 0)
      if (d !== 0) break
    }
    if (m[1] === '>=' && d < 0) return false
    if (m[1] === '>' && d <= 0) return false
    if (m[1] === '<=' && d > 0) return false
    if (m[1] === '<' && d >= 0) return false
  }
  return true
}

/**
 * Build kimi CLI command args (no shell wrapper — safe from injection).
 * kimi-cli speaks `--print` (prompt on stdin). kimi-code speaks `--prompt <prompt>`
 * (its `--output-format` only works in prompt mode; `--print` never existed and
 * exits 1 with "unknown option").
 */
export function buildKimiCommand(
  _modelTier?: 'fast' | 'balanced' | 'deep',
  binary = detectKimiBinary(),
  upstream: KimiUpstream = 'kimi-cli',
  prompt?: string,
): string[] {
  if (!binary) {
    throw new Error('No kimi binary found in PATH. Install: https://github.com/MoonshotAI/kimi-cli')
  }
  if (upstream === 'kimi-code') {
    if (!prompt) {
      throw new Error('kimi-code requires the prompt as a --prompt argument (no stdin prompt mode)')
    }
    return [binary, '--prompt', prompt, '--output-format', 'stream-json']
  }
  return [binary, '--print', '--output-format', 'stream-json']
}

/**
 * Parse kimi stream-json output into plain text + checkpoint trace.
 * Each line is a JSON event; extracts text from assistant role messages
 * and tool_calls/tool messages into CheckpointEntry for white-box replay.
 * `events` counts successfully parsed JSON lines — zero events on non-empty
 * stdout means the upstream is speaking a different protocol.
 */
export function parseKimiStreamJson(raw: string): { text: string; checkpoints: CheckpointEntry[]; events: number } {
  const textLines: string[] = []
  const checkpoints: CheckpointEntry[] = []
  const pendingTools = new Map<string, { name: string; args: string }>()
  let events = 0

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    try {
      const event = JSON.parse(line)
      events++
      if (event.role === 'assistant') {
        const content = event.content
        if (typeof content === 'string') {
          textLines.push(content)
        } else if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text' && block.text) textLines.push(block.text)
          }
        }

        if (Array.isArray(event.tool_calls)) {
          for (const tc of event.tool_calls) {
            if (tc.type === 'function' && tc.function) {
              checkpoints.push({
                step: 'tool_call',
                tool: tc.function.name,
                args: [tc.function.arguments],
                timestamp: new Date().toISOString(),
              })
              pendingTools.set(tc.id, { name: tc.function.name, args: tc.function.arguments })
            }
          }
        }
      } else if (event.role === 'tool' && event.tool_call_id) {
        const pending = pendingTools.get(event.tool_call_id)
        if (pending) {
          checkpoints.push({
            step: 'tool_result',
            tool: pending.name,
            args: [pending.args],
            stdout_summary: String(event.content ?? '').slice(0, 500),
            timestamp: new Date().toISOString(),
          })
          pendingTools.delete(event.tool_call_id)
        }
      }
    } catch { /* skip malformed lines */ }
  }

  return { text: textLines.join('\n'), checkpoints, events }
}

/**
 * Fail-loud check on a finished kimi run. Returns a HATEOAS-style error
 * message, or null when the run produced parseable stream-json output.
 * Replaces the old never-throw passthrough that returned empty stdout as success.
 */
export function detectKimiProtocolMismatch(result: {
  code: number
  rawStdout: string
  stderr: string
  events: number
}): string | null {
  const { code, rawStdout, stderr, events } = result
  if (code !== 0) {
    return [
      `kimi exited with code ${code} and produced no usable stream-json output.`,
      stderr.trim() ? `stderr: ${stderr.trim().slice(0, 200)}` : '',
      `Likely cause: flag/protocol mismatch between this adapter and the installed kimi upstream.`,
      `Fix: upgrade kimi-cli (https://github.com/MoonshotAI/kimi-cli) or kimi-code, or pick another --player.`,
    ].filter(Boolean).join('\n   ')
  }
  if (!rawStdout.trim()) {
    return [
      `kimi exited 0 but produced no output at all.`,
      `Likely cause: protocol mismatch with the installed kimi upstream.`,
      `Fix: upgrade kimi-cli/kimi-code, or pick another --player.`,
    ].join('\n   ')
  }
  if (events === 0) {
    return [
      `kimi exited 0 but stdout had no parseable stream-json events.`,
      `stdout (first 200 chars): ${rawStdout.trim().slice(0, 200)}`,
      `Likely cause: the upstream is speaking a different output protocol.`,
      `Fix: upgrade kimi-cli/kimi-code, or pick another --player.`,
    ].join('\n   ')
  }
  return null
}

// ── Spawn wrapper (IO, tested via BDD / arena integration) ──────────────────

/** Probe `<binary> --version`, classify the upstream, enforce the supported range. Fail closed. */
function probeKimiUpstream(binary: string): { upstream: KimiUpstream; version: string } {
  const probe = Bun.spawnSync([binary, '--version'])
  const output = `${probe.stdout.toString()}\n${probe.stderr.toString()}`.trim()
  const parsed = parseKimiVersion(output)
  const upstream = parsed ? classifyKimiUpstream(parsed.major) : null
  if (!parsed || !upstream || !satisfiesVersionRange(parsed.version, KIMI_VERSION_RANGE)) {
    throw new Error([
      `kimi upstream probe failed: "${binary} --version" returned "${output.slice(0, 120) || '(no output)'}"`,
      `Detected: ${parsed ? `version ${parsed.version}` : 'unparseable version output'}`,
      `Supported: kimi-cli 1.x (legacy), kimi-code ${KIMI_VERSION_RANGE}`,
      `Fix: install/upgrade kimi-cli (https://github.com/MoonshotAI/kimi-cli) or kimi-code, or pick another --player.`,
    ].join('\n   '))
  }
  return { upstream, version: parsed.version }
}

async function spawnKimi(opts: {
  brief: string
  cwd: string
  timeoutMs?: number
}): Promise<AgentRunResult> {
  const binary = detectKimiBinary()
  if (!binary) {
    throw new Error('kimi not found in PATH. Install: https://github.com/MoonshotAI/kimi-cli')
  }
  const { upstream } = probeKimiUpstream(binary)

  // kimi-cli reads the prompt from stdin (temp file); kimi-code takes it as --prompt argv.
  let promptFile: string | null = null
  let cmd: string[]
  if (upstream === 'kimi-code') {
    cmd = buildKimiCommand(undefined, binary, upstream, opts.brief)
  } else {
    promptFile = join(tmpdir(), `kimi-prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`)
    writeFileSync(promptFile, opts.brief, 'utf-8')
    cmd = buildKimiCommand(undefined, binary, upstream)
  }

  const start = Date.now()

  const proc = Bun.spawn(cmd, {
    cwd: opts.cwd,
    stdin: promptFile ? Bun.file(promptFile) : 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const timeout = setTimeout(() => proc.kill(), opts.timeoutMs ?? 60000)
  await proc.exited
  clearTimeout(timeout)

  if (promptFile) {
    try { unlinkSync(promptFile) } catch {}
  }

  const durationMs = Date.now() - start
  const rawStdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const code = proc.exitCode ?? 1

  // parseKimiStreamJson never throws; protocol mismatch is detected explicitly.
  const parsed = parseKimiStreamJson(rawStdout)
  const mismatch = detectKimiProtocolMismatch({ code, rawStdout, stderr, events: parsed.events })
  if (mismatch) {
    throw new Error(mismatch)
  }

  // Preserve raw JSONL for post-hoc white-box analysis
  try {
    writeFileSync(join(opts.cwd, 'agent-stdout-raw.jsonl'), rawStdout, 'utf-8')
  } catch { /* ignore write failures */ }

  const fileCheckpoints = readCheckpoints(opts.cwd)
  const checkpoints = [...parsed.checkpoints, ...fileCheckpoints]

  return { stdout: parsed.text.trim(), stderr, code, durationMs, checkpoints }
}

const kimiAdapter: AgentAdapter = {
  name: 'kimi',

  upstream: {
    binaries: ['kimi-cli', 'kimi'],
    versionRange: KIMI_VERSION_RANGE,
    probeArgs: ['--version'],
  },

  async spawn(opts): Promise<AgentRunResult> {
    return spawnKimi(opts)
  },

  async invokeTool(_opts): Promise<unknown> {
    throw new Error('invokeTool not implemented for kimi adapter')
  },
}

registerAgent('kimi', kimiAdapter)
export { kimiAdapter }
