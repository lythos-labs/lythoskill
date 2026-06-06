import { describe, expect, it } from 'bun:test'
import { fetchWithProxy } from './fetch-with-proxy.js'

describe('fetchWithProxy', () => {
  it('no proxy: delegates to native fetch', async () => {
    const mockFetch = async () => new Response('direct-body')
    const res = await fetchWithProxy('https://example.com', undefined, {
      fetch: mockFetch,
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('direct-body')
  })

  it('with LYTHOS_SOCKS_PROXY: routes to curl via execFileSync', async () => {
    const calls: Array<{ cmd: string; args: string[] }> = []
    const mockExec = (cmd: string, args: string[]) => {
      calls.push({ cmd, args })
      return 'proxy-body'
    }
    const res = await fetchWithProxy('https://example.com', undefined, {
      fetch: async () => new Response('should-not-reach'),
      execFileSync: mockExec as any,
      envProxy: '127.0.0.1:1080',
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('proxy-body')
    expect(calls).toHaveLength(1)
    expect(calls[0].cmd).toBe('curl')
    expect(calls[0].args).toContain('--proxy')
    expect(calls[0].args).toContain('socks5://127.0.0.1:1080')
    expect(calls[0].args).toContain('https://example.com')
  })

  it('proxy without socks5:// prefix: auto-prefixes', async () => {
    const calls: Array<{ args: string[] }> = []
    const mockExec = (_cmd: string, args: string[]) => {
      calls.push({ args })
      return ''
    }
    await fetchWithProxy('https://example.com', undefined, {
      execFileSync: mockExec as any,
      envProxy: 'proxy.example.com:1080',
    })
    expect(calls[0].args).toContain('socks5://proxy.example.com:1080')
  })
})
