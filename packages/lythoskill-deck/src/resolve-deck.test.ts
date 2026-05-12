import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { fetchDeckUrl, type FetchDeckIO } from './resolve-deck.js'

describe('fetchDeckUrl', () => {
  const written: Array<{ path: string; content: string }> = []

  function createMockIO(partial?: Partial<FetchDeckIO>): FetchDeckIO {
    return {
      existsSync: () => false,
      writeFileSync: (path: string, content: string) => {
        written.push({ path, content })
      },
      fetch: async () => new Response('deck content'),
      execFileSync: () => Buffer.from('deck content'),
      ...partial,
    }
  }

  beforeEach(() => {
    written.length = 0
    delete process.env.LYTHOS_SOCKS_PROXY
  })

  afterEach(() => {
    delete process.env.LYTHOS_SOCKS_PROXY
  })

  test('no proxy: uses fetch, writes file on success', async () => {
    const io = createMockIO()
    await fetchDeckUrl('https://example.com/deck.toml', io)
    expect(written).toHaveLength(1)
    expect(written[0].content).toBe('deck content')
  })

  test('with LYTHOS_SOCKS_PROXY: succeeds via exec path even when fetch would fail', async () => {
    process.env.LYTHOS_SOCKS_PROXY = 'proxy.example.com:1080'
    const io = createMockIO({
      fetch: async () => { throw new Error('fetch unreachable') },
      execFileSync: () => Buffer.from('proxy deck content'),
    })
    await fetchDeckUrl('https://example.com/deck.toml', io)
    expect(written).toHaveLength(1)
  })

  test('file already exists: refuses to overwrite', async () => {
    const io = createMockIO({ existsSync: () => true })
    await expect(fetchDeckUrl('https://example.com/deck.toml', io)).rejects.toThrow(
      /Refusing to overwrite/,
    )
  })

})
