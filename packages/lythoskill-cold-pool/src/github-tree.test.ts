import { describe, expect, test } from 'bun:test'
import { fetchRepoTree, type FetchFn, type TreeEntry } from './github-tree'

function mockFetch(impl: (url: string, init?: RequestInit) => {
  status: number
  body?: unknown
  headers?: Record<string, string>
  error?: Error
}): FetchFn {
  return async (url, init) => {
    const out = impl(url, init)
    if (out.error) throw out.error
    return new Response(out.body !== undefined ? JSON.stringify(out.body) : null, {
      status: out.status,
      headers: out.headers,
    })
  }
}

describe('fetchRepoTree', () => {
  test('200 → ok with entries', async () => {
    const entries: TreeEntry[] = [
      { path: 'README.md', type: 'blob', sha: 'a' },
      { path: 'skills/pdf/SKILL.md', type: 'blob', sha: 'b' },
    ]
    const fetch = mockFetch((url) => {
      expect(url).toBe('https://api.github.com/repos/anthropics/skills/git/trees/HEAD?recursive=1')
      return { status: 200, body: { tree: entries, truncated: false } }
    })
    const res = await fetchRepoTree('github.com', 'anthropics', 'skills', 'HEAD', fetch)
    expect(res.status).toBe('ok')
    expect(res.entries).toEqual(entries)
    expect(res.httpStatus).toBe(200)
    expect(res.truncated).toBe(false)
  })

  test('200 with truncated', async () => {
    const fetch = mockFetch(() => ({
      status: 200,
      body: { tree: [], truncated: true },
    }))
    const res = await fetchRepoTree('github.com', 'o', 'r', 'HEAD', fetch)
    expect(res.truncated).toBe(true)
  })

  test('404 → not-found', async () => {
    const fetch = mockFetch(() => ({ status: 404 }))
    const res = await fetchRepoTree('github.com', 'nope', 'nope', 'HEAD', fetch)
    expect(res.status).toBe('not-found')
    expect(res.httpStatus).toBe(404)
  })

  test('403 with X-RateLimit-Remaining: 0 → rate-limited', async () => {
    const fetch = mockFetch(() => ({
      status: 403,
      headers: { 'X-RateLimit-Remaining': '0' },
    }))
    const res = await fetchRepoTree('github.com', 'o', 'r', 'HEAD', fetch)
    expect(res.status).toBe('rate-limited')
  })

  test('403 without rate-limit headers → private', async () => {
    const fetch = mockFetch(() => ({ status: 403 }))
    const res = await fetchRepoTree('github.com', 'o', 'r', 'HEAD', fetch)
    expect(res.status).toBe('private')
  })

  test('network error → network-error', async () => {
    const fetch = mockFetch(() => ({ status: 0, error: new Error('ENOTFOUND') }))
    const res = await fetchRepoTree('github.com', 'o', 'r', 'HEAD', fetch)
    expect(res.status).toBe('network-error')
    expect(res.message).toContain('ENOTFOUND')
  })

  test('non-github host → unsupported-host', async () => {
    const fetch = mockFetch(() => ({ status: 200 })) // would be ok if fetched
    const res = await fetchRepoTree('gitlab.com', 'o', 'r', 'HEAD', fetch)
    expect(res.status).toBe('unsupported-host')
  })

  test('default ref is HEAD', async () => {
    let capturedUrl = ''
    const fetch = mockFetch((url) => {
      capturedUrl = url
      return { status: 200, body: { tree: [] } }
    })
    await fetchRepoTree('github.com', 'o', 'r', undefined, fetch)
    expect(capturedUrl).toContain('/trees/HEAD?recursive=1')
  })

  test('explicit ref is honored', async () => {
    let capturedUrl = ''
    const fetch = mockFetch((url) => {
      capturedUrl = url
      return { status: 200, body: { tree: [] } }
    })
    await fetchRepoTree('github.com', 'o', 'r', 'v1.2.3', fetch)
    expect(capturedUrl).toContain('/trees/v1.2.3?recursive=1')
  })
})
