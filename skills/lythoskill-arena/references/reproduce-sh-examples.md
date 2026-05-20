# reproduce.sh Examples

> Real reproduce.sh files from lythoskill's own test suite and showcase.
> Contract spec: [reproduce-sh-bdd-contract.md](./reproduce-sh-bdd-contract.md)

## Example 1: Minimal IoC — arena-single-task-bdd

Source: `packages/lythoskill-arena/test/scenarios/arena-single-task-bdd/reproduce.sh`

```bash
#!/bin/bash
set -e

TEST_DIR="/tmp/arena-single-bdd-$(date +%Y%m%d-%H%M%S)"
WORKDIR="$TEST_DIR/work"

echo "=== Step 1: Create test environment ==="
mkdir -p "$WORKDIR"

echo "=== Step 2: No deck needed — minimal arena single task ==="
echo "  Workdir ready: $WORKDIR"

echo "=== Step 3: Agent executes task (IoC handoff) ==="
echo "  cd $WORKDIR"
echo "  <spawn subagent>"
echo "  IoContract: all commands idempotent. Exit 0 = success."
echo "  Task:"
echo "    1. Create greet.ts ..."
echo "    2. Create greet.test.ts ..."
echo "    3. Run 'bun test' and write pass/fail summary to result.txt"
echo "    4. MANDATORY: write decision-log.jsonl to CWD"

echo "=== Step 4: Judge verification ==="
echo "  Verify against judge.md"
echo "  Write judge-verdict.json to $WORKDIR"
```

**Pattern**: Pure shell scaffold. Steps 1-2 are real shell commands. Step 3 uses `echo` as IoC prompt injection — the `<spawn subagent>` marker tells the agent to take over. No external tools needed, not even arena CLI. Good for testing a skill in isolation.

**Key design decisions**:
- `set -e` — fail fast, agent can diagnose
- timestamped workdir — idempotent (every run is a fresh directory)
- MANDATORY uppercase — emphasizes non-negotiable requirements

---

## Example 2: Arena Single — zero-knowledge-arena-e2e

Source: `showcase/2026-05-17-zero-knowledge-arena-e2e/reproduce.sh`

```bash
#!/bin/bash
set -e

DECK="/tmp/test-deck.toml"
WORKDIR="/tmp/arena-20260517-single-frontend"

echo "=== Step 1: Create test deck ==="
cat > "$DECK" << 'DECKEOF'
[deck]
max_cards = 5
cold_pool = "~/.agents/skill-repos"
working_set = ".claude/skills"

[tool.skills.frontend-design]
path = "github.com/anthropics/skills/skills/frontend-design"
DECKEOF

echo "=== Step 2: prepare-workdir ==="
bunx @lythos/skill-arena prepare-workdir \
  --deck "$DECK" \
  --out "$WORKDIR" \
  --brief "Generate a 'Subscribe' button HTML component"

echo "=== Step 3: Agent executes task ==="
echo "  cd $WORKDIR && <spawn subagent to create artifacts + decision-log.jsonl>"

echo "=== Step 4: archive ==="
bunx @lythos/skill-arena archive \
  --from "$WORKDIR" \
  --to ./playground/arena-20260517-single-frontend \
  --sides side-a
```

**Pattern**: Full arena single-deck pipeline. Uses arena CLI for prepare-workdir + archive, with agent-in-the-middle for the actual task execution. The heredoc creates a deck inline — no file dependency.

**Key design decisions**:
- Deck is created inline (heredoc) — fully self-contained
- `prepare-workdir` handles skill linking + working set setup
- `archive` preserves the run for later inspection
- Agent only needs to handle Step 3 (the task itself)

---

## Example 3: Arena vs — seed-bootstrap A/B

Source: `showcase/2026-05-15-arena-vs-seed-bootstrap-free-form-vs-baoyu-standardized/reproduce.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="/tmp/arena-vs-reproduce-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$RUN_DIR/free-form" "$RUN_DIR/baoyu"

# Side A: Free Form — agent discovers skills autonomously
cat > "$RUN_DIR/free-form/skill-deck.toml" << 'EOF'
[deck]
max_cards = 8
cold_pool = "~/.agents/skill-repos"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
EOF

cat > "$RUN_DIR/free-form/AGENTS.md" << 'EOF'
# Arena Seed — Free Form
You have only lythoskill-deck. Complete the task.
You are free to discover and add any skills from the cold pool.
EOF

# Side B: Baoyu Standardized — agent follows prescribed methodology
cat > "$RUN_DIR/baoyu/skill-deck.toml" << 'EOF'
[deck]
max_cards = 8
cold_pool = "~/.agents/skill-repos"

[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
EOF

cat > "$RUN_DIR/baoyu/AGENTS.md" << 'EOF'
# Arena Seed — Baoyu Standardized
CRITICAL: Before starting, research baoyu-skills methodology.
Study Type × Style × Palette, then apply standardized approach.
EOF
```

**Pattern**: Arena vs comparison with seed bootstrap. Two identical minimal decks, differentiated only by AGENTS.md instructions. Tests whether the methodology (baoyu standardized) beats free-form exploration.

**Key design decisions**:
- Both sides start from identical decks — controls for deck composition
- The variable under test is the AGENTS.md instructions (methodology)
- Seed bootstrap pattern: lythoskill-deck innate → agent self-expands
- `set -euo pipefail` — strictest bash mode for production scenarios

---

## Common Patterns Across All reproduce.sh

1. **Idempotent by timestamp** — every run creates a fresh directory with `$(date ...)`
2. **Shell scaffold + IoC handoff** — non-agent steps are real shell commands; agent steps are echo-based instruction injection
3. **Inline deck creation** — heredocs keep the script self-contained
4. **Exit code semantics** — `set -e` means any failure stops; agent can retry
5. **`<spawn subagent>` marker** — the universal "agent takes over here" signal
6. **agent-only replay** — humans see echo lines; agents recognize the IoC contract

## When to Use Each Pattern

| Scenario | Pattern | Example |
|----------|---------|---------|
| Testing a single skill | Minimal IoC (Example 1) | arena-single-task-bdd |
| Full single-deck arena | prepare-workdir + archive (Example 2) | zero-knowledge-arena-e2e |
| Comparing methodologies | Seed bootstrap A/B (Example 3) | arena-vs-seed-bootstrap |
| Testing CLI behavior | Shell commands only, no agent step | curator-find-bdd |
