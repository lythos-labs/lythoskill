---
name: lythoskill-project-scribe-weekly
version: 0.17.11
description: |
  Weekly synthesis writer. Distills the past 7 days' core thread + quest DAG
  into a frontmatter-rich short doc. Never replays git log or cortex INDEX
  (those are direct queries already). Forms the weekly counterpart to
  project-scribe (daily) and project-onboarding (read-side).
when_to_use: |
  End of week retrospective, planning next week's priorities, zooming out
  from daily noise, identifying patterns across sessions, preparing for
  epic planning, Sunday night wrap-up, 周末复盘.
---

# Project Scribe — Weekly

> Distill, don't replay. The core thread matters; the 17 commits that touched it don't.

## Value Boundary

Weekly is a **memory offloading mechanism**, not a menu listing.

| Direct queries (skip these) | Scribe-weekly must synthesize |
|-----------------------------|-------------------------------|
| `git log --since="7 days ago"` | The *one* decision that mattered most |
| `ls daily/2026-05-*` | Why the planned vs actual divergence happened |
| `cat cortex/INDEX.md` | Which emergent threads earned attention |
| `bunx @lythos/project-cortex list` | What pattern is hardening into a project trait |

If the next agent can find it via `ls daily/`, `git log`, or `cortex index` — don't replicate it. Link to it.

**Why this matters**: A future agent reading a weekly cold (no daily access) should get the *compressed representation* of the week's cognitive work — the pattern, not the commits. Without this, every agent must reconstruct the narrative from 6 daily files + 29 commits + 10 ADRs. Weekly offloads that reconstruction cost once, permanently.

## Weekly Prep (like `cortex probe` — gather before you write)

**Do NOT start writing from memory.** Run prep first. This is the write-side counterpart to onboarding's read-side: just as onboarding reads daily → verifies git → presents summary, weekly prep gathers all sources → surfaces anomalies → ranks importance.

### Step 1: Gather (deterministic)

```bash
# ISO week alignment check — confirm what week we're in and what span to cover
python3 -c "import datetime; d = datetime.date.today(); iso = d.isocalendar(); \
  mon = d - datetime.timedelta(days=d.weekday()); \
  sun = mon + datetime.timedelta(days=6); \
  print(f'Today: {d} ({d.strftime(\"%A\")}) — ISO W{iso.week}'); \
  print(f'Standard span: {mon}_to_{sun}')"

# Daily surface — which days had activity?
ls daily/*.md | sort | tail -7

# Git surface — what actually landed?
git log --since="7 days ago" --oneline

# Cortex surface — what state changed?
bunx @lythos/project-cortex@0.17.11 probe
bunx @lythos/project-cortex@0.17.11 stats

# ADR surface — what decisions were accepted this period?
ls -lt cortex/adr/02-accepted/ | head -15

# Delta from last weekly — what's new since the last snapshot?
ls weekly/ | sort | tail -1
```

### Step 2: Surface Anomalies

Scan the gathered data for:
- **Superseded decisions**: later ADR that contradicts an earlier one (e.g., combo redefinition May 6 superseded May 1 section semantics)
- **Renamed/removed commands**: CLI surface changed (e.g., `agent-run` → `single`, `deck sync` → `deck to-symlink`)
- **Reversed priorities**: a task/epic that was `priority_at_start` last week but never appeared in this week's dailies
- **Silent gaps**: days with no daily file but git shows commits (someone committed outside agent session)
- **Missing ADRs**: significant code/architecture change in git log with no corresponding ADR accepted in the same window. A rename with 30+ commits and no ADR is a red flag.

### Step 3: Importance Ranking (simulated annealing)

1. **High temperature**: dump every event you can recall. Don't filter. Include everything.
2. **Cool**: group related events into clusters (e.g., "path convention fixes" = 5 commits, 2 ADRs, 1 ZK sweep)
3. **Rank clusters** by downstream confusion cost: "if a future agent missed this cluster, how wrong would their decisions be?"
4. **Freeze**: top 1-2 clusters → `core_thread`. Clusters that involve superseded docs → `docs_now_stale`.

**Test**: can you identify the single most important decision of the week? If the combo redefinition (May 6) would be invisible in your weekly, you didn't rank correctly.

### Step 4: Prep Report (show to user before writing)

Present a 5-line summary:
```
📊 Weekly Prep — 2026-W22
📄 Dailies: 2026-05-21, 2026-05-28 (gap May 22-27)
🔀 ADRs: 3 proposed, 0 accepted this period
⚠️  Anomalies: combo redefinition (May 6) not captured in any weekly
💡 Top cluster: site documentation debt cleanup (P0 → done)
📋 docs_now_stale candidates: ADR-20260501160000000, external-skill-governance-bridge.md
```

User confirms → proceed to write. User flags missing items → add to cluster list.

## When to Run

- User explicitly asks for weekly synthesis
- End of week (typically Sunday) for retrospective
- **Friday afternoon**: if the week has already produced substantial work and user wants to capture it before weekend
- **Sunday night**: if weekend work continued the week's thread — append to existing weekly, don't create new
- **Monday**: if weekend was quiet and weekly wasn't written yet
- Before epic planning to understand what unlocked/paused
- **Do NOT auto-schedule** — the player decides timing

## Sunday Check (agent-initiated suggestion)

If today is Sunday and you observe any of these signals during session close:
- Epic/task cleanup feeling ("this phase feels done")
- Goal 阶段性达到 (milestone completed, tests pass, push to remote)
- User says "LGTM", "就这样", "先到这里" on a Sunday

**Suggest to user**: "今天周日，这周的工作感觉到了一个自然的收束点。要不要沉淀一下 weekly，把这周的模式记录下来？"

User says yes → run weekly prep. User says no or ignores → write daily scribe as usual, don't push.

## Weekly Writing Modes

| Mode | When | Action |
|------|------|--------|
| **Fresh** | No weekly exists for current week | Write new weekly with standard period |
| **Append** | Weekly already exists, weekend had more work | Append to existing weekly, update core_thread if needed |
| **Catch-up** | Gap week(s) detected | Write "no active work" weekly for gap, then current week |

**Daily scribe continues regardless.** Weekly does not replace daily; they are different abstraction layers.

## Inputs (collect before writing)

```bash
# 1. Daily files from the past 7 days
ls daily/*.md | sort | tail -7

# 2. Git activity (for reference, not replay)
git log --since="7 days ago" --oneline

# 3. Current cortex state
bunx @lythos/project-cortex@0.17.11 index
bunx @lythos/project-cortex@0.17.11 stats

# Cortex uses timestamp IDs (ADR-yyyyMMddHHmmssSSS, TASK-...,
# EPIC-...). This lets you grep by date range:
#   ls cortex/adr/02-accepted/ | grep '^ADR-2026051'
# Use this when reconstructing a missing weekly from ground truth.

# 4. Session recall — ask yourself:
#    - What was the priority at week start?
#    - What actually got done vs paused?
#    - What emerged mid-week that wasn't planned?
#    - What pattern repeated across multiple days?
```

## Output: weekly/YYYY-Wxx.md

### Frontmatter (machine-readable; future agents read this first)

```yaml
---
period: 2026-05-01_to_2026-05-07
core_thread: "one-line synthesis of the week's unifying theme"
priority_at_start:
  - "what was planned"
priority_at_end:
  - "what actually became priority"
quests_advanced:
  - EPIC-xxx: epic name (status)
quests_unlocked:
  - "new task or epic that became actionable"
quests_paused:
  - "task or epic that was deferred"
parked_threads:
  - "noted but not pursued"
decisions_accepted:
  - ADR-xxx: decision title
retro_cells:
  planned_done: "what was planned and completed"
  planned_paused: "what was planned but didn't happen (and why)"
  emergent_done: "what emerged and earned attention"
  emergent_paused: "what emerged but was parked"
project_lesson_candidates:
  - "pattern that might become a wiki entry if it repeats"
references:
  daily: ["daily/2026-05-01.md", "daily/2026-05-02.md", ...]
  cortex_index: cortex/INDEX.md
---
```

### Body (~200-300 words, NOT a replay)

1. **TL;DR** (1 paragraph): core thread + the one decision that mattered most.
2. **4-Quadrant Retro** (table): planned vs emergent × done vs paused.
3. **Quest DAG**: ASCII or Mermaid diagram of epic/task flow.
4. **Project Lesson Candidates**: bullets for patterns worth crystallizing.
5. **Reference Pointers**: links to daily files and indexes. Don't replicate.

## The 4-Quadrant Retrospective

Compare *intended priorities* against *actual execution*:

| | **Done** | **Paused / Dropped** |
|---|---|---|
| **Planned** (priority at start) | ✅ Validated priorities — called right | ⚠️ Priority correction — why did it slip? |
| **Emergent** (surfaced mid-week) | 🌱 What proved deserving of attention | 📋 Noted-but-parked threads |

**Rule of thumb**: One concise line per cell explaining *what happened and why*. Not a task list.

## Salience Filter

> "太细节的小事不会在 weekly 里。特别强烈的印象会在。"

| Include | Exclude |
|---------|---------|
| Decisions that changed direction | Every commit message |
| Patterns across multiple days | Single-day bugs already fixed |
| Unblocked epics or tasks | Routine maintenance |
| Surprising findings from E2E | Formatting changes, refactors |
| Project traits worth documenting | Tool version bumps |

**Test**: If a future agent reading this weekly *cold* (no daily access) would mistake a detail for a non-event, it doesn't belong.

## Verify Companion

Before relying on a weekly for planning, spot-check its claims against ground truth:

```bash
# Does the recorded epic/task status match reality?
bunx @lythos/project-cortex@0.17.11 probe

# Does the git activity match the claimed period?
git log --since="2026-05-01" --until="2026-05-07" --oneline

# Do the referenced daily files exist?
ls daily/2026-05-*.md
```

Wrong facts in weekly = disaster for next agent. The agent owns this verification — there is no `validate-weekly` CLI; weekly is a pure skill that produces a doc, the agent uses cortex probe + git log + daily ls to reality-check what it just wrote.

## Decision Hygiene (agent behavior)

**Do not present fake options.** When asking user for next step, every option must be a real choice with different consequences. Do not include:
- Options that transfer cost to future sessions (e.g., "end session and let next agent handle it")
- Options that are obviously inferior (e.g., "do nothing" when action is clearly needed)
- Options that defer without reason (e.g., "wait" without explaining what we're waiting for)

**Why**: Fake options waste user attention. They feel like marketing tricks — psychological anchors designed to make one option look good by contrast. Respect user time by offering genuine trade-offs or making the recommendation directly.

**Pattern**: If you know what should happen, say so. If you need user input, offer 2-3 real alternatives with consequence briefs. If there's no real choice, don't ask.

**Examples**:
- ❌ "Should I A) verify now B) end session C) do nothing" — C is fake
- ✅ "I recommend verifying now — cost is 1 minute, benefit is catching skill drift before next session. Confirm?"
- ✅ "Two paths: A) quick scan (5 min, surface only) B) deep audit (30 min, full checklist). Which fits your time?"

## Scenarios & Packages (v0.1 — explore with user)

Weekly writing is not a rigid procedure. It's a **scenario-driven, package-based exploration** between agent and user. Like an ADV game: there are branches, but each branch has a default skeleton.

### Scene A: Weekly Writing

**Trigger**: User says "写 weekly" / "这周总结一下" / end-of-week feeling

| Package | When | Skeleton | Optional Add-ons |
|---------|------|----------|----------------|
| **A1: Fresh** | No weekly for current ISO week | Standard ISO period + full prep | ADR timeline, daily cross-reference |
| **A2: Append** | Weekly exists, work continued | Extend period, update core_thread | Merge cross-week git activity |
| **A3: Catch-up** | Gap detected | Fill gap with "no active work" first, then write current | Historical drift annotation |

**Agent choice**: Run `ls weekly/*.md | sort | tail -3` to detect mode. Recommend package to user. User confirms or overrides.

### Scene B: User Says "消债" / "扫一下" / "还债"

**Trigger**: User explicitly asks for cleanup / audit / sweep

| Package | When | Skeleton | Optional Add-ons |
|---------|------|----------|----------------|
| **B1: Quick Scan** (5 min) | User wants overview | Weekly chain + cortex probe | Gap report only |
| **B2: Deep Audit** (30 min) | User wants thorough check | Full 23-item reference checklist | User selects scope |
| **B3: Targeted** | User names specific debt | Agent drills from weekly chain into named area | Cross-reference ADR/task |

**Agent choice**: Ask user "quick scan or deep?" Default to B1 if user just says "消债" without qualifier.

### Scene C: Session Close (Scribe)

**Trigger**: User says "LGTM" / "先到这里" / session ending

| Package | When | Skeleton | Optional Add-ons |
|---------|------|----------|----------------|
| **C1: Standard Handoff** (default) | No weekly suspicion | Write daily, no eager weekly check | — |
| **C2: Weekly Suspicion** | User mentions cross-week work / weekly conflict | Check weekly chain before scribe | Suggest append if needed |

**Agent choice**: Default C1. Switch to C2 only if session content clearly spans weeks or user explicitly mentions weekly.

### Scene D: Release Prep

**Trigger**: User says "release" / "ship it" / version bump

| Package | When | Skeleton | Optional Add-ons |
|---------|------|----------|----------------|
| **D1: Version Alignment** | Pre-bump | Check package.json versions across packages | README version sync |
| **D2: Reference Validity** | Pre-publish | Check internal links, cross-package refs | External link spot-check |
| **D3: Full Sweep** | Major release | All 23 items + documentation freshness | Dreaming integration |

**Agent choice**: User names release scope → select package. Default D1 for patch, D2 for minor, D3 for major.

### Scene E: Quarterly Dreaming

**Trigger**: User says "做梦" / "consolidate" / "memory cleanup"

| Package | When | Skeleton | Optional Add-ons |
|---------|------|----------|----------------|
| **E1: Trend Analysis** | Every quarter | Weekly chain pattern + lesson candidate validation | Wiki promotion decisions |
| **E2: Full Archive** | Year-end / major milestone | All 23 items + historical drift full audit | SSOT regeneration |

**Agent choice**: Dreaming skill owns this. Weekly skill provides weekly chain as input.

## 23-Item Reference Checklist (menu, not mandate)

Use this as a **menu** when user selects B2 (Deep Audit) or D3 (Full Sweep). Not for everyday use.

### 1. Document Chain Integrity
- [ ] 1.1 daily chain continuity
- [ ] 1.2 weekly chain continuity
- [ ] 1.3 weekly period alignment
- [ ] 1.4 daily → weekly reference consistency
- [ ] 1.5 weekly → ADR reference consistency

### 2. Code-Document Consistency
- [ ] 2.1 skill source vs build output freshness
- [ ] 2.2 package.json version lockstep
- [ ] 2.3 README version sync
- [ ] 2.4 AGENTS.md command reference validity
- [ ] 2.5 SKILL.md command reference validity

### 3. Governance State Consistency
- [ ] 3.1 cortex task status
- [ ] 3.2 cortex epic status
- [ ] 3.3 ADR status vs directory location
- [ ] 3.4 task 7+ days without commit
- [ ] 3.5 epic all-done but not closed

### 4. Reference Validity
- [ ] 4.1 internal file references exist
- [ ] 4.2 cross-package references exist
- [ ] 4.3 external links (spot-check, not exhaustive)
- [ ] 4.4 showcase → playground references

### 5. Metadata Completeness
- [ ] 5.1 skill frontmatter complete
- [ ] 5.2 ADR Status History complete
- [ ] 5.3 task English slug
- [ ] 5.4 weekly frontmatter complete

**How to use**: Agent presents checklist to user. User selects scope ("just 1 and 3" or "all"). Agent executes selected items. No automatic full scan.

## Long-Range Consistency Principle

Weekly is the **anchor** for long-range consistency. Not because it's the most frequent, but because it's the **right frequency**:

- **daily**: too frequent, compaction makes it unreliable for drift detection
- **weekly**: just right — regular enough to catch drift, sparse enough to survive compaction
- **quarterly**: too sparse, drift accumulates beyond easy repair

The weekly chain (`weekly/2026-W17.md`, `2026-W18.md`, ...) is a **temporal index**. Future agents reading cold can:
1. Find the latest weekly → know current ISO week
2. Follow chain backward → reconstruct narrative
3. Detect gaps → know where drift occurred

**This is the project's memory infrastructure in practice.**


| When you need to… | Read |
|--------------------|------|
| Full frontmatter spec and examples | [references/weekly-format.md](./references/weekly-format.md) |
| Validate-companion pattern details | [references/verify-companion.md](./references/verify-companion.md) |
| Relationship with daily scribe + onboarding | [references/cqrs-architecture.md](./references/cqrs-architecture.md) |
