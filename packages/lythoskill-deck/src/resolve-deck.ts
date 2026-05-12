/**
 * resolveDeckPath — shared deck URL/path resolution.
 *
 * Per ADR-20260508075301691: --deck accepts http/https URL.
 * Extracted from link.ts so all commands (validate, add, refresh, etc.)
 * inherit URL support without duplicating fetch logic.
 *
 * T1 of EPIC-20260508082810062 (Everything-from-URL).
 */

import { existsSync as _existsSync, writeFileSync as _writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync as _execFileSync } from 'node:child_process'
import { findDeckToml } from './link.js'
import { mirrorUrls } from '../../lythoskill-cold-pool/src/mirror.js'

export interface FetchDeckIO {
  fetch?: typeof globalThis.fetch
  execFileSync?: typeof _execFileSync
  existsSync?: typeof _existsSync
  writeFileSync?: typeof _writeFileSync
}

/** Fetch via curl when SOCKS proxy is set (Bun fetch does not support socks5://).
 * Uses long-form flags for maximum portability across curl versions.
 */
function curlFetch(url: string, exec: typeof _execFileSync, timeoutSec = 30): string {
  const proxy = process.env.LYTHOS_SOCKS_PROXY?.trim()
  const proxyUrl = proxy?.startsWith('socks5://') ? proxy : `socks5://${proxy}`
  const args = [
    '--silent',
    '--show-error',
    '--location',
    '--request', 'GET',
    '--connect-timeout', String(timeoutSec),
    '--max-time', String(timeoutSec),
    ...(proxy ? ['--proxy', proxyUrl] : []),
    url,
  ]
  return exec('curl', args, { encoding: 'utf-8' })
}

export interface ResolvedDeck {
  path: string
  source: 'url' | 'local' | 'default'
}

export function isUrl(s: string): boolean {
  return s.startsWith('http://') || s.startsWith('https://')
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname === 'github.com' && u.pathname.includes('/blob/')) {
      return `https://raw.githubusercontent.com${u.pathname.replace('/blob/', '/')}`
    }
  } catch {}
  return url
}

/** Sync: resolve local path or default. URL case handled separately. */
export function resolveDeckPathSync(cliArg?: string): ResolvedDeck {
  if (cliArg) {
    return { path: resolve(cliArg), source: 'local' }
  }
  const found = findDeckToml(process.cwd()) || resolve('skill-deck.toml')
  return { path: found, source: 'default' }
}

/** Async: fetch URL deck, save to cwd, return local path. */
export async function fetchDeckUrl(url: string, io?: FetchDeckIO): Promise<string> {
  const fetchFn = io?.fetch ?? fetch
  const execFn = io?.execFileSync ?? _execFileSync
  const existsFn = io?.existsSync ?? _existsSync
  const writeFn = io?.writeFileSync ?? _writeFileSync

  const normalized = normalizeUrl(url)
  const dest = resolve(process.cwd(), 'skill-deck.toml')
  if (existsFn(dest)) {
    throw new Error(
      `Refusing to overwrite existing ${dest}.\n` +
      `  A skill-deck.toml already exists in this directory.\n` +
      `  To use a remote deck, run from an empty directory or specify a different --deck path.\n` +
      `  To keep your existing deck, use a local file: deck link --deck ./skill-deck.toml`
    )
  }
  console.log(`📥 Fetching deck: ${normalized}`)

  // When SOCKS proxy is set, use curl (Bun fetch does not support socks5://)
  if (process.env.LYTHOS_SOCKS_PROXY?.trim()) {
    try {
      const body = curlFetch(normalized, execFn, 30)
      writeFn(dest, body)
      console.log(`   → saved to ${dest} (via SOCKS proxy)`)
      return dest
    } catch (err: unknown) {
      const e = err as { stderr?: Buffer; message?: string }
      throw new Error(`Failed to fetch deck via SOCKS proxy: ${normalized}\n  ${e.stderr?.toString() || e.message || ''}`)
    }
  }

  let res: Response | undefined
  // Try direct, then mirrors
  try { res = await fetchFn(normalized, { signal: AbortSignal.timeout(30_000) }); if (!res?.ok) res = undefined } catch {}
  if (!res) {
    for (const mirrorUrl of mirrorUrls(normalized)) {
      try {
        console.log(`   ↳ trying mirror: ${mirrorUrl}`)
        const r = await fetchFn(mirrorUrl, { signal: AbortSignal.timeout(30_000) })
        if (r.ok) { res = r; break }
      } catch {}
    }
  }
  if (!res) {
    throw new Error(`Failed to fetch deck: ${normalized}\n   All mirrors exhausted. Set LYTHOSKILL_GH_MIRROR to use a custom mirror, or LYTHOS_SOCKS_PROXY for SOCKS5.`)
  }
  writeFn(dest, await res.text())
  console.log(`   → saved to ${dest}`)
  return dest
}
