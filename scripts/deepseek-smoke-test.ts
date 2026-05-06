import { runAgentScenario } from '../packages/lythoskill-test-utils/src/agent-bdd'
import { useAgent } from '../packages/lythoskill-test-utils/src/agents'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'

const scenarioPath = join(import.meta.dir, '..', 'packages/lythoskill-deck/test/scenarios/deepseek-smoke.agent.md')

const result = await runAgentScenario({
  scenarioPath,
  agent: useAgent('deepseek'),
  async setupWorkdir(_scenario, workdir) {
    writeFileSync(join(workdir, 'skill-deck.toml'), '[deck]\nmax_cards = 10\n', 'utf-8')
  },
  baseDir: '/tmp/deepseek-smoke-test',
})

console.log('=== RESULT ===')
console.log('stdout:', result.agentResult.stdout.slice(0, 500))
console.log('stderr:', result.agentResult.stderr.slice(0, 300))
console.log('code:', result.agentResult.code)
console.log('duration:', result.agentResult.durationMs, 'ms')
console.log('checkpoints:', result.checkpoints.length)
if (result.verdict) {
  console.log('verdict:', result.verdict.verdict)
  console.log('reason:', result.verdict.reason?.slice(0, 300))
}
console.log('artifactDir:', result.artifactDir)
