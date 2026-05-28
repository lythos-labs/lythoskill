---
last_consolidated: 2026-05-28
sources: ["daily/2026-05-28.md", "AGENTS.md", "cortex/wiki/04-ssot/*", "memory/MEMORY.md"]
zk_validated: false
---

# Agent Onboarding Guide — Getting Started in Action

> Not a reference. A mental model. Read this first, then dive into the SSOTs.

## 0. Before You Read Anything

You are about to enter a project with 1000+ commits, 81 ADRs, 54 wiki patterns, 25 dailies. **Do not scan.** The project has pre-built indexes specifically because raw scan → fabricate is the #1 failure mode.

Your reading order:
1. This guide (5 min) — mental model
2. `AGENTS.md` Index table (2 min) — what exists, where to find it
3. `weekly/` latest 2 files (5 min) — what happened recently
4. `cortex/wiki/04-ssot/key-decisions.md` § ZK Agent Alert (2 min) — what not to break
5. Now you can start working

## 1. What Is This Project?

lythoskill is a **governance layer** for AI agent skills. Not a skill collection. Not a marketplace. Not an orchestrator.

The core idea: you declare which skills are active in `skill-deck.toml`. Undeclared skills are physically absent from the agent's view. This is deny-by-default — the same principle as a firewall.

Three pillars operate on this foundation:
- **Deck** — declare + reconcile (govern)
- **Arena** — test + compare (validate)
- **Curator** — scan + index + tag (discover)

Your own `skill-deck.toml` (the one in this repo) has 14 skills and 2 combos. Read it to understand what tools are available.

## 2. The Architecture (One Paragraph)

Cold pool stores all skills (like `node_modules/`). Working set exposes only declared ones (like what `package.json` activates). Deck link reconciles the two. There is no central orchestrator — coordination is distributed by weight: combo prompts (light, declarative), SKILL.md (medium, agent-facing), CLI (heavy, deterministic). The agent IS the orchestrator. CLI output follows HATEOAS: errors tell the agent WHAT next, not just WHAT went wrong. Shell stdout IS a hypermedia document.

## 3. Your First 10 Minutes

```bash
# 1. Verify you're in the right place
git status && git log --oneline -5

# 2. Check deck health
bun packages/lythoskill-deck/src/cli.ts validate --deck skill-deck.toml

# 3. Check governance state
bun packages/lythoskill-project-cortex/src/cli.ts probe

# 4. Read the latest daily
cat daily/$(ls daily/ | sort | tail -1)
```

## 4. How Work Gets Done

**Task lifecycle**: `cortex task "title"` → backlog → start → work → commit with `Closes: TASK-xxx` trailer → post-commit hook auto-moves to completed.

**Deck validate before done**: every new/modified deck example must pass `deck validate --deck <path>`.

**Command shorthand**: in AGENTS.md prose, `deck link` is acceptable. In site code blocks, must be `bunx @lythos/skill-deck link`. In-repo dev: `bun packages/lythoskill-deck/src/cli.ts link`.

**ZK validation for docs**: if you produce documentation, spawn a zero-knowledge subagent to read it and self-report understanding. Misunderstood sections = need revision. For critical docs, escalate to cross-model validation (`arena single --player kimi`).

**Weekly prep**: never write a weekly from memory. Gather (daily + git + cortex + ADR timeline) → surface anomalies → simulated-annealing ranking → prep report → user confirms → write → ZK verify (≥2 passes).

## 5. What NOT to Break (Read key-decisions.md § ZK Agent Alert)

Four things that look like bugs but are deliberate design:

| If you see... | Don't |
|---------------|-------|
| `workspace:*` in source, `^0.15.4` on npm | Don't "fix" `workspace:*` — publish.sh rewrites at publish time |
| `working_set` in deck.toml (not `skills`) | Don't rename — it was tried and reverted (collided with build output) |
| `skills/` directory committed to git | Don't gitignore — it's committed build output, not cache |
| `bun packages/.../cli.ts` instead of `bunx` | Don't replace — in-repo dev uses source; external users use `bunx` |

Also: don't resurrect rejected components from git history. 3 build-then-reject cycles (feed-adapters, allowed-tools, leetcode-harness) were deliberate kills.

## 6. The SSOT Suite (Your Reference Layer)

| Document | Read when... |
|----------|-------------|
| `architecture.md` | You need to understand how the system fits together |
| `key-decisions.md` | You're about to change something and need to know if it was already decided |
| `conventions.md` | You're about to write code/docs and need to know the rules |
| `pitfalls.md` | Something went wrong and you need to know if it's a known failure mode |
| `reproduce-sh-bdd.md` | You're working with arena or BDD scenarios |

## 7. Key Cognitive Shifts (Don't Bring These Assumptions)

- **There is no orchestrator.** If you're looking for a centralized controller, stop. Distribution by weight.
- **The CLI is not for humans.** CLI output targets agents. HATEOAS tells the agent what's next.
- **Deny-by-default is not preference.** It's learned from damage (May 7, 2026: agent without deck context wrote 30+ rounds of unrequested debugging).
- **Fork over compose.** Complex pipelines are clearer as custom forked skills than as multi-skill combos.
- **Weekly prep is mandatory.** The old method (write from memory) produced weeklies that missed 7-15 significant events each.
- **ZK validation is our innovation over OpenClaw.** Dreaming without ZK validation produces self-consistent but externally unreadable output.

## 8. Combo Awareness

This repo's `skill-deck.toml` has two combos. When you use ANY deck, read its `[combo.<name>]` sections. They are the orchestration playbook — not optional metadata.

- `weekly-retro`: prep → write → ZK verify weekly
- `dream-consolidate`: scan weekly chain → consolidate SSOT → ZK validate → cross-model

## 9. If You Get Stuck

1. Read the latest daily handoff — it has ground truth + pitfalls + next steps
2. Read the latest weekly — it has the importance-ranked narrative
3. Run `cortex probe` — it catches state drift
4. Spawn a ZK agent to read the SSOTs and self-report — if it's confused, the docs need fixing
5. Ask the user. "I don't know" is better than fabrication.
