import { describe, expect, it } from 'bun:test'
import { buildKimiCommand, parseKimiStreamJson } from './kimi'

describe('buildKimiCommand', () => {
  it('builds shell command with prompt file', () => {
    const cmd = buildKimiCommand('/tmp/prompt.txt')
    expect(cmd[0]).toBe('sh')
    expect(cmd[1]).toBe('-c')
    expect(cmd[2]).toContain('kimi --print --afk --output-format stream-json')
    expect(cmd[2]).toContain('/tmp/prompt.txt')
  })

  it('includes stdin redirect from prompt file', () => {
    const cmd = buildKimiCommand('/tmp/my-prompt.txt')
    expect(cmd[2]).toContain('< /tmp/my-prompt.txt')
  })
})

describe('parseKimiStreamJson', () => {
  it('extracts text from assistant message with string content', () => {
    const raw = [
      '{"role":"assistant","content":"Hello world"}',
      '{"role":"user","content":"ignored"}',
    ].join('\n')
    expect(parseKimiStreamJson(raw)).toBe('Hello world')
  })

  it('extracts text from assistant message with content blocks', () => {
    const raw = [
      '{"role":"assistant","content":[{"type":"text","text":"First"},{"type":"text","text":"Second"}]}',
    ].join('\n')
    expect(parseKimiStreamJson(raw)).toBe('First\nSecond')
  })

  it('skips non-assistant roles', () => {
    const raw = [
      '{"role":"system","content":"init"}',
      '{"role":"assistant","content":"only this"}',
    ].join('\n')
    expect(parseKimiStreamJson(raw)).toBe('only this')
  })

  it('skips malformed JSON lines', () => {
    const raw = [
      'garbage',
      '{"role":"assistant","content":"valid"}',
    ].join('\n')
    expect(parseKimiStreamJson(raw)).toBe('valid')
  })

  it('returns empty string for empty input', () => {
    expect(parseKimiStreamJson('')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(parseKimiStreamJson('  \n  \n  ')).toBe('')
  })

  it('concatenates multiple assistant messages', () => {
    const raw = [
      '{"role":"assistant","content":"Part 1"}',
      '{"role":"assistant","content":"Part 2"}',
    ].join('\n')
    expect(parseKimiStreamJson(raw)).toBe('Part 1\nPart 2')
  })
})
