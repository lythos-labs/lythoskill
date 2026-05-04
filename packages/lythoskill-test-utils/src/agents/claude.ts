import type { AgentAdapter, AgentRunResult, ToolDefinition } from './types'
import { readCheckpoints } from '../bdd-runner'

function buildToolPrompt(tool: ToolDefinition, prompt: string): string {
  const schemaJson = JSON.stringify(tool.input_schema, null, 2)
  const fence = '```'
  return [
    prompt,
    '',
    '## Tool: ' + tool.name,
    tool.description,
    '',
    '## Output Schema',
    'You MUST respond with a single JSON object matching this schema exactly.',
    'Wrap your JSON in a ' + fence + 'json fence.',
    '',
    'Schema:',
    fence + 'json',
    schemaJson,
    fence,
    '',
    'Return ONLY the JSON object (in a ' + fence + 'json fence), no other text.',
  ].join('\n')
}

export const claudeAdapter: AgentAdapter = {
  name: 'claude',

  async spawn(opts): Promise<AgentRunResult> {
    const { cwd, brief, timeoutMs = 60000, env = {} } = opts

    if (!Bun.which('claude')) {
      throw new Error('claude not found in PATH')
    }

    const start = Date.now()

    const proc = Bun.spawn(['claude', '-p', '--dangerously-skip-permissions'], {
      cwd,
      stdin: new TextEncoder().encode(brief),
      env: { ...process.env, FORCE_COLOR: '0', ...env },
    })

    const timeout = setTimeout(() => proc.kill(), timeoutMs)

    await proc.exited
    clearTimeout(timeout)

    const durationMs = Date.now() - start
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    const code = proc.exitCode ?? 1

    const checkpoints = readCheckpoints(cwd)

    return { stdout, stderr, code, durationMs, checkpoints }
  },

  async invokeTool(opts): Promise<unknown> {
    const { tool, prompt, cwd, timeoutMs = 60000 } = opts
    const toolPrompt = buildToolPrompt(tool, prompt)

    const result = await this.spawn({ cwd, brief: toolPrompt, timeoutMs })

    // Extract JSON from markdown fence or raw output
    const fenceMatch = result.stdout.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    const jsonStr = fenceMatch ? fenceMatch[1].trim() : result.stdout.trim()

    return JSON.parse(jsonStr)
  },
}
