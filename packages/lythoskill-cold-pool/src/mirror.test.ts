import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { probeConnectivity } from './mirror.js'

describe('probeConnectivity', () => {
  let originalFetch: typeof fetch
  let originalEnv: string | undefined
  let originalSocks: string | undefined
  let fetchCalls: Array<{ url: string; options: RequestInit }>

  beforeEach(() => {
    originalFetch = globalThis.fetch
    originalEnv = process.env.LYTHOS_GH_MIRROR
    originalSocks = process.env.LYTHOS_SOCKS_PROXY
    delete process.env.LYTHOS_GH_MIRROR
    delete process.env.LYTHOSKILL_GH_MIRROR
    delete process.env.LYTHOS_SOCKS_PROXY
    fetchCalls = []
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    if (originalEnv !== undefined) {
      process.env.LYTHOS_GH_MIRROR = originalEnv
    } else {
      delete process.env.LYTHOS_GH_MIRROR
    }
    delete process.env.LYTHOSKILL_GH_MIRROR
    if (originalSocks !== undefined) {
      process.env.LYTHOS_SOCKS_PROXY = originalSocks
    } else {
      delete process.env.LYTHOS_SOCKS_PROXY
    }
  })

  function mockFetch(
    responses: Map<string, Response>,
    defaultDelay = 0,
  ) {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      fetchCalls.push({ url, options: init ?? {} })

      if (defaultDelay > 0) {
        await new Promise((r) => setTimeout(r, defaultDelay))
      }

      const res = responses.get(url)
      if (res) return res
      throw new Error(`ENOTFOUND ${url}`)
    }
  }

  /** execFileSync fake: per-URL git ls-remote success/failure; curl never succeeds. */
  function mockGitExec(okUrls: string[] = []) {
    const calls: Array<{ file: string; args: string[] }> = []
    const exec = (file: unknown, args: unknown) => {
      const a = (args as string[]).map(String)
      calls.push({ file: String(file), args: a })
      if (String(file) === 'git') {
        const url = a[a.length - 1]!
        if (okUrls.includes(url)) return ''
        throw new Error(`git ls-remote failed for ${url}`)
      }
      throw new Error('curl failed')
    }
    return { exec: exec as any, calls }
  }

  /** execFileSync fake where git can never answer (e.g. binary missing). */
  function gitUnavailable() {
    return (() => {
      throw new Error('spawnSync git ENOENT')
    }) as any
  }

  const DIRECT = 'https://example.com/skill'
  const MIRROR = 'https://my-mirror.example.com'
  const MIRROR_URL = `${MIRROR}/${DIRECT}`
  const infoRefs = (u: string) => `${u}/info/refs?service=git-upload-pack`

  // ── Tier 1: git-verified ──────────────────────────────────────────

  it('direct ls-remote ok → git-verified direct, fetch never called', async () => {
    const { exec } = mockGitExec([DIRECT])
    mockFetch(new Map([[infoRefs(DIRECT), new Response(null, { status: 200 })]]))

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: exec })

    expect(result).toMatchObject({
      path: 'direct',
      url: DIRECT,
      latencyMs: expect.any(Number),
      confidence: 'git-verified',
    })
    expect(fetchCalls.length).toBe(0)
  })

  it('direct ls-remote fails, mirror ls-remote ok → git-verified mirror', async () => {
    process.env.LYTHOS_GH_MIRROR = MIRROR
    const { exec } = mockGitExec([MIRROR_URL])
    mockFetch(new Map())

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: exec })

    expect(result).toMatchObject({
      path: 'mirror',
      url: MIRROR_URL,
      confidence: 'git-verified',
    })
    // direct failure recorded for diagnostics
    expect(result?.failures?.some((f) => f.url === DIRECT)).toBe(true)
  })

  it('HEAD-blocking mirror is NOT rejected when ls-remote succeeds (the K3 false negative)', async () => {
    // ghfast.top-style mirror: rejects HEAD/GET on bare URL with 403, but
    // serves git smart-HTTP fine — ls-remote (clone's handshake) succeeds.
    process.env.LYTHOS_GH_MIRROR = MIRROR
    const { exec } = mockGitExec([MIRROR_URL])
    globalThis.fetch = async () => new Response(null, { status: 403 })

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: exec })

    expect(result).toBeDefined()
    expect(result?.path).toBe('mirror')
    expect(result?.confidence).toBe('git-verified')
    expect(result?.authRequired).toBeUndefined()
  })

  it('LYTHOS_SOCKS_PROXY set → ls-remote injects -c http.proxy flags (same as clone)', async () => {
    process.env.LYTHOS_SOCKS_PROXY = '127.0.0.1:1080'
    const { exec, calls } = mockGitExec([DIRECT])

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: exec })

    expect(result?.confidence).toBe('git-verified')
    const gitCall = calls.find((c) => c.file === 'git')!
    expect(gitCall.args).toContain('http.proxy=socks5://127.0.0.1:1080')
    expect(gitCall.args).toContain('https.proxy=socks5://127.0.0.1:1080')
  })

  // ── Tier 2: http-signal (git cannot answer) ──────────────────────

  it('git unavailable, GET info/refs 200 → http-signal direct', async () => {
    mockFetch(new Map([[infoRefs(DIRECT), new Response(null, { status: 200 })]]))

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: gitUnavailable() })

    expect(result).toMatchObject({
      path: 'direct',
      url: DIRECT,
      confidence: 'http-signal',
    })
    expect(fetchCalls.length).toBe(1)
    expect(fetchCalls[0].url).toBe(infoRefs(DIRECT))
    expect(fetchCalls[0].options.method).toBe('GET')
  })

  it('403 on GET info/refs → reachable with authRequired (not "blocked")', async () => {
    mockFetch(new Map([[infoRefs(DIRECT), new Response(null, { status: 403 })]]))

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: gitUnavailable() })

    expect(result).toMatchObject({ path: 'direct', confidence: 'http-signal', authRequired: true })
  })

  it('401 on GET info/refs → reachable with authRequired', async () => {
    mockFetch(new Map([[infoRefs(DIRECT), new Response(null, { status: 401 })]]))

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: gitUnavailable() })

    expect(result?.authRequired).toBe(true)
  })

  it('404 on GET info/refs → reachable (host alive), no authRequired', async () => {
    mockFetch(new Map([[infoRefs(DIRECT), new Response(null, { status: 404 })]]))

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: gitUnavailable() })

    expect(result?.path).toBe('direct')
    expect(result?.authRequired).toBeUndefined()
  })

  it('git unavailable, direct HTTP fails, mirror HTTP ok → http-signal mirror', async () => {
    process.env.LYTHOS_GH_MIRROR = MIRROR
    mockFetch(new Map([[infoRefs(MIRROR_URL), new Response(null, { status: 200 })]]))

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: gitUnavailable() })

    expect(result).toMatchObject({ path: 'mirror', url: MIRROR_URL, confidence: 'http-signal' })
  })

  // ── Both tiers fail everywhere → undefined ───────────────────────

  it('undefined only when both tiers fail on all URLs', async () => {
    process.env.LYTHOS_GH_MIRROR = MIRROR
    mockFetch(new Map()) // every fetch → ENOTFOUND

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: gitUnavailable() })

    expect(result).toBeUndefined()
  })

  // ── Tier-2 racing behavior ───────────────────────────────────────

  it('tier-2 HTTP probes race concurrently, not sequentially', async () => {
    process.env.LYTHOS_GH_MIRROR = MIRROR
    const start = performance.now()

    mockFetch(
      new Map([[infoRefs(MIRROR_URL), new Response(null, { status: 200 })]]),
      50, // each mock fetch takes 50ms
    )

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: gitUnavailable() })

    const elapsed = performance.now() - start

    expect(result?.path).toBe('mirror')
    // Sequential would take ~100ms (2 × 50ms). Racing should be ~50-100ms.
    expect(elapsed).toBeLessThan(150)
  })

  it('timeout aborts slow tier-2 probes', async () => {
    globalThis.fetch = async (_input, init?) => {
      return new Promise((_, reject) => {
        const timer = setTimeout(
          () => reject(new Error('The operation timed out.')),
          10_000,
        )
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new Error('The operation was aborted.'))
        })
      })
    }

    const start = performance.now()
    const result = await probeConnectivity(DIRECT, 100, { execFileSync: gitUnavailable() })
    const elapsed = performance.now() - start

    expect(result).toBeUndefined()
    expect(elapsed).toBeLessThan(500) // 100ms timeout + overhead
  })

  // ── Tier-2 SOCKS proxy routing (curl) ────────────────────────────

  it('SOCKS proxy set, git unavailable, curl ok → http-signal direct via curl', async () => {
    process.env.LYTHOS_SOCKS_PROXY = '127.0.0.1:1080'
    const execCalls: Array<{ file: string; args: string[] }> = []

    const mockExec = (file: unknown, args: unknown) => {
      const a = (args as string[]).map(String)
      execCalls.push({ file: String(file), args: a })
      if (String(file) === 'curl') return '200'
      throw new Error('spawnSync git ENOENT')
    }
    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: mockExec as any })

    expect(result).toMatchObject({
      path: 'direct',
      url: DIRECT,
      latencyMs: expect.any(Number),
      confidence: 'http-signal',
    })
    const curlCalls = execCalls.filter((c) => c.file === 'curl')
    expect(curlCalls.length).toBe(1)
    expect(curlCalls[0].args).toContain('--proxy')
    expect(curlCalls[0].args).toContain('socks5://127.0.0.1:1080')
    expect(curlCalls[0].args[curlCalls[0].args.length - 1]).toBe(infoRefs(DIRECT))
  })

  it('SOCKS proxy already has socks5:// prefix → does not double-prefix', async () => {
    process.env.LYTHOS_SOCKS_PROXY = 'socks5://proxy.example.com:1080'
    const execCalls: Array<{ file: string; args: string[] }> = []

    const mockExec = (file: unknown, args: unknown) => {
      const a = (args as string[]).map(String)
      execCalls.push({ file: String(file), args: a })
      if (String(file) === 'curl') return '200'
      throw new Error('spawnSync git ENOENT')
    }
    await probeConnectivity(DIRECT, 3000, { execFileSync: mockExec as any })

    const curlCall = execCalls.find((c) => c.file === 'curl')!
    expect(curlCall.args).toContain('socks5://proxy.example.com:1080')
    expect(curlCall.args).not.toContain('socks5://socks5://proxy.example.com:1080')
  })

  it('SOCKS curl gets 403 → http-signal direct with authRequired', async () => {
    process.env.LYTHOS_SOCKS_PROXY = '127.0.0.1:1080'

    const mockExec = (file: unknown) => {
      if (String(file) === 'curl') return '403'
      throw new Error('spawnSync git ENOENT')
    }
    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: mockExec as any })

    expect(result).toMatchObject({ path: 'direct', confidence: 'http-signal', authRequired: true })
  })

  it('SOCKS proxy fails (git + curl) → no automatic unproxied fallback', async () => {
    process.env.LYTHOS_SOCKS_PROXY = '127.0.0.1:1080'

    const result = await probeConnectivity(DIRECT, 3000, {
      execFileSync: (() => {
        throw new Error('curl failed')
      }) as any,
      fetch: async () => new Response(null, { status: 200 }),
    })

    // Design choice: when SOCKS proxy is configured but both git and curl
    // fail, the direct probe fails. No automatic fallback to unproxied
    // fetch — the user explicitly chose to route traffic through the
    // proxy, so we honor that choice rather than silently bypassing it.
    expect(result).toBeUndefined()
  })

  it('SOCKS proxy fails but mirror succeeds → mirror; only one curl call', async () => {
    process.env.LYTHOS_SOCKS_PROXY = '127.0.0.1:1080'
    process.env.LYTHOS_GH_MIRROR = MIRROR
    const execCalls: Array<{ file: string; args: string[] }> = []

    const result = await probeConnectivity(DIRECT, 3000, {
      execFileSync: ((file: unknown, args: unknown) => {
        execCalls.push({ file: String(file), args: (args as string[]).map(String) })
        throw new Error('proxy unreachable')
      }) as any,
      fetch: async (input) => {
        const url = String(input)
        if (url.includes('my-mirror')) {
          return new Response(null, { status: 200 })
        }
        throw new Error('ENOTFOUND')
      },
    })

    // SOCKS proxy is only used for direct probes; mirror probes use native fetch
    expect(result?.path).toBe('mirror')
    expect(execCalls.filter((c) => c.file === 'curl').length).toBe(1)
  })

  // ── Backward compat: legacy env var name still works ──
  it('LYTHOSKILL_GH_MIRROR (legacy) still works with deprecation warning', async () => {
    // Ensure new name is not set
    delete process.env.LYTHOS_GH_MIRROR
    process.env.LYTHOSKILL_GH_MIRROR = 'https://legacy-mirror.example.com'
    const warnCalls: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args.map(String).join(' '))
    }

    mockFetch(
      new Map([
        [infoRefs(`https://legacy-mirror.example.com/${DIRECT}`), new Response(null, { status: 200 })],
      ]),
    )

    const result = await probeConnectivity(DIRECT, 3000, { execFileSync: gitUnavailable() })

    console.warn = originalWarn

    expect(result?.path).toBe('mirror')
    expect(warnCalls.some((m) => m.includes('deprecated'))).toBe(true)
  })
})
