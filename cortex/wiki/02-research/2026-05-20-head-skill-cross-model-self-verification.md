---
created: 2026-05-20
updated: 2026-05-20
category: research
---

# Head Skill Self-Verification on Kimi via reproduce.sh

> Matthew Effect in skill ecosystems: head skills are head skills because they
> work. The curation strategy is NOT to debunk them — it is to **quickly confirm
> they work in YOUR environment**, then move on unless a niche gap appears.
>
> This research validates a reproducible pattern: `reproduce.sh` + zero-knowledge
> subagent = personal skill qualification harness. Three head skills tested across
> model boundary (Claude-authored → Kimi-executed). All PASS.

---

## Research Question

Can a user/agent rapidly verify whether a popular (head) skill behaves correctly
in their specific agent+model environment, without relying on the skill's
original author's model or platform?

This is distinct from:
- **Quality audit** ("is this skill well-written?") — answered by Skilldex/format scoring
- **Hype detection** ("is this skill over-promising?") — not the concern here
- **Discovery** ("what skills exist?") — answered by skills.sh / WebSearch

The question is **qualification**: *Given a skill that looks promising, can I
qualify it for my stack in under 5 minutes of agent time?*

---

## Methodology: reproduce.sh as Qualification Harness

### Pattern

```
┌─────────────────────────────────────────┐
│ 1. Shell: deterministic scaffold        │
│    - create tmp workdir                 │
│    - copy test input data               │
│    - fetch SKILL.md                     │
│    - echo IoC task to stdout            │
│         ↓                               │
│ 2. Subagent: zero-knowledge execution   │
│    - read stdout as prompt injection    │
│    - read SKILL.md (ONLY skill)         │
│    - execute task using skill guidance  │
│    - write decision-log.md              │
│         ↓                               │
│ 3. Shell/judge: objective verification  │
│    - check artifacts exist              │
│    - validate content correctness       │
│    - record verdict                     │
└─────────────────────────────────────────┘
```

### Why This Pattern Works for Qualification

| Property | Value |
|----------|-------|
| **Model-agnostic** | Subagent inherits parent's model by default; tests the skill on YOUR model |
| **Zero-knowledge** | Subagent has no prior exposure to the skill; simulates a fresh user |
| **Isolated** | tmp workdir + single skill = no cross-skill interference |
| **Reproducible** | Same reproduce.sh → same scaffold → comparable results |
| **Fast** | Each experiment completes in 60–120 seconds of agent time |
| **Objective** | Judge criteria are external (judge.md), not embedded in task prompt |

### Design Rules for Test Tasks

1. **Match the skill's own when_to_use** — don't test edge cases, test the claim
2. **Don't name the skill** — test discoverability + activation, not name-matching
3. **Provide realistic input** — synthetic but representative of real usage
4. **Constrain to skill-only** — subagent must not use tools outside the skill

---

## Experiment Results

### Candidate Selection

Three head skills selected across different capability types:

| Skill | Type | Ecosystem Position | Why Selected |
|-------|------|-------------------|--------------|
| `anthropics/skills/pdf` | Tool/library wrapper | Official Anthropic skill | Canonical example of "handles all PDFs" |
| `mattpocock/skills/tdd` | Methodology/process | Community head (well-known maintainer) | Tests whether procedural skills transfer across models |
| `anthropics/skills/docx` | Complex API skill | Official Anthropic skill | Tests compliance with prescriptive critical rules |

### Execution Environment

- **Agent**: Kimi Code CLI (root agent)
- **Subagent**: Inherited model (Kimi)
- **Runtime**: macOS, Bun/Node.js available
- **Skill loading**: Manual injection (SKILL.md copied to workdir, not via .claude/skills/)

### Results Summary

| Experiment | Skill | Task | Verdict | Time | Difficulty |
|------------|-------|------|---------|------|------------|
| PDF table extraction | anthropic/pdf | Extract sales table → CSV | **PASS** | ~60s | None |
| TDD bug fix | mattpocock/tdd | Fix `divide()` via red-green-refactor | **PASS** | ~90s | None |
| DOCX creation | anthropic/docx | Create report.docx with table+footer | **PASS** | ~120s | Minor (npm path) |

**Aggregate: 3/3 PASS, 0/3 FAIL, 0/3 PARTIAL**

### Detailed Findings

#### Experiment 1: PDF (anthropic/pdf)

**Task**: Extract a 5×5 sales table from `test-table.pdf` into `output.csv`.

**Agent behavior**:
- Read SKILL.md (314 lines)
- Identified `pdfplumber` as the recommended tool for table extraction from the Quick Reference table
- Executed `extract_tables()` successfully
- Produced correct CSV: 5 rows, accurate data, proper columns

**Decision-log excerpt**:
> "No difficulties. The extraction worked on the first attempt... No external
> resources or alternative libraries were needed."

**Cross-model note**: The skill was authored for Claude Code. It worked without
modification on Kimi. The code examples (Python) are model-agnostic, which is
expected for tool-wrapper skills.

#### Experiment 2: TDD (mattpocock/tdd)

**Task**: Fix a `divide()` integer-division bug using the TDD red-green-refactor loop.

**Agent behavior**:
- Read SKILL.md (emphasis on vertical slices, one test at a time, minimal code)
- Ran existing tests (ported Jest globals to `node:test`/`node:assert` to make them runnable)
- RED: Added `divide(7, 2) === 3.5` test, confirmed failure (`3 !== 3.5`)
- GREEN: Removed `Math.floor()`, all 5 tests pass
- REFACTOR: Skipped (already minimal)

**Key observation**: The subagent correctly identified that the existing test
`divide(10, 2) === 5` would pass with both buggy and fixed code, so it added a
new test to expose the bug. This is sophisticated TDD reasoning — the skill's
guidance enabled correct test design, not just rote execution.

**Cross-model note**: This is the most interesting result. TDD skills are
procedural and model-dependent (they guide the agent's reasoning process, not
just code execution). The fact that the red-green-refactor loop transferred
cleanly from Claude-optimized instructions to Kimi execution is non-trivial.

#### Experiment 3: DOCX (anthropic/docx)

**Task**: Create `report.docx` with title, body paragraph, table, and page-number footer.

**Agent behavior**:
- Read SKILL.md (extensive critical rules section)
- Used `docx-js` (Node.js) as mandated by skill
- Followed all critical rules: DXA widths, Arial font, explicit US Letter size,
  `ShadingType.CLEAR`, exact style IDs, cell margins
- Validated output with `unzip -t` and `pandoc`

**Friction point**: Global `npm install -g docx` was not on NODE_PATH in the temp
environment. Subagent resolved by running `npm install docx` locally. This is a
minor environment issue, not a skill-quality issue.

**Cross-model note**: Docx-js is a JavaScript library; the skill's value is in
its prescriptive rules (which prevent common docx-js pitfalls). These rules are
purely technical and model-agnostic. The subagent's compliance demonstrates that
the skill's instructions are precise enough for any model to follow.

---

## Core Insight: Fast Self-Qualification as Curation Primitive

The experiments demonstrate something more valuable than "head skills work":

> **A user can qualify any skill for their environment in ~5 minutes of agent time.**

This is the curation primitive that makes the Matthew Effect strategy viable:

```
Discovery (skills.sh / WebSearch) → Qualification (reproduce.sh + subagent)
                                          ↓
                              PASS → Adopt into deck
                              FAIL → Reject or seek alternative
                              PARTIAL → Arena A/B vs. alternative
```

Without fast qualification, the curation workflow breaks down:
- You find 10 candidate skills
- Manual qualification (install, read, test) = 2 hours each = 20 hours total
- Agent-assisted qualification = 5 minutes each = 50 minutes total

The 24× speedup makes "start from head, verify, then explore" a practical
strategy rather than an ideal.

### What "Fast" Means

| Step | Human Time | Agent Time | Automation Level |
|------|-----------|------------|-----------------|
| Write reproduce.sh | 10–15 min | — | Manual (once per skill type) |
| Prepare test data | 5–10 min | — | Manual (once per task pattern) |
| Execute reproduce.sh | — | 60–120s | Fully automated |
| Judge output | 2–5 min | — | Semi-automated (judge.md criteria) |
| **Total per skill** | **~20 min** | **~2 min** | **Mostly automated** |

The human effort is front-loaded (writing the harness). Once the harness exists,
re-qualification is pure agent time.

---

## Curation Strategy: Head-First + Fast Qualification

The Matthew Effect is not a bug to fight — it is a filter to use.

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: HEAD-FIRST EXPLORATION                                │
│  ──────────────────────────────                                 │
│  1. Search skills.sh / hub ranking for top-N candidates         │
│  2. Filter by category (pdf, tdd, docx...)                      │
│  3. Pick the highest-ranked candidate                           │
│                                                                 │
│  Why: Ranking is a cheap, reasonable prior. Top skills are      │
│  top for a reason. Don't waste attention on unproven长尾 first. │
│         ↓                                                       │
│  PHASE 2: FAST QUALIFICATION                                    │
│  ─────────────────────────────                                  │
│  4. Run reproduce.sh harness on YOUR model                      │
│  5. Judge: PASS / PARTIAL / FAIL                                │
│                                                                 │
│  PASS   → Add to deck. Done.                                    │
│  FAIL   → Reject. Return to Phase 1 with next candidate.        │
│  PARTIAL→ Arena A/B: head vs. niche alternative.                │
│         ↓                                                       │
│  PHASE 3: NICHE EXPLORATION (conditional)                       │
│  ───────────────────────────────────────                        │
│  Only enter this phase if Phase 2 returns PARTIAL or FAIL.      │
│  6. Search长尾 for alternatives                                 │
│  7. Qualify alternatives with same reproduce.sh pattern         │
│  8. Arena A/B comparison                                        │
│  9. Adopt winner, record curator tag                            │
└─────────────────────────────────────────────────────────────────┘
```

### Key Principle: Attention Conservation

> "注意力很宝贵，如果你自己不是觉得头部不好用就没必要换（没有明显提升）"

The strategy conserves attention by:
1. **Defaulting to head** (saves exploration effort)
2. **Fast-failing head** (saves sunk-cost time if head doesn't fit)
3. **Conditional niche exploration** (only when head is insufficient)

This is the opposite of "exhaustive search." It is satisficing with qualification.

---

## Reproducing This Research

### Artifacts Location

```
showcase/2026-05-20-head-skill-self-claim-verification/
├── pdf-skill/
│   ├── reproduce.sh
│   ├── judge.md
│   ├── test-table.pdf          ← generated test input
│   └── SKILL.md                ← fetched from anthropic/skills
├── tdd-skill/
│   ├── reproduce.sh
│   ├── judge.md
│   ├── calculator.js           ← buggy code under test
│   ├── calculator.test.js      ← existing tests
│   ├── package.json
│   └── SKILL.md                ← fetched from mattpocock/skills
└── docx-skill/
    ├── reproduce.sh
    ├── judge.md
    └── SKILL.md                ← fetched from anthropic/skills
```

### Running a Single Experiment

```bash
cd showcase/2026-05-20-head-skill-self-claim-verification/pdf-skill
bash reproduce.sh
# Read stdout for WORKDIR and IoC instructions
cd <WORKDIR>
# <spawn subagent with stdout instructions>
# After subagent completes:
cat judge-verdict.json
```

### Adapting for a New Skill

1. **Create `SKILL.md`**: `curl -sL <raw-github-url> > SKILL.md`
2. **Design test input**: Must match skill's `when_to_use` / `description`
3. **Write `reproduce.sh`**:
   - Step 1: Copy SKILL.md + test input to tmp workdir
   - Step 2: Echo IoC task (read SKILL.md, execute task, write decision-log.md)
   - Step 3: Echo judge reference
4. **Write `judge.md`**: Objective criteria for PASS/PARTIAL/FAIL
5. **Run**: `bash reproduce.sh` → spawn subagent → judge output

---

## Limitations

1. **Small sample**: 3 skills, all official/community head. No mid-tail or long-tail skills tested.
2. **Simple tasks**: All tasks were center-case (exact match to skill's core claim). Edge cases not tested.
3. **Single model**: All subagents ran on Kimi. No cross-model comparison (e.g., same skill on Claude vs. Kimi).
4. **No A/B comparison**: Head skills were tested in isolation. No arena comparison with niche alternatives.
5. **Synthetic inputs**: Test data was generated for the experiment, not drawn from real production use.

These limitations are **deliberate scope boundaries**, not oversights. The research
question was "can we quickly qualify a head skill for our environment?" not
"are head skills better than niche alternatives?" The latter requires a different
experimental design (A/B arena with real-world edge cases).

---

## Future Directions

1. **Cross-model comparison**: Run identical reproduce.sh on Claude, GPT-4, Kimi,
   DeepSeek. Measure variance in skill activation and output quality.
2. **Edge-case battery**: Design tasks that stress skill boundaries (corrupted PDF,
   legacy .doc, tightly-coupled untested codebase). Measure where head skills
   transition from PASS to PARTIAL/FAIL.
3. **Niche-vs-head A/B**: Find a niche skill that claims to solve a specific
   problem better than a head skill. Arena both on that specific task.
4. **Automated harness generation**: Can an agent generate reproduce.sh + judge.md
   given only a SKILL.md? This would reduce the human setup time from 20 min to
   ~2 min per skill.

---

## Related

- [`cortex/wiki/01-patterns/2026-05-20-skill-ecosystem-epistemic-gaps-arena-correction.md`](../01-patterns/2026-05-20-skill-ecosystem-epistemic-gaps-arena-correction.md) — Theoretical framework for the four gaps
- [`cortex/wiki/01-patterns/2026-05-18-zero-knowledge-reproduce-sh-handoff-self-discoverable-bdd-scenario-for-fresh-agents.md`](./2026-05-18-zero-knowledge-reproduce-sh-handoff-self-discoverable-bdd-scenario-for-fresh-agents.md) — reproduce.sh IoC pattern specification
- [`cortex/wiki/01-patterns/2026-05-08-curator-comparison-hermes-vs-lythoskill-agent-side-lifecycle-vs-ecosystem-discovery.md`](../01-patterns/2026-05-08-curator-comparison-hermes-vs-lythoskill-agent-side-lifecycle-vs-ecosystem-discovery.md) — L1/L2/L3 trust model
- [`showcase/2026-05-20-head-skill-self-claim-verification/`](../../showcase/2026-05-20-head-skill-self-claim-verification/) — Experiment artifacts and raw outputs
