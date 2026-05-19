import { describe, it, expect } from 'bun:test'
import {
  checkCortexProbe,
  checkSymlinksInSkills,
  checkWorkingSetLeaks,
  checkEnvVarPrefix,
  checkMissingWeekly,
} from './checks.ts'
import type { EntropyConfig, EntropyIO, CheckResult } from './types.ts'

const baseConfig: EntropyConfig = {
  projectDir: '/tmp/test',
  checkpointFile: '/tmp/test/.last-entropy-check',
  intervalSeconds: 604800,
  strict: false,
  dryRun: false,
  force: false,
}

function mockIO(overrides: Partial<EntropyIO> = {}): EntropyIO {
  return {
    readFile: () => null,
    writeFile: () => {},
    exists: () => false,
    exec: () => ({ stdout: '', stderr: '', exitCode: 0 }),
    now: () => 1000000,
    listDir: () => [],
    log: () => {},
    ...overrides,
  }
}

describe('checkCortexProbe', () => {
  it('skips when cortex CLI not found', () => {
    const io = mockIO()
    const result = checkCortexProbe(baseConfig, io)
    expect(result.status).toBe('skip')
    expect(result.message).toContain('not found')
  })

  it('warns when probe fails', () => {
    const io = mockIO({
      exists: (p) => p.includes('cli.ts'),
      exec: () => ({ stdout: '', stderr: 'error', exitCode: 1 }),
    })
    const result = checkCortexProbe(baseConfig, io)
    expect(result.status).toBe('warn')
  })

  it('passes when cortex clean', () => {
    const io = mockIO({
      exists: (p) => p.includes('cli.ts'),
      exec: () => ({ stdout: 'All clean\n', stderr: '', exitCode: 0 }),
    })
    const result = checkCortexProbe(baseConfig, io)
    expect(result.status).toBe('pass')
  })

  it('warns when cortex has warnings', () => {
    const io = mockIO({
      exists: (p) => p.includes('cli.ts'),
      exec: () => ({
        stdout: '⚠️  Proposed ADR found\n📭 Empty shells\n',
        stderr: '',
        exitCode: 0,
      }),
    })
    const result = checkCortexProbe(baseConfig, io)
    expect(result.status).toBe('warn')
    expect(result.details?.length).toBeGreaterThan(0)
  })
})

describe('checkSymlinksInSkills', () => {
  it('skips when skills/ not found', () => {
    const io = mockIO()
    const result = checkSymlinksInSkills(baseConfig, io)
    expect(result.status).toBe('skip')
  })

  it('passes when no symlinks', () => {
    const io = mockIO({
      exists: (p) => p.includes('skills'),
      listDir: () => ['lythoskill-deck', 'lythoskill-arena'],
      exec: () => ({ stdout: 'regular file', stderr: '', exitCode: 0 }),
    })
    const result = checkSymlinksInSkills(baseConfig, io)
    expect(result.status).toBe('pass')
  })

  it('fails when symlinks found', () => {
    const io = mockIO({
      exists: (p) => p.includes('skills'),
      listDir: () => ['lythoskill-deck', 'bad-link'],
      exec: (_cmd, args) => {
        const path = args[args.length - 1]
        return {
          stdout: path.includes('bad-link') ? 'symbolic link' : 'regular file',
          stderr: '',
          exitCode: 0,
        }
      },
    })
    const result = checkSymlinksInSkills(baseConfig, io)
    expect(result.status).toBe('fail')
    expect(result.details).toContain('bad-link')
  })
})

describe('checkWorkingSetLeaks', () => {
  it('passes when no leaks', () => {
    const io = mockIO({
      exec: () => ({ stdout: '', stderr: '', exitCode: 0 }),
    })
    const result = checkWorkingSetLeaks(baseConfig, io)
    expect(result.status).toBe('pass')
  })

  it('fails when leaks found', () => {
    const io = mockIO({
      exec: (_cmd, args) => {
        const path = args[args.length - 1]
        if (path.includes('.agents')) {
          return { stdout: '.agents/skills/foo\n.agents/skills/bar\n', stderr: '', exitCode: 0 }
        }
        return { stdout: '', stderr: '', exitCode: 0 }
      },
    })
    const result = checkWorkingSetLeaks(baseConfig, io)
    expect(result.status).toBe('fail')
    expect(result.details?.length).toBe(2)
  })
})

describe('checkEnvVarPrefix', () => {
  it('skips when packages/ not found', () => {
    const io = mockIO()
    const result = checkEnvVarPrefix(baseConfig, io)
    expect(result.status).toBe('skip')
  })

  it('passes when no legacy prefix', () => {
    const io = mockIO({
      exists: (p) => p.includes('packages'),
      exec: () => ({ stdout: '', stderr: '', exitCode: 1 }), // grep exits 1 = no matches
    })
    const result = checkEnvVarPrefix(baseConfig, io)
    expect(result.status).toBe('pass')
  })

  it('fails when legacy prefix found', () => {
    const io = mockIO({
      exists: (p) => p.includes('packages'),
      exec: () => ({
        stdout: 'packages/foo/src/bar.ts:const x = process.env.LYTHOSKILL_GH_MIRROR\n',
        stderr: '',
        exitCode: 0,
      }),
    })
    const result = checkEnvVarPrefix(baseConfig, io)
    expect(result.status).toBe('fail')
  })

  it('ignores mirror compat code', () => {
    const io = mockIO({
      exists: (p) => p.includes('packages'),
      exec: () => ({
        stdout: 'packages/foo/src/mirror.ts:const x = process.env.LYTHOSKILL_GH_MIRROR\n',
        stderr: '',
        exitCode: 0,
      }),
    })
    const result = checkEnvVarPrefix(baseConfig, io)
    expect(result.status).toBe('pass')
  })
})

describe('checkMissingWeekly', () => {
  it('passes when weekly exists', () => {
    const io = mockIO({
      exists: (p) => p.includes('weekly'),
      exec: (cmd, args) => {
        if (args[0] === '+%V') return { stdout: '20\n', stderr: '', exitCode: 0 }
        if (args[0] === '+%Y') return { stdout: '2026\n', stderr: '', exitCode: 0 }
        return { stdout: '', stderr: '', exitCode: 0 }
      },
    })
    const result = checkMissingWeekly(baseConfig, io)
    expect(result.status).toBe('pass')
  })

  it('warns when weekly missing', () => {
    const io = mockIO({
      exists: () => false,
      exec: (cmd, args) => {
        if (args[0] === '+%V') return { stdout: '21\n', stderr: '', exitCode: 0 }
        if (args[0] === '+%Y') return { stdout: '2026\n', stderr: '', exitCode: 0 }
        return { stdout: '', stderr: '', exitCode: 0 }
      },
    })
    const result = checkMissingWeekly(baseConfig, io)
    expect(result.status).toBe('warn')
    expect(result.message).toContain('W21')
  })
})
