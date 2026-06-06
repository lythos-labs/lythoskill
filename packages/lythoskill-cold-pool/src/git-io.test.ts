import { describe, expect, it, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { detectGitRoot, gitClone, gitPull, type GitExec } from './git-io.js'

// ── Injectable mock exec for IO-layer tests ──

function createMockExec() {
  const calls: Array<{ file: string; args: string[]; opts: unknown }> = []
  const mockExec: GitExec = ((file: string, args: string[], opts?: object) => {
    calls.push({ file, args, opts: opts ?? {} })
    return Buffer.from('')
  }) as GitExec
  return { mockExec, calls }
}

// ── detectGitRoot tests (pure fs, no mock needed) ──

describe('detectGitRoot', () => {
  const root = mkdtempSync(join(tmpdir(), 'git-root-test-'))
  const repoDir = join(root, 'pool/host/owner/repo')
  const subDir = join(repoDir, 'src/deep')
  mkdirSync(subDir, { recursive: true })
  writeFileSync(join(repoDir, '.git'), '')
  const orphanDir = join(root, 'pool/orphan')
  mkdirSync(orphanDir, { recursive: true })

  it('finds .git at the same dir', () => {
    const r = detectGitRoot(repoDir)
    expect(r.gitRoot).toBe(resolve(repoDir))
  })

  it('walks up to find .git', () => {
    const r = detectGitRoot(subDir)
    expect(r.gitRoot).toBe(resolve(repoDir))
  })

  it('returns not-found when no .git in walk', () => {
    const r = detectGitRoot(orphanDir)
    expect(r.gitRoot).toBeNull()
    expect(r.reason).toBe('not-found')
  })

  it('respects coldPool boundary — outside-cold-pool when crossing out', () => {
    const isolated = mkdtempSync(join(tmpdir(), 'git-root-isolated-'))
    const inner = join(isolated, 'inner')
    const coldPool = join(isolated, 'pool')
    mkdirSync(inner, { recursive: true })
    mkdirSync(coldPool, { recursive: true })
    const r = detectGitRoot(inner, coldPool)
    expect(r.gitRoot).toBeNull()
    expect(r.reason).toBe('outside-cold-pool')
  })

  it('coldPool given, walking up within cold pool finds .git', () => {
    const r = detectGitRoot(subDir, join(root, 'pool'))
    expect(r.gitRoot).toBe(resolve(repoDir))
  })
})

// ── gitClone / gitPull tests — verify SOCKS proxy CLI contract via IO injection ──

describe('gitClone — SOCKS proxy args', () => {
  beforeEach(() => {
    delete process.env.LYTHOS_SOCKS_PROXY
  })

  afterEach(() => {
    delete process.env.LYTHOS_SOCKS_PROXY
  })

  it('without LYTHOS_SOCKS_PROXY: no proxy flags in git args', () => {
    const { mockExec, calls } = createMockExec()
    gitClone('https://github.com/example/repo.git', '/tmp/repo', undefined, mockExec)
    const call = calls.find((c) => c.args.includes('clone'))
    expect(call).toBeDefined()
    expect(call!.args).not.toContain('-c')
    expect(call!.args).not.toContain('http.proxy')
  })

  it('with LYTHOS_SOCKS_PROXY: injects -c http.proxy and -c https.proxy', () => {
    process.env.LYTHOS_SOCKS_PROXY = 'proxy.example.com:1080'
    const { mockExec, calls } = createMockExec()
    gitClone('https://github.com/example/repo.git', '/tmp/repo', undefined, mockExec)
    const call = calls.find((c) => c.args.includes('clone'))
    expect(call).toBeDefined()
    expect(call!.args).toContain('-c')
    expect(call!.args).toContain('http.proxy=socks5://proxy.example.com:1080')
    expect(call!.args).toContain('https.proxy=socks5://proxy.example.com:1080')
  })

  it('with LYTHOS_SOCKS_PROXY already including socks5://: does not double-prefix', () => {
    process.env.LYTHOS_SOCKS_PROXY = 'socks5://proxy.example.com:1080'
    const { mockExec, calls } = createMockExec()
    gitClone('https://github.com/example/repo.git', '/tmp/repo', undefined, mockExec)
    const call = calls.find((c) => c.args.includes('clone'))
    expect(call!.args).toContain('http.proxy=socks5://proxy.example.com:1080')
    expect(call!.args).not.toContain('http.proxy=socks5://socks5://proxy.example.com:1080')
  })

  it('ref checkout also receives proxy flags', () => {
    process.env.LYTHOS_SOCKS_PROXY = 'proxy.example.com:1080'
    const { mockExec, calls } = createMockExec()
    gitClone('https://github.com/example/repo.git', '/tmp/repo', { ref: 'v1.0.0' }, mockExec)
    const checkoutCall = calls.find((c) => c.args.includes('checkout'))
    expect(checkoutCall).toBeDefined()
    expect(checkoutCall!.args).toContain('http.proxy=socks5://proxy.example.com:1080')
  })
})

describe('gitPull — SOCKS proxy args', () => {
  beforeEach(() => {
    delete process.env.LYTHOS_SOCKS_PROXY
  })

  afterEach(() => {
    delete process.env.LYTHOS_SOCKS_PROXY
  })

  it('with LYTHOS_SOCKS_PROXY: injects proxy flags', () => {
    process.env.LYTHOS_SOCKS_PROXY = 'proxy.example.com:1080'
    const { mockExec, calls } = createMockExec()
    gitPull('/tmp/repo', 30000, mockExec)
    const call = calls.find((c) => c.args.includes('pull'))
    expect(call).toBeDefined()
    expect(call!.args).toContain('http.proxy=socks5://proxy.example.com:1080')
  })
})
