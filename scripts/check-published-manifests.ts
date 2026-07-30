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
    return execFileSync('npm', ['view', spec, 'dependencies'], { encoding: 'utf-8', timeout: 30000 })
  }
}

/** Run the guard. Returns leaked package names (empty = clean). */
export async function checkPublishedManifests(opts?: {
  version?: string
  publishShPath?: string
  io?: GuardIO
}): Promise<{ checked: string[]; leaked: Map<string, string[]> }> {
  const publishShPath = opts?.publishShPath ?? resolve(ROOT, 'scripts/publish.sh')
  const io = { view: opts?.io?.view ?? productionView(), log: opts?.io?.log ?? console.log }
  const dirs = parsePublishList(readFileSync(publishShPath, 'utf-8'))

  const checked: string[] = []
  const leaked = new Map<string, string[]>()
  for (const dir of dirs) {
    const pkgJson = JSON.parse(readFileSync(resolve(ROOT, dir, 'package.json'), 'utf-8'))
    const name: string = pkgJson.name
    checked.push(name)
    let out: string
    try {
      out = io.view(name, opts?.version)
    } catch (e: any) {
      // Package/version not on npm (never published) — not a leak, but say so.
      io.log(`   ⚠️  ${name}${opts?.version ? `@${opts.version}` : ''}: npm view failed (${e?.message?.split('\n')[0] ?? e}) — skipped`)
      continue
    }
    const leaks = findWorkspaceLeaks(out)
    if (leaks.length > 0) leaked.set(name, leaks)
  }
  return { checked, leaked }
}

if (import.meta.main) {
  const version = process.argv[2]
  const { checked, leaked } = await checkPublishedManifests({ version })
  const tag = version ?? 'latest'
  if (leaked.size === 0) {
    console.log(`✅ ${checked.length} published package(s) @${tag}: no workspace: specifiers in manifests`)
    process.exit(0)
  }
  console.error(`❌ workspace: leak in ${leaked.size} published package(s) @${tag}:`)
  for (const [name, lines] of leaked) {
    console.error(`   ${name}:`)
    for (const l of lines) console.error(`      ${l}`)
  }
  console.error(`   External consumers (bunx / npm install) cannot resolve these. Republish with rewritten manifests (scripts/publish.sh).`)
  process.exit(1)
}
