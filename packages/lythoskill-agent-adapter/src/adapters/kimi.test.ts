import { describe, expect, it } from 'bun:test'
import { detectKimiBinary, buildKimiCommand, parseKimiStreamJson } from './kimi'

describe('detectKimiBinary', () => {
  it('returns a non-empty string when a kimi binary is available', () => {
    const binary = detectKimiBinary()
    // In CI or environments without kimi, this may be empty — skip assert
    if (!binary) return
    expect(binary === 'kimi-cli' || binary === 'kimi').toBe(true)
  })
})

describe('buildKimiCommand', () => {
  it('builds kimi CLI args without shell wrapper', () => {
    const cmd = buildKimiCommand(undefined, 'kimi-cli')
    expect(cmd[0]).toBe('kimi-cli')
    expect(cmd).toContain('--print')
    expect(cmd).toContain('--output-format')
    expect(cmd).toContain('stream-json')
  })

  it('builds kimi CLI args for kimi binary', () => {
    const cmd = buildKimiCommand(undefined, 'kimi')
    expect(cmd[0]).toBe('kimi')
    expect(cmd).toContain('--print')
    expect(cmd).toContain('--output-format')
    expect(cmd).toContain('stream-json')
  })

  it('does not use shell or redirect (injection-safe)', () => {
    const cmd = buildKimiCommand(undefined, 'kimi-cli')
    expect(cmd).not.toContain('sh')
    expect(cmd).not.toContain('-c')
  })

  it('throws when no binary is available', () => {
    expect(() => buildKimiCommand(undefined, '')).toThrow('No kimi binary found in PATH')
  })
})

describe('parseKimiStreamJson', () => {
  it('extracts text from assistant message with string content', () => {
    const raw = [
      '{"role":"assistant","content":"Hello world"}',
      '{"role":"user","content":"ignored"}',
    ].join('\n')
    const result = parseKimiStreamJson(raw)
    expect(result.text).toBe('Hello world')
    expect(result.checkpoints).toEqual([])
  })

  it('extracts text from assistant message with content blocks', () => {
    const raw = [
      '{"role":"assistant","content":[{"type":"text","text":"First"},{"type":"text","text":"Second"}]}',
    ].join('\n')
    const result = parseKimiStreamJson(raw)
    expect(result.text).toBe('First\nSecond')
    expect(result.checkpoints).toEqual([])
  })

  it('skips non-assistant roles', () => {
    const raw = [
      '{"role":"system","content":"init"}',
      '{"role":"assistant","content":"only this"}',
    ].join('\n')
    const result = parseKimiStreamJson(raw)
    expect(result.text).toBe('only this')
    expect(result.checkpoints).toEqual([])
  })

  it('skips malformed JSON lines', () => {
    const raw = [
      'garbage',
      '{"role":"assistant","content":"valid"}',
    ].join('\n')
    const result = parseKimiStreamJson(raw)
    expect(result.text).toBe('valid')
    expect(result.checkpoints).toEqual([])
  })

  it('returns empty string for empty input', () => {
    const result = parseKimiStreamJson('')
    expect(result.text).toBe('')
    expect(result.checkpoints).toEqual([])
  })

  it('returns empty string for whitespace-only input', () => {
    const result = parseKimiStreamJson('  \n  \n  ')
    expect(result.text).toBe('')
    expect(result.checkpoints).toEqual([])
  })

  it('concatenates multiple assistant messages', () => {
    const raw = [
      '{"role":"assistant","content":"Part 1"}',
      '{"role":"assistant","content":"Part 2"}',
    ].join('\n')
    const result = parseKimiStreamJson(raw)
    expect(result.text).toBe('Part 1\nPart 2')
    expect(result.checkpoints).toEqual([])
  })

  it('extracts tool_calls into checkpoints', () => {
    const raw = [
      '{"role":"assistant","content":"Let me check.","tool_calls":[{"type":"function","id":"tc_1","function":{"name":"Shell","arguments":"{\\"command\\":\\"ls\\"}"}}]}',
      '{"role":"tool","tool_call_id":"tc_1","content":"agent-stdout.txt\\nreport.docx"}',
      '{"role":"assistant","content":"Done."}',
    ].join('\n')
    const result = parseKimiStreamJson(raw)
    expect(result.text).toBe('Let me check.\nDone.')
    expect(result.checkpoints.length).toBe(2)
    expect(result.checkpoints[0].step).toBe('tool_call')
    expect(result.checkpoints[0].tool).toBe('Shell')
    expect(result.checkpoints[1].step).toBe('tool_result')
    expect(result.checkpoints[1].tool).toBe('Shell')
    expect(result.checkpoints[1].stdout_summary).toBe('agent-stdout.txt\nreport.docx')
  })
})
