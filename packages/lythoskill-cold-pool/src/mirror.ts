/**
 * Mirror URL rewriting for restricted networks.
 *
 * Three layers, checked in order:
 *   1. LYTHOS_MIRROR env var (explicit user choice)
 *   2. HTTPS_PROXY / HTTP_PROXY (standard — Bun fetch and git respect these natively)
 *   3. Known public mirrors (auto-fallback when GitHub is unreachable)
 *
 * Per ADR-20260512191438745.
 */

// ── Known public mirrors (tried in order when GitHub is unreachable) ──

const KNOWN_MIRRORS = [
  'https://ghfast.top',            // commonly used in CN
  'https://ghproxy.com',           // commonly used in CN
  'https://mirror.ghproxy.com',    // ghproxy alternative domain
]

// ── Explicit user mirror ──────────────────────────────────────────────

export function getMirror(): string | undefined {
  const v = process.env.LYTHOS_MIRROR?.trim()
  if (!v) return undefined
  if (v.startsWith('http://') || v.startsWith('https://')) {
    return v.replace(/\/+$/, '')
  }
  return `https://${v.replace(/\/+$/, '')}`
}

// ── URL rewriting ─────────────────────────────────────────────────────

export function rewriteUrl(url: string, mirror?: string): string {
  if (!mirror) return url
  return `${mirror}/${url}`
}

export function mirrorUrls(url: string): string[] {
  const mirrors = [...KNOWN_MIRRORS]
  const explicit = getMirror()
  if (explicit) mirrors.unshift(explicit)
  return mirrors.map(m => rewriteUrl(url, m))
}

export function isLikelyGitHubBlock(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /fetch.*failed|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|network.*unreachable/i.test(msg)
}
