#!/usr/bin/env bun
/**
 * Inject version metadata for the VitePress site.
 *
 * Reads root package.json version + current Git commit short hash + build date,
 * then writes a small JSON consumed by site/.vitepress/config.ts. This keeps
 * the site footer honest about which npm version / commit it was built from.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'

const SITE_DIR = dirname(dirname(new URL(import.meta.url).pathname))
const ROOT_DIR = join(SITE_DIR, '..')
const OUTPUT_PATH = join(SITE_DIR, '.vitepress', 'version.json')

function main() {
  const rootPkg = JSON.parse(readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8'))
  const version = rootPkg.version as string

  let commit = 'unknown'
  try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
    }).trim()
  } catch {
    // Not a git repo or git unavailable — leave as 'unknown'.
  }

  const date = new Date().toISOString().slice(0, 10)

  const metadata = {
    version,
    commit,
    date,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(metadata, null, 2) + '\n')
  console.log(`📝 Injected site version metadata: v${version} · ${commit} · ${date}`)
}

main()
