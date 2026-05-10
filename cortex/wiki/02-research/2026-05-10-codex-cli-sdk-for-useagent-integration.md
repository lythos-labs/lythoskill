---
created: 2026-05-10
updated: 2026-05-10
category: research
---

# Codex CLI/SDK for useAgent Integration

> Research for adding `codex` as a player in lythoskill-arena / useAgent adapter.

## Headless execution: `codex exec`

Equivalent to `kimi -p` / `claude -p`:

```bash
codex exec --yolo --json --output-last-message output.md --ephemeral "prompt"
```

| flag | purpose |
|---|---|
| `--yolo` / `--full-auto` | Auto-approve all actions (required, no human present) |
| `--json` | JSONL streaming events to stdout |
| `--output-last-message <file>` | Capture final agent message |
| `--ephemeral` | Skip persisting session to disk |
| `--skip-git-repo-check` | Allow running outside git repos |
| `--sandbox <mode>` | workspace-write / filesystem-readonly / danger-full-access |
| `-` | Read prompt from stdin |

## TypeScript SDK

```typescript
import { Codex } from "@openai/codex-sdk";
const codex = new Codex({ apiKey: "..." });
const thread = codex.startThread({ model: "gpt-5.3-codex" });
const turn = await thread.run("Fix the race condition");
// or streaming:
for await (const event of thread.runStreamed("Add tests")) { ... }
```

## Python SDK

```python
from codex_sdk import Codex
codex = Codex()
thread = codex.start_thread()
turn = await thread.run("Diagnose the test failure")
```

## Config

`~/.codex/config.toml`:
```toml
model = "gpt-5.3-codex"
approval_policy = "never"  # required for headless
sandbox_mode = "workspace-write"
[features]
multi_agent = true
```

## Adapter pattern

```
Player: codex
  invoke: codex exec --yolo --json --ephemeral - < prompt.txt
  parse:  read JSONL from stdout, extract final message
  output: write to output.md

Player: codex-sdk
  invoke: thread.runStreamed(prompt)
  parse:  consume async iterator events
  output: final response text
```

CLI path is simpler and consistent with existing kimi/claude adapters. SDK path gives richer control (fork, resume, schema-constrained output).

## Models (2026-04)

| model | use |
|---|---|
| `gpt-5.3-codex` | Optimized for software engineering |
| `gpt-5.4` | Frontier reasoning |
| `gpt-5.4-mini` | Fast, for sub-agents |

## Next steps

1. Verify `codex exec --yolo` works locally (user confirmed codex installed)
2. Scaffold `@lythos/agent-adapter-codex` following existing adapter pattern
3. Register `codex` player in useAgent routing
4. Arena test: `arena single --deck scout --player codex --brief "..."`

## Sources

- [Codex CLI Cheatsheet](https://shipyard.build/blog/codex-cli-cheat-sheet/)
- [DeepWiki: Exec Mode](https://deepwiki.com/openai/codex/4.2-headless-execution-mode)
- [DeepWiki: TypeScript SDK](https://deepwiki.com/openai/codex/7.1-typescript-sdk)
- [OpenAI Codex Changelog](https://developers.openai.com/codex/changelog)
- [Codex CLI 完整使用指南](https://www.53ai.com/news/LargeLanguageModel/2026040719234.html)
