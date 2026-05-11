import { describe, expect, it } from 'bun:test'
import { buildCodexCommand, parseCodexJsonl } from './index'

describe('buildCodexCommand', () => {
  it('builds codex exec args without shell wrapper', () => {
    const cmd = buildCodexCommand()
    expect(cmd[0]).toBe('codex')
    expect(cmd[1]).toBe('exec')
    expect(cmd).toContain('--json')
    expect(cmd).toContain('--ephemeral')
    expect(cmd).toContain('--skip-git-repo-check')
    expect(cmd).toContain('--ask-for-approval')
    expect(cmd).toContain('never')
    expect(cmd).toContain('--sandbox')
    expect(cmd).toContain('workspace-write')
    expect(cmd).toContain('-')
  })

  it('does not use shell (injection-safe)', () => {
    const cmd = buildCodexCommand()
    expect(cmd).not.toContain('sh')
    expect(cmd).not.toContain('-c')
  })
})

describe('parseCodexJsonl', () => {
  it('extracts text from item.completed agent_message', () => {
    const raw = [
      '{"type":"item.completed","item":{"type":"agent_message","content":[{"type":"output_text","text":"Hello Codex"}]}}',
    ].join('\n')
    expect(parseCodexJsonl(raw)).toBe('Hello Codex')
  })

  it('extracts text from thread.turn.completed', () => {
    const raw = [
      '{"type":"thread.turn.completed","turn":{"final_message":"Task done"}}',
    ].join('\n')
    expect(parseCodexJsonl(raw)).toBe('Task done')
  })

  it('concatenates multiple messages', () => {
    const raw = [
      '{"type":"item.completed","item":{"type":"agent_message","content":[{"type":"output_text","text":"A"}]}}',
      '{"type":"item.completed","item":{"type":"agent_message","content":[{"type":"output_text","text":"B"}]}}',
    ].join('\n')
    expect(parseCodexJsonl(raw)).toBe('A\nB')
  })

  it('skips non-message events', () => {
    const raw = [
      '{"type":"thread.started"}',
      '{"type":"item.completed","item":{"type":"agent_message","content":[{"type":"output_text","text":"valid"}]}}',
    ].join('\n')
    expect(parseCodexJsonl(raw)).toBe('valid')
  })

  it('skips malformed JSON lines', () => {
    const raw = [
      'garbage',
      '{"type":"item.completed","item":{"type":"agent_message","content":[{"type":"output_text","text":"ok"}]}}',
    ].join('\n')
    expect(parseCodexJsonl(raw)).toBe('ok')
  })

  it('returns empty for empty input', () => {
    expect(parseCodexJsonl('')).toBe('')
  })
})
