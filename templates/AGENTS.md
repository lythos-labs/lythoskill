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

This project uses **lythoskill** for declarative agent skill governance.
The source of truth is `skill-deck.toml` in the root of this workspace.

### If this is the first time lythoskill is being adopted

Download the bootstrap deck and reconcile the working set:

```bash
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/refs/heads/main/examples/decks/lythoskill-consumer-bootstrap.toml > skill-deck.toml
bunx @lythos/skill-deck@latest link
```

Then execute the `[combo.bootstrap]` playbook from the loaded deck:
- It will initialize `cortex/` via `bunx @lythos/project-cortex@latest init` if needed.
- It will create `daily/` and use the loaded `lythoskill-project-scribe` skill to write the first handoff.
- It will use the loaded `lythoskill-writer` skill to adapt `AGENTS.md` and `CLAUDE.md` to this project.
- It will validate with `deck validate` and `cortex probe`.

### Daily boot (after bootstrap)

```bash
bunx @lythos/skill-deck@latest link
# read daily/YYYY-MM-DD.md (latest)
git status && git log --oneline -5
bunx @lythos/project-cortex@latest probe
```

Why this order: skills → session state → ground truth → drift check.

---

## 1. Identity

### What this project is

A **lythoskill consumer project**: it uses lythoskill governance tools (`skill-deck`, `project-cortex`, `skill-arena`) without publishing its own skills. The project borrows the lythoskill daily/cortex rhythm for agent memory and task tracking.

### Technology

| Layer | Choice |
|-------|--------|
| Agent governance | **lythoskill** (`@lythos/skill-deck`, `@lythos/project-cortex`) |
| Runtime for lythoskill CLIs | **Bun** (`bunx`) |

The rest of the stack — language, package manager, framework — is whatever this repo already uses.

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
bunx @lythos/skill-deck@latest link
# read daily/YYYY-MM-DD.md (latest)
git status && git log --oneline -5
bunx @lythos/project-cortex@latest probe
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
bunx @lythos/project-cortex@latest probe
# write daily/YYYY-MM-DD.md (what file exploration cannot recover)
# commit daily, push
```

---

## 4. Key Commands

| Need | Command |
|------|---------|
| **Load skills (do first)** | `bunx @lythos/skill-deck@latest link` |
| Probe state | `bunx @lythos/project-cortex@latest probe` |
| Create task | `bunx @lythos/project-cortex@latest task "title"` |
| Start task | `bunx @lythos/project-cortex@latest start TASK-xxx` |
| Review task | `bunx @lythos/project-cortex@latest review TASK-xxx` |
| Arena quick run | `bunx @lythos/skill-arena@latest single --deck <path> --brief "prompt"` |
| Curator skill index | `bunx @lythos/skill-curator@latest discover` |

All commands resolve to published npm packages:
`@lythos/skill-deck`, `@lythos/skill-arena`, `@lythos/project-cortex`, `@lythos/skill-curator`.

---

## 5. Critical Gotchas

Format: `[PHASE] [TAG]` + **When you'll forget:** the moment the mistake feels safe → the rule.

**[BOOT]**
- `[DECK]` **When you'll forget:** you edited `skill-deck.toml` and didn't re-link. → After any deck change, run `bunx @lythos/skill-deck@latest link` before assuming skills are correct.
- `[DAILY]` **When you'll forget:** you skip reading `daily/` because the file name isn't today's date. → Read the **latest** `daily/YYYY-MM-DD.md`, not today's date necessarily.

**[EDIT]**
- `[DECLARATIVE]` **When you'll forget:** you edited `skill-deck.toml` and didn't re-run the reconciler. → `skill-deck.toml` is declarative; `deck link` is the reconciler. Run it after deck edits.
- `[LOCAL_PATH]` **When you'll forget:** you copied a command from the upstream lythoskill repo that uses `packages/lythoskill-*/src/cli.ts`. → Consumer projects use `bunx @lythos/...` only.

**[VALIDATE]**
- `[PROBE]` **When you'll forget:** you committed before running `cortex probe`. → Run `bunx @lythos/project-cortex@latest probe` before claiming a task done; it catches status-history drift.
- `[TASK_TEMPLATE]` **When you'll forget:** you created a task with the CLI but left the template empty. → Fill Background, Requirements, and Acceptance immediately; empty templates are rejected by probe.

**[CLOSE]**
- `[HANDOFF]` **When you'll forget:** you pushed without writing `daily/`. → The next agent has no session state. Write `daily/YYYY-MM-DD.md` before the final push.
- `[TRAILER]` **When you'll forget:** you closed a task without a commit trailer. → Use `Closes: TASK-xxx`, `Task: TASK-xxx review`, or `ADR: ADR-xxx accept` so cortex hooks can dispatch.
