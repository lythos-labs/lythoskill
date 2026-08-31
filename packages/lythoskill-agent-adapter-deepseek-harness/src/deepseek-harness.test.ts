import { describe, expect, it } from 'bun:test'
import {
  buildDshCommand,
  parseDshVersion,
  probeDshUpstream,
  DSH_VERSION_RANGE,
} from './deepseek-harness'
import type { ProbeRunner } from './deepseek-harness'

describe('buildDshCommand', () => {
  it('builds the headless one-shot command without shell wrapper', () => {
    const cmd = buildDshCommand('run the tests')
    expect(cmd).toEqual(['dsh', '--profile', 'headless', 'run the tests'])
  })

  it('does not use shell or redirect (injection-safe)', () => {
    const cmd = buildDshCommand('x; rm -rf /')
    expect(cmd).not.toContain('sh')
    expect(cmd).not.toContain('-c')
    // the brief is a single argv element, never string-interpolated
    expect(cmd[3]).toBe('x; rm -rf /')
  })

  it('rejects an empty task (headless treats no-task as a usage error)', () => {
    expect(() => buildDshCommand('')).toThrow('non-empty task')
    expect(() => buildDshCommand('   ')).toThrow('non-empty task')
  })

  it('throws when no binary is available', () => {
    expect(() => buildDshCommand('task', '')).toThrow('No dsh binary found in PATH')
  })
})

describe('parseDshVersion', () => {
  it('parses a bare semver triple', () => {
    expect(parseDshVersion('0.1.0')).toBe('0.1.0')
  })

  it('strips the rc prerelease suffix', () => {
    expect(parseDshVersion('0.1.0-rc.7')).toBe('0.1.0')
  })

  it('parses prefixed output', () => {
    expect(parseDshVersion('dsh 0.1.0-rc.6')).toBe('0.1.0')
  })

  it('returns null on unparseable output', () => {
    expect(parseDshVersion('not a version')).toBeNull()
    expect(parseDshVersion('')).toBeNull()
  })
})

describe('probeDshUpstream', () => {
  const okRunner: ProbeRunner = () => ({ stdout: '0.1.0-rc.7\n', stderr: '', exitCode: 0 })

  it('accepts an in-range rc version and returns the triple', () => {
    expect(probeDshUpstream('dsh', ['--version'], DSH_VERSION_RANGE, okRunner)).toBe('0.1.0')
  })

  it('fails closed on an out-of-range version with a HATEOAS error', () => {
    const runner: ProbeRunner = () => ({ stdout: '1.0.0\n', stderr: '', exitCode: 0 })
    expect(() => probeDshUpstream('dsh', ['--version'], DSH_VERSION_RANGE, runner)).toThrow(/probe failed/)
    expect(() => probeDshUpstream('dsh', ['--version'], DSH_VERSION_RANGE, runner)).toThrow(/1\.0\.0/)
    expect(() => probeDshUpstream('dsh', ['--version'], DSH_VERSION_RANGE, runner)).toThrow(/Supported:/)
    expect(() => probeDshUpstream('dsh', ['--version'], DSH_VERSION_RANGE, runner)).toThrow(/Fix:/)
  })

  it('fails closed on unparseable output', () => {
    const runner: ProbeRunner = () => ({ stdout: '', stderr: 'command not found', exitCode: 127 })
    expect(() => probeDshUpstream('dsh', ['--version'], DSH_VERSION_RANGE, runner)).toThrow(/unparseable version output/)
  })

  it('reads version from stderr when stdout is empty', () => {
    const runner: ProbeRunner = () => ({ stdout: '', stderr: '0.1.0-rc.1', exitCode: 0 })
    expect(probeDshUpstream('dsh', ['--version'], DSH_VERSION_RANGE, runner)).toBe('0.1.0')
  })
})

describe('DSH_VERSION_RANGE', () => {
  it('is pinned to the 0.1.x developer-preview line', () => {
    expect(DSH_VERSION_RANGE).toBe('>=0.1.0 <1.0.0')
  })
})
