---
last_consolidated: 2026-05-28
sources:
  - cortex/adr/02-accepted/ADR-20260518024500631
  - cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md
  - cortex/wiki/01-patterns/2026-05-17-shell-stdout-as-agent-prompt-injection.md
  - cortex/wiki/04-ssot/architecture.md
  - AGENTS.md (Agent BDD section)
  - showcase/2026-05-18-bdd-reproduce-sh-smoke-test/reproduce.sh
zk_validated: false
---

# reproduce.sh -- Agent BDD Canonical Format

reproduce.sh replaces `.agent.md` as the canonical format for Agent BDD
scenarios. It is not a fully automated test script -- it is a **shell scaffold
+ IoC handoff**: shell handles deterministic steps, stdout acts as a
prompt-injection channel, and the agent takes over for intelligent steps.

## 1. Why .agent.md Failed -- Four Structural Defects

| # | Defect | Why it matters |
|---|--------|---------------|
| 1 | **Naming collision** | `.agent.md` vs `AGENTS.md` -- one character apart. Agents frequently read the wrong file. `parseAgentMd` regex silently failed on AGENTS.md content. |
| 2 | **Judge embedded in task** | `## Judge` section lived in the same file the task agent read. Agent knew the scoring rubric before executing -- structural self-appeal. Arena fixed this (ADR-20260514050300); BDD never caught up. |
| 3 | **Regex parsing fragility** | `parseAgentMd` extracted Given/When/Then/Judge via regex. Any markdown format change caused silent parse failure. Regex is not a parser. |
| 4 | **Non-executability** | Cannot `bash scenario.agent.md`. Every execution path goes through `bdd-runner.ts`, which itself depends on the fragile regex from defect 3. |

## 2. What reproduce.sh Is

```
                    reproduce.sh
+--------------------------------------------------+
| Step 1: cat > deck.toml           <- CLI (shell) |
| Step 2: prepare-workdir           <- CLI (shell) |
| Step 3: echo "<spawn subagent>"   <- IoC handoff |
| Step 4: archive                   <- CLI (shell) |
+--------------------------------------------------+
                          |
                          v (stdout)
              +-----------------------+
              | Agent reads stdout    |
              | Recognizes role marker|
              | Takes over reasoning  |
              | Produces artifacts    |
              +-----------------------+
```

**Shell** does what shell is good at: files, directories, deterministic CLI
commands. **Agent** does what agents are good at: reading intent, making
decisions, producing creative output. stdout is the boundary.

### Contract

| Aspect | Convention |
|--------|-----------|
| Location | `showcase/<date>-<name>/reproduce.sh` |
| Execution | `chmod +x`; `bash reproduce.sh` |
| Scaffold | Shell commands (heredoc, bunx CLI, mkdir) |
| Intelligent step | `echo "<spawn subagent to ...>"` with task description |
| Judge | External `judge.md` -- task agent NEVER sees it |
| Agent output | `decision-log.jsonl` (produced by agent during intelligent step) |
| Verdict | `judge-verdict.json` (produced by judge after agent completes) |
| Human run | Shell steps execute, echo prints, human stops at the gap |
| Agent run | Agent reads stdout, recognizes tag, takes over |

## 3. The `<spawn subagent>` Tag as Literal HATEOAS

The architecture SSOT states: "shell stdout IS a hypermedia document." This is
not metaphor -- it is HATEOAS at its most literal:

- Shell emits a hypermedia document (stdout text)
- Document contains a hypertext tag (`<spawn subagent>`)
- Agent (browser) reads the document, finds the tag, follows the "link"
- The link target is the task description following the tag
- Following means: cd to workdir, execute task, produce artifacts

No schema. No JSON envelope. No structured protocol. Angle brackets are
already an agent lexical convention (`<thinking>`, `<function_call>`) --
agents recognize them as instruction boundaries. The agent's training does the
parsing; no regex needed.

**This pattern was discovered, not designed.** On 2026-05-17, a subagent
spontaneously wrote `<spawn subagent>` in echo output. A different replay
agent understood it without any specification document. The pattern was latent
in the agent-shell relationship; it only needed to be named.

## 4. Control Transfer Protocol

The reproduce.sh IoC handoff is **Type 1 (Prompt Injection / Forward
Transfer)** in the Control Transfer Protocol:

```
User space   │  CLI      │  echo "<spawn subagent to ...>"
─────────────┼───────────┼─────────────────────────────────
Kernel space │  Agent    │  read stdout -> self-assign -> act
```

**OS analogue**: `SIGCHLD` -- parent notified when child finishes, takes next
action. CLI does not call the agent. It emits a description. The agent injects
itself as the handler.

All three interrupt types apply to reproduce.sh execution:

| Type | OS Analogue | reproduce.sh context |
|------|------------|---------------------|
| Type 1: Prompt Injection | SIGCHLD | Shell finishes scaffold, stdout triggers agent takeover |
| Type 2: HATEOAS Error | Page Fault | prepare-workdir fails -> stderr carries fix instructions |
| Type 3: Path Guard | SIGSEGV/MMU | Agent writes outside workdir -> guard rejects with context |

Why no structured framework (JSON, enum)? "Agents don't need ceremony. They
need executable context." Natural language in stdout is the most
token-efficient format for an LLM. Parsing a JSON envelope costs tokens
without adding information the agent cannot extract from prose.

## 5. Zero-Knowledge Verification

**2026-05-17 proof**: A subagent with zero prior project context executed
`bash reproduce.sh`, read stdout, and completed the full BDD scenario
(create + test + judge -> PASS) in 12 tool calls over 80 seconds.

Agent native language = shell echo, not markdown schema. reproduce.sh works
because it targets the agent's actual input channel (tool output text) rather
than an artificial intermediate format (parsed markdown). Agents don't need
you to parse the scenario for them -- they need executable context.

ZK validation is built into the execution model: every reproduce.sh run IS a
zero-knowledge test. If a fresh agent cannot complete the scenario from stdout
instructions alone, the reproduce.sh is incomplete. This aligns with the
project's ZK Validation Pattern (AGENTS.md): spawn zero-knowledge subagents to
verify documents; for important docs, cross-model validate with `arena single
--player kimi`.

## 6. Relationship to Arena

reproduce.sh is arena's execution substrate:

```
arena (orchestrator)
  ├─> prepare-workdir    (shell: creates /tmp/arena-*/ with deck)
  ├─> spawn subagent     (reads reproduce.sh stdout, executes task)
  ├─> archive            (shell: copies artifacts to permanent location)
  └─> judge              (external criteria, agent NEVER sees during task)
```

Arena does not replace reproduce.sh -- it composes it. Arena adds multi-deck
comparison and structured verdict collection. reproduce.sh provides the
single-scenario execution contract. Both use the same IoC handoff: shell
scaffold -> stdout prompt injection -> agent takeover.

`arena single` flow: prepare-workdir -> spawn -> archive -> judge -> restore
parent deck. `arena vs` flow: same per side, then judge compares outputs. The
reproduce.sh pattern is what makes both flows agent-orchestrated by default
with zero working-set pollution.

## 7. Concrete Example

From `showcase/2026-05-18-bdd-reproduce-sh-smoke-test/reproduce.sh` (abridged
to show the IoC structure):

```bash
#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR="/tmp/reproduce-bdd-demo-$(date +%Y%m%d-%H%M%S)"

# === Step 1-2: Shell scaffold ===
cat > "$SCRIPT_DIR/test-deck.toml" << 'DECKEOF'
[deck]
max_cards = 3
DECKEOF

bunx @lythos/skill-arena prepare-workdir \
  --deck "$SCRIPT_DIR/test-deck.toml" \
  --out "$WORKDIR" \
  --brief "Create greet.ts + greet.test.ts + run bun test -> write result.txt"

# === Step 3: IoC handoff ===
echo "  cd $WORKDIR"
echo "  <spawn subagent>"
echo "  Task: Create greet.ts, greet.test.ts, run bun test, write result.txt"
echo "  MANDATORY: write decision-log.jsonl to CWD"

# === Step 4-5: Judge + archive (shell resumes) ===
echo "  Verify against $SCRIPT_DIR/judge.md"
bunx @lythos/skill-arena archive --from "$WORKDIR" --to "$SCRIPT_DIR/run-output"
```

**Agent execution**: bash reproduce.sh -> Steps 1-2 complete -> reads stdout
-> sees `<spawn subagent>` -> self-assigns role -> cd to workdir -> creates
files, runs tests, writes decision-log.jsonl -> judge + archive follow.

**Human execution**: bash reproduce.sh -> Steps 1-2 complete -> sees echo text
-> stops. The gap IS the protocol. The script is intentionally incomplete.

## 8. File Layout

```
showcase/<date>-<name>/
  reproduce.sh          # scaffold + IoC handoff (canonical file)
  README.md             # human-readable description + verdict checklist
  judge.md              # scoring criteria (agent NEVER reads during task)
  test-deck.toml        # deck for the scenario (optional, can be inline)
  decision-log.jsonl    # agent reasoning log (produced in Step 3)
  judge-verdict.json    # judge output (produced after agent completes)
  run-output/           # archived artifacts (produced by archive step)
```

## 9. Migration from .agent.md

| .agent.md (deprecated) | reproduce.sh (canonical) |
|------------------------|--------------------------|
| `## Given` markdown | Shell heredoc / CLI commands |
| `## When` markdown | `echo` with task description |
| `## Then` + `## Judge` | External `judge.md` |
| Parsed by `parseAgentMd` regex | Read natively from stdout |
| Requires `bdd-runner.ts` | `bash reproduce.sh` |
| Naming collides with AGENTS.md | No collision |
| Agent reads own rubric | Agent blind to judge criteria |

Existing `.agent.md` scenarios continue via `parseAgentMd`. New scenarios use
reproduce.sh. Migration is opportunistic -- when an `.agent.md` scenario needs
maintenance, migrate it to reproduce.sh as part of the change.

## 10. Design Principles

1. **Target the agent's actual input channel.** Agents read tool output
   (stdout). reproduce.sh writes to that channel. No parser, no schema.
2. **Shell for determinism, agent for intelligence.** Shell cannot write
   TypeScript. Agents cannot run deterministic pipelines reliably. The
   boundary is where each side's capability ends.
3. **Discovered, not designed.** The first reproduce.sh was written by a
   subagent that intuited the pattern. Replay agent understood it without
   documentation. Named, not invented.
4. **Judge separation is non-negotiable.** Task agent must never see scoring
   criteria. Self-appeal is circular reasoning. Arena proved this; reproduce.sh
   inherits it.
5. **ZK validation is built in.** Every reproduce.sh run IS a zero-knowledge
   test. Fresh agent failure = incomplete reproduce.sh.

## Related

- ADR-20260518024500631 -- reproduce.sh pattern acceptance
- ADR-20260514050300 -- arena judge criteria separation (same problem class)
- `cortex/wiki/01-patterns/2026-05-17-shell-stdout-as-agent-prompt-injection.md`
- `cortex/wiki/01-patterns/2026-05-17-control-transfer-protocol-cli-agent-boundary-as-interrupt-vector-table.md`
- `cortex/wiki/04-ssot/architecture.md` -- HATEOAS and reproduce.sh in system context
- `AGENTS.md` -- Agent BDD section, ZK validation pattern
- `showcase/2026-05-18-bdd-reproduce-sh-smoke-test/reproduce.sh` -- canonical example
