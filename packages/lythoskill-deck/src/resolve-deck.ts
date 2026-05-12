/**
 * resolveDeckPath — shared deck URL/path resolution.
 *
 * Per ADR-20260508075301691: --deck accepts http/https URL.
 * Extracted from link.ts so all commands (validate, add, refresh, etc.)
 * inherit URL support without duplicating fetch logic.
 *
 * T1 of EPIC-20260508082810062 (Everything-from-URL).
 */

import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { findDeckToml } from './link.js'
import { mirrorUrls } from '../../lythoskill-cold-pool/src/mirror.js'

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
export async function fetchDeckUrl(url: string): Promise<string> {
  const normalized = normalizeUrl(url)
  const dest = resolve(process.cwd(), 'skill-deck.toml')
  if (existsSync(dest)) {
    throw new Error(
      `Refusing to overwrite existing ${dest}.\n` +
      `  A skill-deck.toml already exists in this directory.\n` +
      `  To use a remote deck, run from an empty directory or specify a different --deck path.\n` +
      `  To keep your existing deck, use a local file: deck link --deck ./skill-deck.toml`
    )
  }
  console.log(`📥 Fetching deck: ${normalized}`)
  let res: Response | undefined
  // Try direct, then mirrors
  try { res = await fetch(normalized, { signal: AbortSignal.timeout(30_000) }); if (!res.ok) res = undefined } catch {}
  if (!res) {
    for (const mirrorUrl of mirrorUrls(normalized)) {
      try {
        console.log(`   ↳ trying mirror: ${mirrorUrl}`)
        const r = await fetch(mirrorUrl, { signal: AbortSignal.timeout(30_000) })
        if (r.ok) { res = r; break }
      } catch {}
    }
  }
  if (!res) {
    throw new Error(`Failed to fetch deck: ${normalized}\n   All mirrors exhausted. Set LYTHOSKILL_GH_MIRROR to use a custom mirror.`)
  }
  writeFileSync(dest, await res.text())
  console.log(`   → saved to ${dest}`)
  return dest
}
