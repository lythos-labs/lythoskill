/**
 * Lightweight GitHub Tree API client.
 *
 * No SDK, no auth handling — public repos only via built-in `fetch`.
 * One function: `fetchRepoTree`. Caller passes a fetch implementation
 * for testing; default is `globalThis.fetch`.
 *
 * Endpoint: GET https://api.github.com/repos/{owner}/{repo}/git/trees/{ref}?recursive=1
 *   200 → tree returned (with optional `truncated: true` for >7MB or 100k entries)
 *   404 → repo or ref not found
 *   403 → rate-limited (X-RateLimit-Remaining: 0) or private repo without auth
 */

export interface TreeEntry {
  readonly path: string
  readonly type: 'blob' | 'tree' | 'commit'
  readonly sha: string
  readonly size?: number
}

export interface TreeResponse {
  readonly status: 'ok' | 'not-found' | 'rate-limited' | 'private' | 'network-error' | 'unsupported-host'
  readonly entries: ReadonlyArray<TreeEntry>
  readonly truncated: boolean
  readonly httpStatus: number
  readonly message?: string
}

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>

const DEFAULT_REF = 'HEAD'

export async function fetchRepoTree(
  host: string,
  owner: string,
  repo: string,
  ref: string = DEFAULT_REF,
  fetchImpl: FetchFn = globalThis.fetch,
): Promise<TreeResponse> {
  if (host !== 'github.com') {
    return {
      status: 'unsupported-host',
      entries: [],
      truncated: false,
      httpStatus: 0,
      message: `host '${host}' is not supported by fetchRepoTree (only github.com for now)`,
    }
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`

  let res: Response
  try {
    res = await fetchImpl(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': '@lythos/cold-pool',
      },
    })
  } catch (err) {
    return {
      status: 'network-error',
      entries: [],
      truncated: false,
      httpStatus: 0,
      message: err instanceof Error ? err.message : String(err),
    }
  }

  if (res.status === 404) {
    return {
      status: 'not-found',
      entries: [],
      truncated: false,
      httpStatus: 404,
      message: `repo '${owner}/${repo}' or ref '${ref}' not found on github.com`,
    }
  }

  if (res.status === 403) {
    const remaining = res.headers.get('X-RateLimit-Remaining')
    const isRateLimited = remaining === '0'
    return {
      status: isRateLimited ? 'rate-limited' : 'private',
      entries: [],
      truncated: false,
      httpStatus: 403,
      message: isRateLimited
        ? 'github.com api rate limit exceeded for unauthenticated requests'
        : `repo '${owner}/${repo}' is private (or auth required)`,
    }
  }

  if (!res.ok) {
    return {
      status: 'network-error',
      entries: [],
      truncated: false,
      httpStatus: res.status,
      message: `unexpected http ${res.status}`,
    }
  }

  const body = await res.json() as { tree?: TreeEntry[]; truncated?: boolean }
  return {
    status: 'ok',
    entries: body.tree ?? [],
    truncated: body.truncated ?? false,
    httpStatus: 200,
  }
}
