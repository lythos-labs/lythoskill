import { describe, expect, test } from 'bun:test'
import { buildToolPrompt, extractJson, buildClaudeCommand, DEFAULT_ALLOWED_TOOLS, DEFAULT_DISALLOWED_TOOLS } from './claude-cli.js'

// ── buildToolPrompt ─────────────────────────────────────────────

describe('buildToolPrompt', () => {
  test('includes tool name and description', () => {
    const result = buildToolPrompt(
      { name: 'search', description: 'Search the web', input_schema: { type: 'object', properties: {} } },
      'Do the thing',
    )
    expect(result).toContain('Do the thing')
    expect(result).toContain('## Tool: search')
    expect(result).toContain('Search the web')
  })

  test('includes JSON schema in code fence', () => {
    const result = buildToolPrompt(
      { name: 'calc', description: 'Calculate', input_schema: { type: 'object', properties: { expr: { type: 'string' } } } },
      'Compute',
    )
    expect(result).toContain('```json')
    expect(result).toContain('"expr"')
    expect(result).toContain('```')
  })

  test('ends with return-only-JSON instruction', () => {
    const result = buildToolPrompt(
      { name: 'x', description: 'x', input_schema: {} },
      'prompt',
    )
    expect(result).toContain('Return ONLY the JSON object')
  })
})

// ── extractJson ─────────────────────────────────────────────────

describe('extractJson', () => {
  test('extracts JSON from code fence', () => {
    const result = extractJson('```json\n{"key":"value"}\n```')
    expect(result).toEqual({ key: 'value' })
  })

  test('extracts JSON without code fence', () => {
    const result = extractJson('{"key":"value"}')
    expect(result).toEqual({ key: 'value' })
  })

  test('extracts nested JSON', () => {
    const result = extractJson('```json\n{"nested":{"deep":true}}\n```')
    expect(result).toEqual({ nested: { deep: true } })
  })

  test('handles text before and after code fence', () => {
    const result = extractJson('Here is the result:\n```json\n{"a":1}\n```\nHope that helps!')
    expect(result).toEqual({ a: 1 })
  })

  test('throws on invalid JSON', () => {
    expect(() => extractJson('not json')).toThrow()
    expect(() => extractJson('```json\nnot json\n```')).toThrow()
  })
})

// ── buildClaudeCommand ──────────────────────────────────────────

describe('buildClaudeCommand', () => {
  test('uses sh -c with correct claude CLI flags', () => {
    const cmd = buildClaudeCommand({ brief: 'test', cwd: '/tmp' })
    expect(cmd.cmd).toBe('sh')
    expect(cmd.args[0]).toBe('-c')
    expect(cmd.args[1]).toContain('claude -p')
    expect(cmd.args[1]).toContain('--output-format json')
    expect(cmd.args[1]).toContain('--permission-mode bypassPermissions')
  })

  test('includes allowed and disallowed tools', () => {
    const cmd = buildClaudeCommand({ brief: 'test', cwd: '/tmp' })
    expect(cmd.args[1]).toContain(DEFAULT_ALLOWED_TOOLS)
    expect(cmd.args[1]).toContain(DEFAULT_DISALLOWED_TOOLS)
  })

  test('custom tool lists override defaults', () => {
    const cmd = buildClaudeCommand({
      brief: 'test', cwd: '/tmp',
      allowedTools: 'Read,Write',
      disallowedTools: 'Bash(rm *)',
    })
    expect(cmd.args[1]).toContain('Read,Write')
    expect(cmd.args[1]).not.toContain(DEFAULT_ALLOWED_TOOLS)
  })

  test('modelTier: fast → --model haiku', () => {
    const cmd = buildClaudeCommand({ brief: 'test', cwd: '/tmp', modelTier: 'fast' })
    expect(cmd.args[1]).toContain('--model haiku')
  })

  test('modelTier: deep → --model opus', () => {
    const cmd = buildClaudeCommand({ brief: 'test', cwd: '/tmp', modelTier: 'deep' })
    expect(cmd.args[1]).toContain('--model opus')
  })

  test('modelTier: balanced (default) → no model flag', () => {
    const cmd = buildClaudeCommand({ brief: 'test', cwd: '/tmp' })
    expect(cmd.args[1]).not.toContain('--model')
  })

  test('promptFile is a temp file path', () => {
    const cmd = buildClaudeCommand({ brief: 'test', cwd: '/tmp' })
    expect(cmd.promptFile).toContain('claude-prompt-')
    expect(cmd.promptFile).toContain('.txt')
  })

  test('stdin contains the brief prompt', () => {
    const cmd = buildClaudeCommand({ brief: 'do the task', cwd: '/tmp' })
    expect(cmd.stdin).toBe('do the task')
  })

  test('shell command redirects from prompt file', () => {
    const cmd = buildClaudeCommand({ brief: 'test', cwd: '/tmp' })
    expect(cmd.args[1]).toContain('<')
    expect(cmd.args[1]).toContain(cmd.promptFile)
  })
})
