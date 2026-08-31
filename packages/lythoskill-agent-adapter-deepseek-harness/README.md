# @lythos/agent-adapter-deepseek-harness

DeepSeek Harness (`dsh`) headless player adapter for lythoskill arena.

Thin subprocess wrap of the official `headless` profile — no daemon, no port, no
persistent state (contrast with `@lythos/agent-adapter-deepseek-serve`, which
manages a `deepseek serve --http` daemon lifecycle).

## Upstream support (ADR-20260828004129233 Option B)

| Player | Upstream binary | Supported versions | Status |
|---|---|---|---|
| `deepseek-harness` | `dsh` | `>=0.1.0 <1.0.0` (developer preview, 0.1.0-rc.x) | active — fail-closed probe |

dsh is in developer preview with officially announced compatibility-breaking
changes, so the range is pinned to the 0.1.x line. Out-of-range or unknown
upstreams get a loud HATEOAS error at spawn time, never a silent run.

## Prerequisites

- **Node.js ≥ 22.19** (dsh runs on Node; this adapter only shells out, so the
  lythoskill side needs nothing beyond Bun)
- **dsh installed**: `npm i -g @deepseek-ai/dsh` — see
  <https://github.com/deepseek-ai/deepseek-harness>
- **`DEEPSEEK_API_KEY`** in the environment (or dsh's own credential layers:
  `$DSH_HOME/.credentials.yaml`, `.env`)

## Contract

```
dsh --profile headless "<task>"
```

- One fresh persisted Agent; the task is the positional argument.
- Final assistant text on **stdout**, reasoning deltas on **stderr**.
- Exit `0` on `completed`, else `1` — a non-zero exit is a legitimate
  "turn did not complete" signal and is passed through in `code`, not thrown.
- No HTTP server, no listening port. The invoking directory is the workspace
  root with the default `workspace-write` permission preset, so arena's
  temp-dir cells fit exactly.

## Known gaps

- `checkpoints[]` is always empty — headless exposes only reasoning deltas and
  the final text (the durable JSONL session could be parsed post-hoc if needed).
- `modelTier` is accepted and ignored — model selection lives in dsh profile
  config layers, not CLI flags.
- `invokeTool` is not implemented.

## Usage

```bash
bunx @lythos/skill-arena single \
  --deck ./skill-deck.toml \
  --brief "Investigate this repo" \
  --player deepseek-harness
```

Or programmatically:

```ts
import '@lythos/agent-adapter-deepseek-harness'
import { useAgent } from '@lythos/agent-adapter'

const agent = useAgent('deepseek-harness')
const result = await agent.spawn({ cwd, brief, timeoutMs: 120_000 })
```

Background: `cortex/wiki/02-research/2026-08-29-deepseek-harness-integration-survey.md`.
