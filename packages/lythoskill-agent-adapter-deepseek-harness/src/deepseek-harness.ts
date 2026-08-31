/**
 * DeepSeek Harness (dsh) adapter — spawns the official `headless` profile.
 *
 * Contract (machine-checked against the official CLI behavior reference,
 * apps/cli/reference/README.md in deepseek-ai/deepseek-harness):
 *   dsh --profile headless "<task>"
 * - one fresh persisted Agent, task as the positional argument
 * - final assistant text on stdout, reasoning deltas on stderr
 * - exit 0 on `completed`, else 1
 * - no HTTP server, no listening port; invoking directory = workspace root
 *   (default `workspace-write` permission preset — arena temp cells fit exactly)
 *
 * Known gaps (survey 2026-08-29-deepseek-harness-integration-survey):
 * - checkpoints[] is always empty — headless exposes only reasoning deltas +
 *   final text (the durable JSONL session could be parsed post-hoc if needed).
 * - modelTier is not a CLI flag in headless mode — model selection lives in
 *   profile config layers, so the option is accepted and ignored.
 *
 * Version policy (ADR-20260828004129233 Option B): dsh is 0.1.0-rc.x with
 * officially announced compatibility-breaking changes, so the declared range
 * is pinned to the 0.1.x line and probes fail closed on anything else.
 */

import type { AgentAdapter, AgentRunResult } from '@lythos/agent-adapter'
import { registerAgent, satisfiesVersionRange } from '@lythos/agent-adapter'

// ── Pure functions (testable without CLI) ────────────────────────────────────

/** Pinned to the 0.1.x rc line — upstream announces breaking changes (see header). */
export const DSH_VERSION_RANGE = '>=0.1.0 <1.0.0'

/**
 * Build the dsh headless command (no shell wrapper — injection-safe).
 * The task text is the sole positional argument of the headless profile.
 */
export function buildDshCommand(brief: string, binary = 'dsh'): string[] {
  if (!binary) {
    throw new Error('No dsh binary found in PATH. Install: npm i -g @deepseek-ai/dsh (requires Node >= 22.19)')
  }
  if (!brief || !brief.trim()) {
    throw new Error('dsh headless requires a non-empty task as the positional argument')
  }
  return [binary, '--profile', 'headless', brief]
}

/** Parse the first semver triple from `dsh --version` output (rc suffixes like `-rc.7` are stripped). */
export function parseDshVersion(output: string): string | null {
  const m = output.match(/(\d+)\.(\d+)\.(\d+)/)
  return m ? m[0] : null
}

// ── Probe (IO, injectable for tests) ─────────────────────────────────────────

export type ProbeRunner = (cmd: string[]) => { stdout: string; stderr: string; exitCode: number }

const defaultProbeRunner: ProbeRunner = (cmd) => {
  const probe = Bun.spawnSync(cmd)
  return {
    stdout: probe.stdout.toString(),
    stderr: probe.stderr.toString(),
    exitCode: probe.exitCode ?? 1,
  }
}

/**
 * Probe `<binary> <probeArgs>` and enforce the declared version range. Fail closed:
 * unknown or out-of-range upstreams get a loud HATEOAS error, never a silent spawn.
 * Returns the detected version on success.
 */
export function probeDshUpstream(
  binary: string,
  probeArgs: string[],
  versionRange: string,
  run: ProbeRunner = defaultProbeRunner,
): string {
  const result = run([binary, ...probeArgs])
  const output = `${result.stdout}\n${result.stderr}`.trim()
  const version = parseDshVersion(output)
  if (result.exitCode !== 0 || !version || !satisfiesVersionRange(version, versionRange)) {
    throw new Error([
      `dsh upstream probe failed: "${binary} ${probeArgs.join(' ')}" returned "${output.slice(0, 120) || '(no output)'}" (exit ${result.exitCode})`,
      `Detected: ${version ? `version ${version}` : 'unparseable version output'}`,
      `Supported: deepseek-harness 0.1.x (developer preview) — declared range: ${versionRange}`,
      `Fix: install/upgrade dsh (https://github.com/deepseek-ai/deepseek-harness), or pick another --player.`,
    ].join('\n   '))
  }
  return version
}

// ── Spawn wrapper (IO, tested via BDD / arena integration) ───────────────────

async function spawnDsh(
  opts: {
    brief: string
    cwd: string
    timeoutMs?: number
  },
  declared?: AgentAdapter['upstream'],
): Promise<AgentRunResult> {
  const binary = (declared?.binaries ?? ['dsh']).find((b) => Bun.which(b)) ?? ''
  if (!binary) {
    throw new Error(
      'dsh not found in PATH. Install: npm i -g @deepseek-ai/dsh (requires Node >= 22.19, DEEPSEEK_API_KEY) — https://github.com/deepseek-ai/deepseek-harness',
    )
  }
  // Contract semantics: adapters without an `upstream` declaration stay unprobed (legacy behavior).
  const version = declared ? probeDshUpstream(binary, declared.probeArgs, declared.versionRange) : null
  if (version) console.error(`ℹ️  dsh upstream: deepseek-harness ${version}`)

  const start = Date.now()

  const proc = Bun.spawn(buildDshCommand(opts.brief, binary), {
    cwd: opts.cwd,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const timeout = setTimeout(() => proc.kill(), opts.timeoutMs ?? 120_000)
  await proc.exited
  clearTimeout(timeout)

  const durationMs = Date.now() - start
  const stdout = (await new Response(proc.stdout).text()).trim()
  const stderr = await new Response(proc.stderr).text()
  const code = proc.exitCode ?? 1

  // Fail loud on a suspicious success: exit 0 but no final text means the
  // upstream is not speaking the documented headless contract.
  if (code === 0 && !stdout) {
    throw new Error([
      `dsh exited 0 but produced no output at all.`,
      `Likely cause: protocol mismatch with the installed dsh upstream (headless contract changed?).`,
      `Fix: upgrade dsh (https://github.com/deepseek-ai/deepseek-harness), or pick another --player.`,
    ].join('\n   '))
  }

  // exit 1 is a legitimate signal ("turn did not complete") per the headless
  // contract — pass it through in `code` instead of throwing.
  return { stdout, stderr, code, durationMs, checkpoints: [] }
}

const deepseekHarnessAdapter: AgentAdapter = {
  name: 'deepseek-harness',

  upstream: {
    binaries: ['dsh'],
    versionRange: DSH_VERSION_RANGE,
    probeArgs: ['--version'],
  },

  async spawn(opts): Promise<AgentRunResult> {
    return spawnDsh(opts, deepseekHarnessAdapter.upstream)
  },

  async invokeTool(_opts): Promise<unknown> {
    throw new Error('invokeTool not implemented for deepseek-harness adapter')
  },
}

registerAgent('deepseek-harness', deepseekHarnessAdapter)
export { deepseekHarnessAdapter }
