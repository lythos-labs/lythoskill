/**
 * Unified URL fetch for shareable config files (deck.toml, arena.toml, player.toml).
 *
 * Extracted from deck and arena CLI inline fetch logic to avoid duplication.
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

export interface FetchConfigOptions {
  /** Cache directory. Default: ~/.agents/config-cache */
  cacheDir?: string
  /** Request timeout in ms. Default: 30000 */
  timeout?: number
}

function expandHome(p: string): string {
  if (p.startsWith('~/')) return join(homedir(), p.slice(2))
  return p
}

function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 16)
}

function normalizeGitHubUrl(url: string): string {
  // Convert github.com/.../blob/... to raw.githubusercontent.com
  try {
    const u = new URL(url)
    if (u.hostname === 'github.com' && u.pathname.includes('/blob/')) {
      return `https://raw.githubusercontent.com${u.pathname.replace('/blob/', '/')}`
    }
  } catch {}
  return url
}

/**
 * Fetch a config file from URL and return local cached path.
 * Cache hit → return cached file. Cache miss → download, save, return path.
 */
export async function fetchConfigFromUrl(
  url: string,
  options: FetchConfigOptions = {},
): Promise<string> {
  const cacheDir = expandHome(options.cacheDir ?? '~/.agents/config-cache')
  const timeout = options.timeout ?? 30_000
  const normalizedUrl = normalizeGitHubUrl(url)
  const cacheKey = hashUrl(normalizedUrl)
  const cachedPath = join(cacheDir, `${cacheKey}.toml`)
  const metaPath = join(cacheDir, `${cacheKey}.meta.json`)

  // Cache hit check
  if (existsSync(cachedPath) && existsSync(metaPath)) {
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
      const now = Date.now()
      const ttl = 24 * 60 * 60 * 1000 // 24h
      if (now - meta.fetchedAt < ttl) {
        return cachedPath
      }
      // Expired — fall through to re-fetch
    } catch {
      // Corrupt meta — fall through to re-fetch
    }
  }

  // Fetch
  const res = await fetch(normalizedUrl, { signal: AbortSignal.timeout(timeout) })
  if (!res.ok) {
    throw new Error(`Failed to fetch config (HTTP ${res.status}): ${normalizedUrl}`)
  }

  const text = await res.text()

  // Save cache
  mkdirSync(cacheDir, { recursive: true })
  writeFileSync(cachedPath, text)
  writeFileSync(metaPath, JSON.stringify({ url: normalizedUrl, fetchedAt: Date.now() }, null, 2))

  return cachedPath
}

/**
 * Resolve a config path: local path → direct return; URL → fetch → return cache path.
 */
export async function resolveConfigPath(
  input: string,
  options?: FetchConfigOptions,
): Promise<string> {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return fetchConfigFromUrl(input, options)
  }
  return resolve(input)
}
