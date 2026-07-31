import { describe, it, expect } from 'bun:test'
import { parsePublishList, findWorkspaceLeaks, checkPublishedManifests, guardPasses } from './check-published-manifests'

const PUBLISH_SH_SNIPPET = `
PACKAGES=(
  "packages/lythoskill-hello-world"
	  "packages/lythoskill-agent-adapter"
  "packages/lythoskill-deck"
)
`

describe('parsePublishList', () => {
  it('parses the PACKAGES array incl. weird whitespace', () => {
    expect(parsePublishList(PUBLISH_SH_SNIPPET)).toEqual([
      'packages/lythoskill-hello-world',
      'packages/lythoskill-agent-adapter',
      'packages/lythoskill-deck',
    ])
  })

  it('throws when no PACKAGES array', () => {
    expect(() => parsePublishList('PACK=()\n')).toThrow('PACKAGES array not found')
  })
})

describe('findWorkspaceLeaks', () => {
  it('flags workspace: specifiers with context lines', () => {
    const out = `{
  '@iarna/toml': '^2.2.5',
  '@lythos/cold-pool': 'workspace:*',
  '@lythos/infra': 'workspace:*',
  yaml: '^2.8.3'
}`
    const leaks = findWorkspaceLeaks(out)
    expect(leaks).toHaveLength(2)
    expect(leaks[0]).toContain('@lythos/cold-pool')
  })

  it('clean when rewritten to semver', () => {
    const out = `{ '@lythos/cold-pool': '^0.17.3' }`
    expect(findWorkspaceLeaks(out)).toHaveLength(0)
  })
})

describe('checkPublishedManifests (injected IO)', () => {
  it('reports leaked packages only; unresolvable tracked as skipped (fail-closed)', async () => {
    const logs: string[] = []
    const { checked, leaked, skipped } = await checkPublishedManifests({
      version: '9.9.9',
      io: {
        view: (name) => {
          if (name === '@lythos/skill-deck') return `{ '@lythos/infra': 'workspace:*' }`
          if (name === '@lythos/agent-adapter') throw new Error('E404 Not found')
          return `{ yaml: '^2.8.3' }`
        },
        log: (m) => logs.push(m),
      },
    })

    expect(checked.length).toBeGreaterThan(0)
    expect([...leaked.keys()]).toEqual(['@lythos/skill-deck'])
    expect(leaked.get('@lythos/skill-deck')![0]).toContain('workspace:*')
    expect(skipped).toEqual(['@lythos/agent-adapter'])
    expect(logs.some((l) => l.includes('@lythos/agent-adapter') && l.includes('unverifiable'))).toBe(true)
    // fail-closed: a skip must not pass the gate
    expect(guardPasses(leaked, skipped)).toBe(false)
  })

  it('clean run → passes', async () => {
    const { leaked, skipped } = await checkPublishedManifests({
      io: { view: () => `{ '@lythos/infra': '^0.17.3' }`, log: () => {} },
    })
    expect(guardPasses(leaked, skipped)).toBe(true)
  })

  it('full-outage run (every view throws) → does NOT pass', async () => {
    const { checked, leaked, skipped } = await checkPublishedManifests({
      io: { view: () => { throw new Error('network down') }, log: () => {} },
    })
    expect(skipped).toHaveLength(checked.length)
    expect(guardPasses(leaked, skipped)).toBe(false)
  })
})
