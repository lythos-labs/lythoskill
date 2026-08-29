#!/usr/bin/env bun
/**
 * check-published-manifests.ts — published-manifest regression guard
 *
 * Bug class (3 incidents: 0.11.0, 0.15.7, 0.17.2): a publish ships with
 * `workspace:*` specifiers unrewritten in the manifest — every external
 * `bunx` / `npm install` consumer breaks. publish.sh rewrites at publish
 * time, but the 0.17.2 leak proved the publish can bypass the script.
 * This guard is the independent tripwire: it asks NPM (not the local
 * machine) what the published manifests contain, and fails loudly on any
 * `workspace:` specifier.
 *
 * The package list is parsed from scripts/publish.sh's PACKAGES array
 * (SSOT for what gets published). IO is injectable for tests
 * (Intent/Plan/Execute) — the check is a pure function over the
 * `npm view` output text.
 *
 * Usage:
 *   bun scripts/check-published-manifests.ts              # check @latest
 *   bun scripts/check-published-manifests.ts 0.17.2       # check a pinned version
 *
 * Exit 0 = all clean. Exit 1 = at least one leaked manifest (listed).
 */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Parse the PACKAGES array from publish.sh → package dir names (SSOT). */
export function parsePublishList(publishShText: string): string[] {
  const m = publishShText.match(/PACKAGES=\(([\s\S]*?)\)/)
  if (!m) throw new Error('PACKAGES array not found in publish.sh')
  return [...m[1].matchAll(/"(packages\/[^"]+)"/g)].map((g) => g[1])
}

/** Pure check: does an `npm view <pkg> dependencies` output contain a
 *  workspace: specifier? Returns the offending lines. */
export function findWorkspaceLeaks(npmViewOutput: string): string[] {
  return npmViewOutput
    .split('\n')
    .filter((l) => l.includes('workspace:'))
    .map((l) => l.trim())
}

export interface GuardIO {
  view?: (pkgName: string, version?: string) => string
  log?: (msg: string) => void
}

export function productionView(): (pkgName: string, version?: string) => string {
  return (pkgName, version) => {
    const spec = version ? `${pkgName}@${version}` : `${pkgName}@latest`
    // Consumer-visible sections only (matches the rewriter's scope):
    // deps/optional/peer are what bunx/npm install resolves. devDeps of a
    // published package are never installed by consumers.
    //
    // Retry with backoff: npm view can 404 for tens of seconds after a fresh
    // publish because registry replicas need time to converge (2026-08-29
    // incident: 5×(1-4s) ≈ 10s was not enough; release run 33223763727).
    // Worst case ≈ 5+10+15+20+25+30+35 = 140s. Fail-closed still applies —
    // if all retries fail, the caller treats it as unverifiable.
    const maxAttempts = 8
    const baseDelayMs = 5000
    let lastError: unknown
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return execFileSync(
          'npm',
          ['view', spec, 'dependencies', 'optionalDependencies', 'peerDependencies'],
          { encoding: 'utf-8', timeout: 30000 },
        )
      } catch (e) {
        lastError = e
        if (attempt < maxAttempts) {
          const delay = baseDelayMs * attempt
          console.log(`   ⏳ ${spec}: npm view attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`)
          Bun.sleepSync(delay)
        }
      }
    }
    throw lastError
  }
}

/** Run the guard. Returns checked names, leaks, and unverifiable (skipped) names. */
export async function checkPublishedManifests(opts?: {
  version?: string
  publishShPath?: string
  io?: GuardIO
}): Promise<{ checked: string[]; leaked: Map<string, string[]>; skipped: string[] }> {
  const publishShPath = opts?.publishShPath ?? resolve(ROOT, 'scripts/publish.sh')
  const io = { view: opts?.io?.view ?? productionView(), log: opts?.io?.log ?? console.log }
  const dirs = parsePublishList(readFileSync(publishShPath, 'utf-8'))

  const checked: string[] = []
  const skipped: string[] = []
  const leaked = new Map<string, string[]>()
  for (const dir of dirs) {
    const pkgJson = JSON.parse(readFileSync(resolve(ROOT, dir, 'package.json'), 'utf-8'))
    const name: string = pkgJson.name
    checked.push(name)
    let out: string
    try {
      out = io.view(name, opts?.version)
    } catch (e: any) {
      // Unverifiable — NOT clean. Tracked so the caller can fail closed.
      skipped.push(name)
      io.log(`   ⚠️  ${name}${opts?.version ? `@${opts.version}` : ''}: npm view failed (${e?.message?.split('\n')[0] ?? e}) — unverifiable`)
      continue
    }
    const leaks = findWorkspaceLeaks(out)
    if (leaks.length > 0) leaked.set(name, leaks)
  }
  return { checked, leaked, skipped }
}

/** Fail-closed decision: only a fully-checked, leak-free run passes. */
export function guardPasses(leaked: Map<string, string[]>, skipped: string[]): boolean {
  return leaked.size === 0 && skipped.length === 0
}

if (import.meta.main) {
  const version = process.argv[2]
  const { checked, leaked, skipped } = await checkPublishedManifests({ version })
  const tag = version ?? 'latest'
  if (leaked.size === 0 && skipped.length === 0) {
    console.log(`✅ ${checked.length} published package(s) @${tag}: no workspace: specifiers in manifests`)
    process.exit(0)
  }
  if (leaked.size > 0) {
    console.error(`❌ workspace: leak in ${leaked.size} published package(s) @${tag}:`)
    for (const [name, lines] of leaked) {
      console.error(`   ${name}:`)
      for (const l of lines) console.error(`      ${l}`)
    }
    console.error(`   External consumers (bunx / npm install) cannot resolve these. Republish with rewritten manifests (scripts/publish.sh).`)
  }
  if (skipped.length > 0) {
    console.error(`❌ ${skipped.length} package(s) could not be verified (npm error / not published): ${skipped.join(', ')}`)
    console.error(`   The guard fails CLOSED — an unverifiable manifest is not a clean manifest.`)
  }
  process.exit(1)
}
