/**
 * Fetch interceptor with automatic SOCKS proxy fallback.
 *
 * Drop-in replacement for global fetch: same signature, transparent routing.
 * When LYTHOS_SOCKS_PROXY is set, delegates to curl (Bun fetch does not
 * support socks5://). Otherwise passes through to native fetch.
 *
 * Composable: only handles proxy switching. Callers keep mirror fallback,
 * retry logic, caching, etc. in their own layer.
 */
import { execFileSync } from 'node:child_process'

export interface FetchInterceptDeps {
  fetch?: typeof globalThis.fetch
  execFileSync?: typeof import('node:child_process').execFileSync
  envProxy?: string
}

/**
 * Fetch with automatic SOCKS proxy fallback.
 * Signature matches global fetch for transparent substitution.
 */
export async function fetchWithProxy(
  input: string | Request | URL,
  init?: RequestInit,
  deps?: FetchInterceptDeps,
): Promise<Response> {
  const _fetch = deps?.fetch ?? globalThis.fetch
  const proxy = deps?.envProxy ?? process.env.LYTHOS_SOCKS_PROXY?.trim()

  if (!proxy) {
    return _fetch(input, init)
  }

  const url = typeof input === 'string' ? input : input.toString()
  const proxyUrl = proxy.startsWith('socks5://') ? proxy : `socks5://${proxy}`

  const _exec = deps?.execFileSync ?? execFileSync
  const out = _exec(
    'curl',
    [
      '--silent',
      '--show-error',
      '--location',
      '--proxy',
      proxyUrl,
      '--connect-timeout',
      '30',
      '--max-time',
      '30',
      url,
    ],
    { encoding: 'utf-8', timeout: 35_000 },
  )

  return new Response(out, { status: 200 })
}
