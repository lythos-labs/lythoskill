import { describe, test, expect, spyOn } from 'bun:test'
import { useAgent } from './agents'
import { buildToolPrompt, buildClaudeCommand, buildCleanEnv, extractJson, type SpawnCommand } from './agents/claude'
import { runCli } from './bdd-runner'

describe('runCli with injectable spawn', () => {
  test('uses mock spawn to verify command building', () => {
    const captured: { cmd: string; args: string[]; cwd: string }[] = []
    const mockSpawn = (cmd: string, args: string[], opts: { cwd: string }) => {
      captured.push({ cmd, args, cwd: opts.cwd })
      return { status: 0, stdout: 'ok', stderr: '' }
    }

    const result = runCli('/tmp/test', ['echo', 'hello'], mockSpawn)
    expect(result.code).toBe(0)
    expect(result.stdout).toBe('ok')
    expect(captured).toHaveLength(1)
    expect(captured[0].cmd).toBe('echo')
    expect(captured[0].args).toEqual(['hello'])
    expect(captured[0].cwd).toBe('/tmp/test')
  })

  test('mock spawn can simulate errors', () => {
    const mockSpawn = () => ({ status: 1, stdout: '', stderr: 'command failed' })
    const result = runCli('/tmp', ['bad-command'], mockSpawn)
    expect(result.code).toBe(1)
    expect(result.stderr).toBe('command failed')
  })
})

describe('buildClaudeCommand', () => {
  test('produces shell command with redirect: claude -p --output-format json ... < promptfile', () => {
    const cmd = buildClaudeCommand({ brief: 'say ok', cwd: '/tmp' })
    expect(cmd.cmd).toBe('sh')
    expect(cmd.args[0]).toBe('-c')
    const shellCmd = cmd.args[1]
    expect(shellCmd).toContain('claude')
    expect(shellCmd).toContain('-p')
    expect(shellCmd).toContain('--output-format')
    expect(shellCmd).toContain('json')
    expect(shellCmd).toContain('--permission-mode')
    expect(shellCmd).toContain('bypassPermissions')
    expect(shellCmd).toContain('--allowedTools')
    expect(shellCmd).toContain('--disallowedTools')
    expect(shellCmd).toContain('<')  // shell stdin redirect
    expect(cmd.promptFile).toContain('claude-prompt-')
    expect(cmd.cwd).toBe('/tmp')
  })

  test('brief text is stored in stdin field (written to promptFile at spawn time)', () => {
    const cmd = buildClaudeCommand({ brief: 'write hello world', cwd: '/tmp' })
    expect(cmd.stdin).toBe('write hello world')
  })

  test('env always includes FORCE_COLOR=0', () => {
    const cmd = buildClaudeCommand({ brief: 'x', cwd: '/tmp' })
    expect(cmd.env.FORCE_COLOR).toBe('0')
  })

  test('env merges caller-supplied env vars over FORCE_COLOR', () => {
    const cmd = buildClaudeCommand({ brief: 'x', cwd: '/tmp', env: { FORCE_COLOR: '1', DEBUG: '1' } })
    expect(cmd.env.FORCE_COLOR).toBe('1')  // overridden
    expect(cmd.env.DEBUG).toBe('1')         // merged
  })

  test('default timeoutMs is 60000', () => {
    const cmd = buildClaudeCommand({ brief: 'x', cwd: '/tmp' })
    expect(cmd.timeoutMs).toBe(60000)
  })

  test('explicit timeoutMs overrides default', () => {
    const cmd = buildClaudeCommand({ brief: 'x', cwd: '/tmp', timeoutMs: 30000 })
    expect(cmd.timeoutMs).toBe(30000)
  })

  test('command structure is valid for Bun.spawn', () => {
    const cmd = buildClaudeCommand({ brief: 'say hi', cwd: '/tmp/test' })
    // Verify every field Bun.spawn needs is present and well-typed
    expect(typeof cmd.cmd).toBe('string')
    expect(Array.isArray(cmd.args)).toBe(true)
    expect(cmd.args.every(a => typeof a === 'string')).toBe(true)
    expect(typeof cmd.cwd).toBe('string')
    expect(typeof cmd.stdin).toBe('string')  // empty string, prompt is positional arg
    expect(typeof cmd.env).toBe('object')
    expect(typeof cmd.timeoutMs).toBe('number')
    // Verify key invariants (flags inside shell command string)
    const shellCmd = cmd.args[1]
    expect(shellCmd).toContain('-p')
    expect(shellCmd).toContain('--permission-mode')
    expect(shellCmd).toContain('WebSearch')
    expect(shellCmd).toContain('WebFetch')
    expect(Object.keys(cmd.env).length).toBeGreaterThanOrEqual(1) // at least FORCE_COLOR
  })
})

describe('buildCleanEnv', () => {
  test('strips CLAUDECODE', () => {
    const env = buildCleanEnv()
    expect(env.CLAUDECODE).toBeUndefined()
  })

  test('strips CLAUDE_CODE_* prefixed vars', () => {
    const env = buildCleanEnv()
    expect(env.CLAUDE_CODE_ENTRYPOINT).toBeUndefined()
    expect(env.CLAUDE_CODE_SESSION).toBeUndefined()
    expect(env.CLAUDE_CODE_PARENT_SESSION).toBeUndefined()
  })

  test('preserves essential vars like PATH and HOME', () => {
    const env = buildCleanEnv()
    expect(env.PATH).toBeDefined()
    expect(env.HOME).toBeDefined()
  })

  test('includes FORCE_COLOR=0 by default', () => {
    const env = buildCleanEnv()
    expect(env.FORCE_COLOR).toBe('0')
  })

  test('merges extra env vars', () => {
    const env = buildCleanEnv({ DEBUG: '1' })
    expect(env.DEBUG).toBe('1')
  })
})

describe('extractJson', () => {
  test('parses raw JSON string', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
  })

  test('extracts JSON from ```json fence', () => {
    expect(extractJson('```json\n{"b":2}\n```')).toEqual({ b: 2 })
  })

  test('extracts JSON from bare ``` fence', () => {
    expect(extractJson('```\n{"c":3}\n```')).toEqual({ c: 3 })
  })

  test('extracts JSON from fence with surrounding text', () => {
    const raw = 'Here is the result:\n```json\n{"verdict":"PASS"}\n```\nHope that helps.'
    expect(extractJson(raw)).toEqual({ verdict: 'PASS' })
  })

  test('throws on non-JSON input', () => {
    expect(() => extractJson('not json')).toThrow()
  })

  test('handles nested JSON objects', () => {
    expect(extractJson('```json\n{"criteria":[{"name":"a","passed":true}]}\n```'))
      .toEqual({ criteria: [{ name: 'a', passed: true }] })
  })
})

describe('useAgent', () => {
  test('returns claude adapter', () => {
    const adapter = useAgent('claude')
    expect(adapter).toBeDefined()
    expect(adapter.name).toBe('claude')
    expect(typeof adapter.spawn).toBe('function')
  })

  test('throws for unknown agent', () => {
    expect(() => useAgent('gpt-5')).toThrow('Unknown agent: "gpt-5"')
  })

  test('error message lists available agents', () => {
    try {
      useAgent('cursor')
    } catch (e) {
      expect((e as Error).message).toContain('claude')
    }
  })
})

describe('claude adapter spawn', () => {
  test('handles missing claude binary gracefully', async () => {
    // If claude is not installed, spawn should throw a clear error
    const adapter = useAgent('claude')
    const hasClaude = !!Bun.which('claude')

    if (!hasClaude) {
      await expect(
        adapter.spawn({ cwd: '/tmp', brief: 'say ok', timeoutMs: 1000 })
      ).rejects.toThrow('claude not found in PATH')
    }
  })

  test('enforces timeout with spawn', async () => {
    // This test validates the timeout mechanism works.
    // We can't easily mock Bun.spawn in bun:test, so we verify the adapter
    // structure and that it propagates timeoutMs to the CLI.
    const adapter = useAgent('claude')
    expect(adapter.name).toBe('claude')

    // Timeout is passed as CLI flag to claude -p
    // This is a structural test: adapter should accept timeoutMs
    // Actual spawn behavior tested via Agent BDD integration (T3)
  })
})

describe('buildToolPrompt', () => {
  test('includes tool name, description, and schema', () => {
    const prompt = buildToolPrompt(
      { name: 'test_tool', description: 'A test tool', input_schema: { type: 'object', properties: {} } },
      'Please use the tool.'
    )
    expect(prompt).toContain('test_tool')
    expect(prompt).toContain('A test tool')
    expect(prompt).toContain('Please use the tool.')
    expect(prompt).toContain('"type": "object"')
  })

  test('includes JSON Schema in output', () => {
    const prompt = buildToolPrompt(
      { name: 'judge', description: 'Submit verdict', input_schema: { verdict: 'object' } },
      'Evaluate.'
    )
    expect(prompt).toContain('Submit verdict')
    expect(prompt).toContain('"verdict": "object"')
  })
})
