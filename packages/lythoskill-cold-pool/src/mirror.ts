/**
 * Mirror URL rewriting for restricted networks.
 *
 * Two layers only — the tool never decides which third party to trust:
 *   1. LYTHOS_GH_MIRROR env var (explicit user choice, user bears trust)
 *   2. LYTHOS_SOCKS_PROXY / HTTPS_PROXY / HTTP_PROXY (standard, user's own infra)
 *
 * Backward compat: LYTHOSKILL_GH_MIRROR (legacy name) is still read with a
 * deprecation warning. Prefer LYTHOS_GH_MIRROR for consistency with the LYTHOS_
 *
 * No hard-coded mirror list. Auto-fallback to "known" third-party mirrors was
 * removed: the tool must not silently delegate trust to an external service
 * that can return tampered skill files (see ADR-202605130...).
 */

import { execFileSync } from 'node:child_process'
import { socksProxyArgs } from './git-io.js'

export function getMirror(): string | undefined {
  let v = process.env.LYTHOS_GH_MIRROR?.trim()
  if (!v) {
    const legacy = process.env.LYTHOSKILL_GH_MIRROR?.trim()
    if (legacy) {
      console.warn('⚠️  LYTHOSKILL_GH_MIRROR is deprecated. Use LYTHOS_GH_MIRROR instead.')
      v = legacy
    }
  }
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
  /**
   * Evidence tier. 'git-verified' = `git ls-remote` succeeded — the exact
   * handshake a clone performs, on the same network stack. 'http-signal' =
   * only an HTTP response was observed (fallback tier when git cannot
   * answer); weaker evidence, so callers should treat it as advisory.
   */
  confidence: 'git-verified' | 'http-signal'
  /** Set when the HTTP tier got 401/403 — host reachable, credentials likely required. */
  authRequired?: boolean
}

export interface ProbeFailure {
  url: string
  reason: string
}

export interface ProbeDeps {
  fetch?: typeof globalThis.fetch
  execFileSync?: typeof execFileSync
}

/** Short, single-line reason from an exec/fetch error (stderr first line wins). */
function errReason(err: unknown): string {
  const stderr = (err as { stderr?: { toString: () => string } })?.stderr?.toString().trim()
  if (stderr) return stderr.split('\n')[0]!
  return err instanceof Error ? err.message : String(err)
}

/**
 * Tiered connectivity probe: direct first, user mirror (if set) alongside.
 *
 * Tier 1 — `git ls-remote --heads <url>`: the same first handshake a clone
 * performs, on the same network stack — it inherits the user's git config
 * (http.proxy, url.insteadOf, http.sslVerify, credentials) and gets the same
 * LYTHOS_SOCKS_PROXY `-c` flags that git-io's clone/pull inject. This is the
 * only tier with real predictive power for clone success.
 *
 * Tier 2 (fallback when no ls-remote succeeds — e.g. git binary missing) —
 * HTTP `GET <url>/info/refs?service=git-upload-pack`, the request a clone
 * actually sends first (NOT a bare-URL HEAD, which git smart-HTTP reverse
 * proxies like ghfast.top reject with 403/405). Any HTTP response proves the
 * host is reachable (as opposed to DNS/TLS failure); 401/403 is classified
 * as auth-required, not "blocked". The direct tier keeps the
 * LYTHOS_SOCKS_PROXY curl route — Bun fetch cannot speak socks5://, and
 * git ls-remote already inherits git proxy config, so SOCKS-via-curl is
 * only an HTTP-tier concern.
 *
 * Returns the first success with per-URL failures recorded, or undefined
 * only when BOTH tiers fail on ALL URLs.
 */
export async function probeConnectivity(
  url: string,
  timeoutMs = 3000,
  deps?: ProbeDeps,
): Promise<ProbeResult & { failures?: ProbeFailure[] } | undefined> {
  const failures: ProbeFailure[] = []
  const _fetch = deps?.fetch ?? globalThis.fetch
  const _exec = deps?.execFileSync ?? execFileSync
  const targets: Array<{ targetUrl: string; pathLabel: 'direct' | 'mirror' }> = [
    { targetUrl: url, pathLabel: 'direct' },
    ...mirrorUrls(url).map((m) => ({ targetUrl: m, pathLabel: 'mirror' as const })),
  ]

  // ── Tier 1: git ls-remote (ground truth) ───────────────────────────
  // execFileSync is synchronous, so tier-1 probes run sequentially — the
  // per-probe timeout bounds each attempt.
  for (const { targetUrl, pathLabel } of targets) {
    const t0 = performance.now()
    try {
      _exec('git', [...socksProxyArgs(), 'ls-remote', '--heads', targetUrl], {
        encoding: 'utf-8',
        timeout: timeoutMs,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      return {
        path: pathLabel,
        url: targetUrl,
        latencyMs: Math.round(performance.now() - t0),
        confidence: 'git-verified',
        failures,
      }
    } catch (err) {
      failures.push({ url: targetUrl, reason: errReason(err) })
    }
  }

  // ── Tier 2: HTTP signal (degraded path when git cannot answer) ─────
  async function tryHttp(
    targetUrl: string,
    pathLabel: 'direct' | 'mirror',
  ): Promise<ProbeResult | undefined> {
    const t0 = performance.now()
    const probeUrl = `${targetUrl.replace(/\/+$/, '')}/info/refs?service=git-upload-pack`
    try {
      // Route direct probes through SOCKS proxy when configured
      if (pathLabel === 'direct') {
        const socksProxy = process.env.LYTHOS_SOCKS_PROXY?.trim()
        if (socksProxy) {
          const proxyUrl = socksProxy.startsWith('socks5://') ? socksProxy : `socks5://${socksProxy}`
          const out = _exec(
            'curl',
            [
              '--silent',
              '--location',
              '--proxy',
              proxyUrl,
              '--connect-timeout',
              String(Math.ceil(timeoutMs / 1000)),
              '--max-time',
              String(Math.ceil(timeoutMs / 1000)),
              '--output',
              '/dev/null',
              '--write-out',
              '%{http_code}',
              probeUrl,
            ],
            { encoding: 'utf-8', timeout: timeoutMs + 500 },
          )
          const code = Number(String(out).trim())
          return {
            path: pathLabel,
            url: targetUrl,
            latencyMs: Math.round(performance.now() - t0),
            confidence: 'http-signal',
            authRequired: code === 401 || code === 403 || undefined,
          }
        }
      }

      const res = await _fetch(probeUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
      })
      // Any HTTP response means the host is reachable — even a 4xx/5xx
      // (a 4xx only says this URL/method is not accepted, unlike a
      // DNS/TLS failure which means the host cannot be reached at all).
      return {
        path: pathLabel,
        url: targetUrl,
        latencyMs: Math.round(performance.now() - t0),
        confidence: 'http-signal',
        authRequired: res.status === 401 || res.status === 403 || undefined,
      }
    } catch (err) {
      failures.push({ url: targetUrl, reason: errReason(err) })
    }
    return undefined
  }

  // Race direct + mirrors concurrently; first success wins
  const probes = targets.map((t) => tryHttp(t.targetUrl, t.pathLabel))

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
