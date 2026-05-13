/**
 * Mirror URL rewriting for restricted networks.
 *
 * Two layers only — the tool never decides which third party to trust:
 *   1. LYTHOSKILL_GH_MIRROR env var (explicit user choice, user bears trust)
 *   2. LYTHOS_SOCKS_PROXY / HTTPS_PROXY / HTTP_PROXY (standard, user's own infra)
 *
 * No hard-coded mirror list. Auto-fallback to "known" third-party mirrors was
 * removed: the tool must not silently delegate trust to an external service
 * that can return tampered skill files (see ADR-202605130...).
 */

export function getMirror(): string | undefined {
  const v = process.env.LYTHOSKILL_GH_MIRROR?.trim()
  if (!v) return undefined
  if (v.startsWith('http://') || v.startsWith('https://')) {
    return v.replace(/\/+$/, '')
  }
  return `https://${v.replace(/\/+$/, '')}`
}

export function rewriteUrl(url: string, mirror?: string): string {
  if (!mirror) return url
  return `${mirror}/${url}`
}

export function mirrorUrls(url: string): string[] {
  const explicit = getMirror()
  return explicit ? [rewriteUrl(url, explicit)] : []
}

export function isLikelyGitHubBlock(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /fetch.*failed|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|network.*unreachable/i.test(msg)
}

// ── Connectivity probe ────────────────────────────────────────────────

export interface ProbeResult {
  path: 'direct' | 'mirror'
  url: string
  latencyMs: number
}

export interface ProbeFailure {
  url: string
  reason: string
}

/**
 * Quick connectivity probe: race direct + user mirror (if set) concurrently.
 * Uses short timeout (default 3s) to fail fast instead of waiting for
 * the full git clone / fetch timeout.
 *
 * Returns the first success, or undefined with failures recorded.
 */
export async function probeConnectivity(
  url: string,
  timeoutMs = 3000,
): Promise<ProbeResult & { failures?: ProbeFailure[] } | undefined> {
  const start = performance.now()
  const failures: ProbeFailure[] = []

  async function tryFetch(
    targetUrl: string,
    pathLabel: 'direct' | 'mirror',
  ): Promise<ProbeResult | undefined> {
    const t0 = performance.now()
    try {
      const res = await fetch(targetUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
      })
      if (res.ok || res.status === 404) {
        // 404 means server reachable, resource may not exist
        return { path: pathLabel, url: targetUrl, latencyMs: Math.round(performance.now() - t0) }
      }
      failures.push({ url: targetUrl, reason: `HTTP ${res.status}` })
    } catch (err) {
      failures.push({
        url: targetUrl,
        reason: err instanceof Error ? err.message : String(err),
      })
    }
    return undefined
  }

  // Build all probe promises (direct + mirrors) and race for first success
  const probes = [tryFetch(url, 'direct')]
  for (const mirrorUrl of mirrorUrls(url)) {
    probes.push(tryFetch(mirrorUrl, 'mirror'))
  }

  let result: ProbeResult | undefined
  let pending = probes.length

  await new Promise<void>((resolve) => {
    for (const p of probes) {
      p.then((res) => {
        if (!result && res) {
          result = res
          resolve()
        }
        pending--
        if (pending === 0) resolve()
      })
    }
  })

  if (result) {
    return { ...result, failures }
  }
  return undefined
}
