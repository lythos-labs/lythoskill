import { describe, expect, it, beforeEach } from 'bun:test'
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
      ...partial,
    }
  }

  beforeEach(() => {
    written.length = 0
  })

  it('fetch happy path: writes file on success', async () => {
    const io = createMockIO()
    await fetchDeckUrl('https://example.com/deck.toml', io)
    expect(written).toHaveLength(1)
    expect(written[0].content).toBe('deck content')
  })

  it('with proxy: intercepts through fetch deps', async () => {
    const io = createMockIO({
      fetch: async () => new Response('proxy deck content'),
    })
    await fetchDeckUrl('https://example.com/deck.toml', io)
    expect(written).toHaveLength(1)
    expect(written[0].content).toBe('proxy deck content')
  })

  it('file already exists: refuses to overwrite', async () => {
    const io = createMockIO({ existsSync: () => true })
    await expect(fetchDeckUrl('https://example.com/deck.toml', io)).rejects.toThrow(
      /Refusing to overwrite/,
    )
  })

})
