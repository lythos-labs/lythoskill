import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { probeConnectivity } from './mirror.js'

describe('probeConnectivity', () => {
  let originalFetch: typeof fetch
  let originalEnv: string | undefined
  let fetchCalls: Array<{ url: string; options: RequestInit }>

  beforeEach(() => {
    originalFetch = globalThis.fetch
    originalEnv = process.env.LYTHOSKILL_GH_MIRROR
    delete process.env.LYTHOSKILL_GH_MIRROR
    fetchCalls = []
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    if (originalEnv !== undefined) {
      process.env.LYTHOSKILL_GH_MIRROR = originalEnv
    } else {
      delete process.env.LYTHOSKILL_GH_MIRROR
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
    process.env.LYTHOSKILL_GH_MIRROR = 'https://my-mirror.example.com'
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
    process.env.LYTHOSKILL_GH_MIRROR = 'https://my-mirror.example.com'
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
})
