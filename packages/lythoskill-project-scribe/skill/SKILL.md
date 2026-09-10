---
name: lythoskill-project-scribe
version: {{PACKAGE_VERSION}}
description: |
  Session context dump. Self-assess what the conversation contains that has
  NO other carrier (no task, no ADR, no epic) — pitfalls, working-tree anomalies,
  why-we-chose-this, specific next steps — and write to daily/YYYY-MM-DD.md.
  Things WITH structured carriers go to their carriers. Things WITHOUT
  carriers but needed by the next agent go here. Forms CQRS write-side pair
  with project-onboarding (read-side).
when_to_use: |
  Record after a batch of commits lands — mid-session or at close, while
  facts are fresh. Use when: user hits a pitfall, makes an important
  decision, completes a milestone, asks to checkpoint, or says context is
  getting long. Do NOT treat "record" as "stop working" — the section
  name marks the next session's read artifact, not this session's end.
---

# Project Scribe
> Write what `ls` + `cat` + `git log` cannot recover. Skip everything else.

## Trigger: save discipline, not session-end

The intent is the old **save-to-disk discipline**: save constantly, because
a power cut can hit at any moment. For an agent the power cut is
compaction / crash / context loss: it can hit mid-task with no warning, and
only git-tracked, already-written files survive it. Scribe = save game; the
daily file is the save slot.

The reliable save anchor is a **batch of commits landing** — scribe right
after, while facts are fresh. A session cannot judge its own remaining
context; "write the handoff when the session feels done" is unreliable and
produces rushed, telegraphic output. Anchor to the commit, not the mood.

`## Session Handoff` names the artifact the NEXT session reads, not the
moment you write it. One session saves any number of times; saving says
nothing about this session ending (record-then-continue is the default,
see below).

## Value Boundary

**Scribe = session context dump for things WITHOUT structured carriers.**

```
What came out of this conversation?
  ├── Has a structured carrier (task/ADR/epic) → write to that carrier, not scribe
  └── No carrier → self-assess: does the next agent need to know this?
        ├── Yes → scribe
        └── No → don't write it
```

| File exploration recovers (~70%) | Scribe must dump (~30%) |
|----------------------------------|------------------------|
| Project structure, tech stack | Pitfalls from this session |
| skill-deck.toml content | True working-tree state (prevents hallucination) |
| cortex/ tasks and epics | Why we chose A not B (not ADR-worthy but still important) |
| git log history | Specific next steps (not "test it") |
| README, docs | Temp artifacts: location + purpose |
| git diff (code changes) | Uncommitted modifications and their intent |
| | Meta-observations that emerge mid-conversation |

If the next agent can find it via `ls`, `cat`, or `git log` — don't repeat it.
## Pre-Handoff Checklist (mandatory before writing)
```bash
# 1. Git state — snapshot LAST: after any deck link/refresh/release step,
#    immediately before writing (a later link can silently dirty the tree)
git status
git log --oneline -5
# 2. Cortex state (if cortex is active)
bunx @lythos/project-cortex@{{PACKAGE_VERSION}} list
# 3. Session recall — ask yourself:
#    - What did I modify but not commit?
#    - What pitfalls did I hit?
#    - What important decisions were made verbally?
#    - What temp files did I create and where?
#    - What would the next agent most likely misunderstand?
# 4. After drafting: run the ZK Review Gate (below) — before commit
```
## Template Usage

Scribe produces two file types. Follow the templates — they encode the
best-practice format that evolved from 100+ daily/weekly files.

| File type | Template | When to write |
|:---|:---|:---|
| **Daily** | [references/daily-template.md](./references/daily-template.md) | At session milestones or end |
| **Weekly** | [references/weekly-template.md](./references/weekly-template.md) | End of week (Sunday night) |

**Rule**: Do not invent format. If the template has a section, include it.
If a section is marked REQUIRED, it must be present even if empty (e.g.,
`quests_paused: []` proves you checked, not forgot).

## Core Operation: Write Daily File
Output goes to `daily/YYYY-MM-DD.md`. The first section must be `## Session Handoff`.
Human work logs follow after the handoff section.

```bash
# File location
daily/
├── 2026-04-23.md    # Yesterday's daily (contains handoff + work log)
├── 2026-04-24.md    # Today's daily
└── ...              # Flat date-based, no subdirectories
```

Multiple sessions on the same day: prepend a new `## Session Handoff` section
at the top of the file. The onboarding skill reads the **first** (most recent)
handoff section.

## Handoff Must Include Verification Commands
The handoff is not a snapshot — it's a snapshot **plus instructions to verify freshness**.
Always include in `### 0. Verify Current State`:
```markdown
### 0. Verify Current State
git diff <handoff-commit> --stat    # Construct "from T0 to now"
git status --short                  # Real-time working tree
git log --oneline -3                # Confirm recent commits match
```
If the reader runs these and output diverges from the handoff, the handoff is stale.
Real-time output takes precedence.

## Resumption Items: What + Why + Done + Raw Ref

Items the next agent must ACT on carry a stricter contract than narrative
sections. Applies to four categories: **half-done work**, **stuck**, **pending
decision** (ADR-worthy or not), and **every Next Steps entry**.

Each item answers four things:

| Part | Question | Bar |
|------|----------|-----|
| **What** | What is the action | One concrete action, not a theme ("wire X into Y's stdout", not "finish the feature") |
| **Why** | Why do it | Cost of NOT doing it — the incident or drift it prevents |
| **Done** | What does done look like | Observable end state: command output, test count, filed ADR id — not "looks good" |
| **Raw ref** | Where to jump | `file:line`, TASK-/ADR-/EPIC-id, commit hash, or URL — zero re-derivation |

**No raw ref → no item.** An item you cannot point at is a wish, not a
handoff entry (mirrors cortex's "no source → no rule" — false confidence
is worse than empty space).

Category-specific additions:

- **Stuck**: blocker as fact (exact error text / missing input) + what was
  already tried (one line + ref) + the cheapest next probe.
- **Pending decision**: the decision question + options one line each + what input
  unblocks it (who/what is missing). File the ADR, or link the existing id.

Rationale: the reader is an agent under onboarding time pressure with zero
conversation context. What/Why/Done lets it verify completion without
guessing intent; the raw ref lets it jump to ground truth instead of
re-deriving the search path. "Continue testing" fails because it
re-exports the derivation cost to the reader. The contract is also the
anti-jargon bar: a writer in a hurry produces telegraphic fragments that
decode to nothing for a zero-context reader; forcing What/Why/Done + ref
per item forces complete, checkable sentences at write time.

This contract is the **handoff-scope instance of the project's 5W1H reporting
rule** (AGENTS.md §3 — What / Why / Where / When / Who / How; scribe's `Done`
≈ When + How). One convention, two carriers: cortex applies it to review and
status reports, scribe to every resumption item. Same two hard bars — no
private vocabulary the reader cannot resolve from the repo or the glossary,
and any verdict word (score, gate, severity) must define its criteria in the
same file. An undefined scale cannot be disagreed with, so it is not a report.

Write sentences like these, not telegraphic fragments. The ❌ samples below
are synthesized typical shorthand (any user's, not a specific person's words).
The writer acts as
**secretary, not stenographer**: humans abbreviate by nature when speaking
fast — decode the shorthand into these sentences; never transcribe the
fragment as-is.

| ❌ Telegram-style (the reader can't execute it) | ✅ Recommended (What + Why + Done + ref as one sentence) |
|---|---|
| "Next: kimi adapter 加固" ("harden the kimi adapter") | "Harden the kimi adapter probe (TASK-20260828212204402): probe times out under sandbox though `--version` passes; done = probe e2e green under CI-sim env, `env -u CLAUDE_CODE_SSE_PORT bun --filter='*' run test` EXIT=0" |
| "deck lock 又脏了，提交一下" ("deck lock is dirty again, commit it") | "skill-deck.lock dirty after `deck refresh --exec` — hash-only, 4 entries (upstream content moved); commit it (`git add skill-deck.lock`), done = `git status` clean" |
| "dsh 插件化待定" ("dsh plugin-ization TBD") | "Pending decision: ship lythoskill-as-dsh-plugin? (a) adapter-only — current, low cost; (b) full plugin — blocked on dsh stable API (≥0.2); unblocker = dsh roadmap signal, else close as adapter-only by 2026-09-15. Ref: cortex/wiki/02-research/2026-08-29-deepseek-harness-integration-survey.md §Recommendation" |
| "卡在 npm 发布" ("stuck at npm publish") | "Stuck: `npm view @lythos/skill-deck` 404 immediately after publish; republish → E403. E403 = publish already succeeded (propagation delay). Next probe: exact-match `[ \"$OUT\" = \"0.19.1\" ]` after 60 s — never grep the version in error text (false positive)" |

## ZK Review Gate (mandatory before commit)
The handoff's irreplaceable content — resume pointers ("agent-0 still holds
the four-round context, don't open a fresh session for review"), temp
artifacts, colloquial context — is exactly what a session-internal author
writes worst: it is the most session-specific and the most likely to come
out as unresolvable jargon (curse of knowledge). The play-by-play sections
need no such care — cortex task cards + git history already carry them. So
before commit the handoff gets a zero-knowledge pass, weighted at the top:

1. Draft the handoff (with `### 0. Verify Current State`) and write it
   after user confirmation (Gotchas: show diff first).
2. Spawn a fresh ZK reviewer — **pass-by-reference**: the handoff file path,
   the `AGENTS.md` path, and the glossary path
   `cortex/wiki/04-ssot/glossary.md`. Never paste content.
3. Charter the reviewer accordingly — this goes into the spawn prompt:
   effort goes on the resume pointers (the `**Resume**` field in
   `### 0. Verify Current State`) and the Temp Artifacts section — not on
   task state or history.
4. Fix every unresolved item **on the spot**, then commit.
   - **Anti-bloat**: a fix = one-sentence gloss + a pointer, bounded by the
     Value Boundary above — a fix restores what `ls`/`git log` cannot
     recover, it never adds what they can. Never dump transcript into the
     handoff — reading cost kills recall in reverse. A term that needs a
     paragraph belongs in the glossary, not expanded here.
   - Recurring jargon → deposit a row in the glossary (with source);
     one-off jargon → gloss in place.
5. ZK agents are sensors, not bosses (AGENTS.md) — you judge each finding.

Methodology + gap-processing rules:
`packages/lythoskill-project-cortex/skill/references/zk-review.md`.
## Pitfall Recording
When the user says "hit a bug" or "踩坑了" ("hit a pitfall"), immediately record:
```markdown
### Pitfall: <short description>
- **Wrong approach**: what was tried
- **Symptom**: error message or behavior
- **Fix**: what actually worked
- **Root cause**: why the wrong path seemed right
- **Time wasted**: X minutes
```
## Record Then Continue

**Recording is a checkpoint, not a termination signal.**

Agents must not infer "I wrote the daily file → my job is done." The user may ask you to record a pitfall at turn 5 and then continue debugging at turn 6.

Trigger phrases: "踩坑了" ("hit a pitfall") → record pitfall, keep debugging;
"记录一下这个决定" ("record this decision") → write to daily, continue the task;
"先记一下进度" ("jot down progress first") → checkpoint, continue.

**Default assumption: record then continue.** Only stop when the user explicitly confirms (e.g., "session ending", "LGTM", "先到这里" "let's stop here").
## Gotchas
**Show diff before writing.** Always present the handoff content to the user
for confirmation before writing to the daily file. Prevents hallucinated state
from being persisted.
**Daily file = handoff + log.** Do not create a separate HANDOFF.md.
The daily file is the single source of truth. The onboarding skill reads
from it directly.
**Diff artifacts ≠ working tree.** If you generated code in a diff artifact
during the conversation but haven't written it to disk, explicitly warn in the
handoff: "⚠️ The following changes are in conversation artifacts only, not on disk."
**Cortex is optional.** If the project uses cortex, read active tasks/epics
during the pre-handoff check. If not, skip — scribe works independently.

## Supporting References
| When you need to… | Read |
|--------------------|------|
| See the full daily file template with all sections | [references/daily-template.md](./references/daily-template.md) |
| See the weekly file template (YAML + markdown body) | [references/weekly-template.md](./references/weekly-template.md) |
| Understand the CQRS relationship with onboarding | [references/cqrs-architecture.md](./references/cqrs-architecture.md) |
| Set up automation triggers (hooks, events) | [references/automation-triggers.md](./references/automation-triggers.md) |
