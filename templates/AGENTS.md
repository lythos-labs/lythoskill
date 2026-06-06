# {{PROJECT_NAME}} — AGENTS.md

> Project guidance for agents that read `AGENTS.md` (Kimi, Codex, Copilot, Gemini CLI, etc.).
> If you are Claude Code, read [`CLAUDE.md`](./CLAUDE.md) instead — it points back here.
> Human contributors: see [README.md](./README.md).

> **⚠️ COMPACTION-SAFE — read this before any release, version, git remote, or npm command.**
> (Compaction = context window overflow — the agent loses conversation history.
> After compaction, re-read this section before touching auth, version, git, or npm.)

---

## 0. Boot First

If you were just dropped into this repo, run these steps **before touching any code**.

### First-time activation (when `cortex/` does not exist)

```bash
# 1. Install dependencies
bun install

# 2. Link the lythoskill skill deck into your agent working set
bunx @lythos/skill-deck link

# 3. Initialize project-cortex governance
bunx @lythos/project-cortex init

# 4. Create the daily journal directory
mkdir -p daily

# 5. Write an initial daily skeleton (today's date: YYYY-MM-DD.md)
#    Include: repo state, open questions, next actions.
```

### Daily boot (when `cortex/` already exists)

```bash
bun install
bunx @lythos/skill-deck link
# read daily/YYYY-MM-DD.md (latest)
git status && git log --oneline -5
bunx @lythos/project-cortex probe
```

Why this order: dependencies → skills → session state → ground truth → drift check.

---

## 1. Identity

### What this project is

A **lythoskill consumer project**: it uses lythoskill governance tools (`skill-deck`, `project-cortex`, `skill-arena`) without publishing its own skills. The project borrows the lythosisk daily/cortex rhythm for agent memory and task tracking.

### Technology

| Layer | Choice |
|-------|--------|
| Runtime | **Bun** |
| Language | **TypeScript** (ESM-only) |
| Package manager | **Bun** |
| Agent governance | **lythoskill** (`@lythos/skill-deck`, `@lythos/project-cortex`) |

---

## 2. Agent Behavior Boundary

| Layer | Who decides | Examples |
|-------|-------------|----------|
| **Goal** (what & why) | **User** | "Rollback skill-deck.toml" |
| **Decision** (scope & approach) | **Ask user if unclear** | "Should I add a resolver?" |
| **Execution** (how) | **Agent** | Search, read, test, write code |

**Hard rules**:
1. **Stop if goal is unclear.** Do not infer, extrapolate, or fill in blanks. Ask.
2. **Do not change the goal.** User says "draw a diagram" → do not refactor code.
3. **Do not guess emotions.** "The user seems angry" is projection, not fact.
4. **"I think / 我觉得" = start an ADR.** Capture trade-offs; do not jump to implementation.
5. **System silence is not permission.** If the platform prompts "the user has not said anything," stop, summarize state, ask for next step.
6. **See a bug, fix a bug — no "not my code."** If you discover a broken test, mismatched import, stale comment, or any defect that would trip up the next agent, fix it.

---

## 3. Daily Rhythm

A session goes through four phases.

### 1. Boot — mechanical, don't think, just execute

```bash
bun install
bunx @lythos/skill-deck link
# read daily/YYYY-MM-DD.md (latest)
git status && git log --oneline -5
bunx @lythos/project-cortex probe
```

You now know what happened last time and what's pending.

### 2. Incoming — user gives you something

- **Research / audit / design / docs / governance / UX test** → dispatch via arena with a deck.
- **Direct work** → trivial? just fix it. Non-trivial? `cortex task` first, then work.
- **Unclear?** Ask. Quote their words back, state the ambiguity, propose options.

### 3. Working — three guardrails

- **Autonomy**: act without asking only when low-impact + reversible + ≥90% confident.
  `npm publish`, force-push, external messaging → always ask.
- **Subagent**: spawn for research, audit, execution. Don't spawn for judgment, architecture, or user communication.
- **Deck first**: relevant skill exists? Use it — even for one-shot.

### 4. Closing

```bash
git status && git log --oneline -5
bunx @lythos/project-cortex probe
# write daily/YYYY-MM-DD.md (what file exploration cannot recover)
# commit daily, push
```

---

## 4. Key Commands

| Need | Command |
|------|---------|
| **Load skills (do first)** | `bunx @lythos/skill-deck link` |
| Probe state | `bunx @lythos/project-cortex probe` |
| Create task | `bunx @lythos/project-cortex task "title"` |
| Start task | `bunx @lythos/project-cortex start TASK-xxx` |
| Review task | `bunx @lythos/project-cortex review TASK-xxx` |
| Arena quick run | `bunx @lythos/skill-arena single --deck <path> --brief "prompt"` |
| Curator skill index | `bunx @lythos/skill-curator discover` |

All commands resolve to published npm packages:
`@lythos/skill-deck`, `@lythos/skill-arena`, `@lythos/project-cortex`, `@lythos/skill-curator`.

---

## 5. Critical Gotchas

Format: `[PHASE] [TAG]` + **When you'll forget:** the moment the mistake feels safe → the rule.

**[BOOT]**
- `[INSTALL]` **When you'll forget:** you ran `bunx` without `bun install` first. → Always `bun install` before `bunx @lythos/*` in a fresh clone or after `package.json` changes.
- `[DAILY]` **When you'll forget:** you skip reading `daily/` because the file name isn't today's date. → Read the **latest** `daily/YYYY-MM-DD.md`, not today's date necessarily.

**[EDIT]**
- `[DECLARATIVE]` **When you'll forget:** you edited `skill-deck.toml` or `package.json` and didn't re-run the reconciler. → After changing declarative state, run `bunx @lythos/skill-deck link` or `bun install` again.
- `[LOCAL_PATH]` **When you'll forget:** you copied a command from the upstream lythoskill repo that uses `packages/lythoskill-*/src/cli.ts`. → Consumer projects use `bunx @lythos/...` only.

**[VALIDATE]**
- `[PROBE]` **When you'll forget:** you committed before running `cortex probe`. → Run `bunx @lythos/project-cortex probe` before claiming a task done; it catches status-history drift.
- `[TASK_TEMPLATE]` **When you'll forget:** you created a task with the CLI but left the template empty. → Fill Background, Requirements, and Acceptance immediately; empty templates are rejected by probe.

**[CLOSE]**
- `[HANDOFF]` **When you'll forget:** you pushed without writing `daily/`. → The next agent has no session state. Write `daily/YYYY-MM-DD.md` before the final push.
- `[TRAILER]` **When you'll forget:** you closed a task without a commit trailer. → Use `Closes: TASK-xxx`, `Task: TASK-xxx review`, or `ADR: ADR-xxx accept` so cortex hooks can dispatch.
