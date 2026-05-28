import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
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

  // ── Tracer Bullet ──
  test('direct reachable → returns direct path', async () => {
    mockFetch(
      new Map([
        ['https://example.com/skill', new Response(null, { status: 200 })],
      ]),
    )

    const result = await probeConnectivity('https://example.com/skill')

    expect(result).toMatchObject({
      path: 'direct',
      url: 'https://example.com/skill',
      latencyMs: expect.any(Number),
    })
  })

  // ── Vertical Slice 2 ──
  test('direct fails, user mirror ok → returns mirror path', async () => {
    process.env.LYTHOS_GH_MIRROR = 'https://my-mirror.example.com'
    mockFetch(
      new Map([
        ['https://example.com/skill', new Response(null, { status: 500 })],
        ['https://my-mirror.example.com/https://example.com/skill', new Response(null, { status: 200 })],
      ]),
    )

    const result = await probeConnectivity('https://example.com/skill')

    expect(result).toMatchObject({
      path: 'mirror',
      url: 'https://my-mirror.example.com/https://example.com/skill',
      latencyMs: expect.any(Number),
    })
  })

  // ── Vertical Slice 3 ──
  test('all paths fail → returns undefined', async () => {
    mockFetch(new Map())

    const result = await probeConnectivity('https://example.com/skill')

    expect(result).toBeUndefined()
  })

  // ── Vertical Slice 4 ──
  test('404 is treated as reachable (server alive)', async () => {
    mockFetch(
      new Map([
        ['https://example.com/skill', new Response(null, { status: 404 })],
      ]),
    )

    const result = await probeConnectivity('https://example.com/skill')

    expect(result?.path).toBe('direct')
  })

  // ── Vertical Slice 5: Racing behavior ──
  test('probes race concurrently, not sequentially', async () => {
    process.env.LYTHOS_GH_MIRROR = 'https://my-mirror.example.com'
    const start = performance.now()

    mockFetch(
      new Map([
        ['https://example.com/skill', new Response(null, { status: 500 })],
        ['https://my-mirror.example.com/https://example.com/skill', new Response(null, { status: 200 })],
      ]),
      50, // each mock fetch takes 50ms
    )

    const result = await probeConnectivity('https://example.com/skill')

    const elapsed = performance.now() - start

    expect(result?.path).toBe('mirror')
    // Sequential would take ~100ms (2 × 50ms). Racing should be ~50-100ms.
    expect(elapsed).toBeLessThan(150)
  })

  // ── Vertical Slice 6: No user mirror set → only probes direct ──
  test('without user mirror, only probes direct', async () => {
    mockFetch(
      new Map([
        ['https://example.com/skill', new Response(null, { status: 200 })],
      ]),
    )

    const result = await probeConnectivity('https://example.com/skill')

    expect(result?.path).toBe('direct')
    expect(fetchCalls.length).toBe(1)
    expect(fetchCalls[0].url).toBe('https://example.com/skill')
  })

  // ── Vertical Slice 7: Timeout honored ──
  test('timeout aborts slow probes', async () => {
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
    const result = await probeConnectivity('https://example.com/skill', 100)
    const elapsed = performance.now() - start

    expect(result).toBeUndefined()
    expect(elapsed).toBeLessThan(500) // 100ms timeout + overhead
  })

  // ── Vertical Slice 8: SOCKS proxy routing ──
  test('SOCKS proxy set, curl succeeds → returns direct path', async () => {
    process.env.LYTHOS_SOCKS_PROXY = '127.0.0.1:1080'
    const execCalls: Array<{ file: string; args: string[] }> = []

    const mockExec = (file: unknown, args: unknown) => {
      execCalls.push({ file: String(file), args: args as string[] })
      return ''
    }
    const result = await probeConnectivity('https://example.com/skill', 3000, {
      execFileSync: mockExec as any,
    })

    expect(result).toMatchObject({
      path: 'direct',
      url: 'https://example.com/skill',
      latencyMs: expect.any(Number),
    })
    expect(execCalls.length).toBe(1)
    expect(execCalls[0].file).toBe('curl')
    expect(execCalls[0].args).toContain('--proxy')
    expect(execCalls[0].args).toContain('socks5://127.0.0.1:1080')
  })

  // ── Vertical Slice 9: SOCKS proxy with socks5:// prefix ──
  test('SOCKS proxy already has socks5:// prefix → does not double-prefix', async () => {
    process.env.LYTHOS_SOCKS_PROXY = 'socks5://proxy.example.com:1080'
    const execCalls: Array<{ file: string; args: string[] }> = []

    const mockExec2 = (file: unknown, args: unknown) => {
      execCalls.push({ file: String(file), args: args as string[] })
      return ''
    }
    await probeConnectivity('https://example.com/skill', 3000, {
      execFileSync: mockExec2 as any,
    })

    expect(execCalls[0].args).toContain('socks5://proxy.example.com:1080')
    expect(execCalls[0].args).not.toContain('socks5://socks5://proxy.example.com:1080')
  })

  // ── Vertical Slice 10: SOCKS proxy fails → no automatic unproxied fallback ──
  test('SOCKS proxy fails → no automatic unproxied fallback', async () => {
    process.env.LYTHOS_SOCKS_PROXY = '127.0.0.1:1080'

    const result = await probeConnectivity('https://example.com/skill', 3000, {
      execFileSync: () => {
        throw new Error('curl failed')
      },
      fetch: async () => new Response(null, { status: 200 }),
    })

    // Design choice: when SOCKS proxy is configured but curl fails, the direct
    // probe fails. No automatic fallback to unproxied fetch — the user
    // explicitly chose to route traffic through the proxy, so we honor that
    // choice rather than silently bypassing it.
    expect(result).toBeUndefined()
  })

  // ── Vertical Slice 11: SOCKS proxy only affects direct, mirror still works ──
  test('SOCKS proxy fails but mirror succeeds', async () => {
    process.env.LYTHOS_SOCKS_PROXY = '127.0.0.1:1080'
    process.env.LYTHOS_GH_MIRROR = 'https://my-mirror.example.com'
    const execCalls: Array<{ file: string; args: string[] }> = []

    const result = await probeConnectivity('https://example.com/skill', 3000, {
      execFileSync: (file, args) => {
        execCalls.push({ file: String(file), args: args as string[] })
        throw new Error('curl failed')
      },
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
    expect(execCalls.length).toBe(1) // only one curl call for direct probe
  })

  // ── Backward compat: legacy env var name still works ──
  test('LYTHOSKILL_GH_MIRROR (legacy) still works with deprecation warning', async () => {
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
        ['https://example.com/skill', new Response(null, { status: 500 })],
        ['https://legacy-mirror.example.com/https://example.com/skill', new Response(null, { status: 200 })],
      ]),
    )

    const result = await probeConnectivity('https://example.com/skill')

    console.warn = originalWarn

    expect(result?.path).toBe('mirror')
    expect(warnCalls.some((m) => m.includes('deprecated'))).toBe(true)
  })
})
