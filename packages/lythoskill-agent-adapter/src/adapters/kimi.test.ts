import { describe, expect, it } from 'bun:test'
import {
  detectKimiBinary,
  buildKimiCommand,
  parseKimiStreamJson,
  parseKimiVersion,
  classifyKimiUpstream,
  satisfiesVersionRange,
  detectKimiProtocolMismatch,
  KIMI_VERSION_RANGE,
} from './kimi'

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

  it('builds kimi-code args for kimi binary (never --print)', () => {
    const cmd = buildKimiCommand(undefined, 'kimi', 'kimi-code', 'do the thing')
    expect(cmd[0]).toBe('kimi')
    expect(cmd).toContain('--prompt')
    expect(cmd).toContain('do the thing')
    expect(cmd).toContain('--output-format')
    expect(cmd).toContain('stream-json')
    expect(cmd).not.toContain('--print')
  })

  it('kimi-code requires a prompt argument', () => {
    expect(() => buildKimiCommand(undefined, 'kimi', 'kimi-code')).toThrow('--prompt')
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

describe('parseKimiVersion', () => {
  it('parses kimi-code bare version output', () => {
    expect(parseKimiVersion('0.38.0')).toEqual({ version: '0.38.0', major: 0 })
  })

  it('parses kimi-cli self-report ("kimi, version 1.45.0")', () => {
    expect(parseKimiVersion('kimi, version 1.45.0')).toEqual({ version: '1.45.0', major: 1 })
  })

  it('returns null for unparseable output', () => {
    expect(parseKimiVersion('garbage')).toBeNull()
    expect(parseKimiVersion('')).toBeNull()
  })
})

describe('classifyKimiUpstream', () => {
  it('major 0 → kimi-code', () => {
    expect(classifyKimiUpstream(0)).toBe('kimi-code')
  })

  it('major 1 → kimi-cli', () => {
    expect(classifyKimiUpstream(1)).toBe('kimi-cli')
  })

  it('unknown majors fail closed', () => {
    expect(classifyKimiUpstream(2)).toBeNull()
    expect(classifyKimiUpstream(9)).toBeNull()
  })
})

describe('satisfiesVersionRange', () => {
  it('accepts in-range kimi-code and kimi-cli versions', () => {
    expect(satisfiesVersionRange('0.38.0', KIMI_VERSION_RANGE)).toBe(true)
    expect(satisfiesVersionRange('1.45.0', KIMI_VERSION_RANGE)).toBe(true)
  })

  it('rejects out-of-range versions', () => {
    expect(satisfiesVersionRange('2.0.0', KIMI_VERSION_RANGE)).toBe(false)
    expect(satisfiesVersionRange('0.10.0', KIMI_VERSION_RANGE)).toBe(false)
    expect(satisfiesVersionRange('9.9.9', KIMI_VERSION_RANGE)).toBe(false)
  })

  it('boundary values follow comparator semantics', () => {
    expect(satisfiesVersionRange('0.30.0', KIMI_VERSION_RANGE)).toBe(true)  // >= inclusive
    expect(satisfiesVersionRange('2.0.0', '>=0.30.0 <2.0.0')).toBe(false)  // < exclusive
    expect(satisfiesVersionRange('1.0.0', '>1.0.0')).toBe(false)
    expect(satisfiesVersionRange('1.0.1', '>1.0.0')).toBe(true)
    expect(satisfiesVersionRange('1.0.0', '<=1.0.0')).toBe(true)
  })
})

describe('parseKimiStreamJson — real kimi-code capture', () => {
  // Live capture from kimi-code 0.38.0: `kimi -p "Reply with exactly: PROBE_OK" --output-format stream-json`
  const kimiCodeCapture = [
    '{"role":"meta","type":"system.version","version":"0.38.0"}',
    '{"role":"assistant","content":"PROBE_OK"}',
    '{"role":"meta","type":"session.resume_hint","session_id":"session_x","command":"kimi -r session_x","content":"To resume this session: kimi -r session_x"}',
  ].join('\n')

  it('extracts assistant text and skips meta events', () => {
    const result = parseKimiStreamJson(kimiCodeCapture)
    expect(result.text).toBe('PROBE_OK')
    expect(result.events).toBe(3)
    expect(result.checkpoints).toEqual([])
  })
})

describe('detectKimiProtocolMismatch', () => {
  it('regression: kimi-code invoked with --print must NOT pass silently (the live bug)', () => {
    // Exact live capture: `kimi --print --output-format stream-json` → exit 1, empty stdout
    const msg = detectKimiProtocolMismatch({
      code: 1,
      rawStdout: '',
      stderr: "error: unknown option '--print'\n(Did you mean --prompt?)",
      events: 0,
    })
    expect(msg).not.toBeNull()
    expect(msg).toContain('code 1')
    expect(msg).toContain("unknown option '--print'")
  })

  it('exit 0 with non-JSON stdout → protocol mismatch', () => {
    const msg = detectKimiProtocolMismatch({
      code: 0,
      rawStdout: 'plain text that is not stream-json',
      stderr: '',
      events: 0,
    })
    expect(msg).not.toBeNull()
    expect(msg).toContain('no parseable stream-json events')
  })

  it('exit 0 with empty stdout → no-output error', () => {
    const msg = detectKimiProtocolMismatch({ code: 0, rawStdout: '', stderr: '', events: 0 })
    expect(msg).not.toBeNull()
    expect(msg).toContain('no output at all')
  })

  it('exit 0 with parsed events → OK', () => {
    const msg = detectKimiProtocolMismatch({
      code: 0,
      rawStdout: '{"role":"assistant","content":"hi"}',
      stderr: '',
      events: 1,
    })
    expect(msg).toBeNull()
  })
})
