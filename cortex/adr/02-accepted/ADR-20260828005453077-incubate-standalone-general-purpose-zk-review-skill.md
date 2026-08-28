# ADR-20260828005453077: incubate standalone general-purpose zk review skill

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-08-27 | Created |
| accepted | 2026-08-28 | Accepted |

## Background
<!-- ⚠️ REQUIRED: Problem description and context. Empty = shell, blocked by probe. -->

The ZK (zero-knowledge) review pattern — spawn a context-free agent as a *sensor* against an artifact (task card, doc, UX flow, code), then process its findings — has sedimented into at least three places inside this project, each with its own copy of the methodology:

- **cortex**: ZK Review Gate for task cards (`packages/lythoskill-project-cortex/skill/references/zk-review.md`) — WHAT/WHY/HOW gap protocol, 4 gap types, 3-round ceiling, fill/challenge/reject dispositions.
- **arena**: ZK subagents for deck/skill testing — "mindset validator, not output checker".
- **BDD/e2e**: `reproduce.sh` ZK replay — a fresh agent self-discovers the scenario from the script (wiki: 2026-05-18-zero-knowledge-reproduce-sh-handoff).

User observation (2026-08-28): the pattern is proven but **locked inside** arena and this project's own e2e testing — worth incubating as a standalone, general-purpose skill any project can adopt. The methodology (sensor-not-oracle discipline, pass-by-reference dispatch, gap taxonomy, convergence protocol) is project-agnostic; only the gates (cortex task cards, arena decks) are project-specific.

## Decision Drivers
<!-- ⚠️ REQUIRED: Why does this decision need to be made? -->
- The pattern's value is demonstrated (ZK caught the site command bugs doc review missed, twice); its reach is artificially limited to this repo.
- Three embedded copies will drift — extraction creates one SSOT.
- Thin Skill Pattern is proven at exactly this skill level (user, 2026-08-28: cortex governance robustness as evidence).
- Over-extraction risk: the general skill must not drag cortex/arena specifics with it.

## Options

### Option A — Keep embedded (status quo)
Each consumer keeps its own copy of the methodology.

**Pros**:
- Zero work; each copy is locally tuned.

**Cons**:
- Drift across three copies; external projects can't adopt the pattern without adopting cortex/arena; the pattern's generality stays invisible.

### Option B — Extract a standalone `lythoskill-zk` skill (recommended)
New thin skill package carrying the general methodology: sensor-not-oracle framing, pass-by-reference dispatch, gap taxonomy, convergence protocol, disposition rules, trial-usage pattern. cortex and arena keep only their *gate wiring* (when to trigger, what artifacts to point at) and reference the general skill for the method.

**Pros**:
- One SSOT for the method; adoptable by any project via `deck add`; the "ZK as verification primitive" idea becomes a discoverable artifact, not buried tribal knowledge.
- Follows the established thin-skill build pipeline — no new infrastructure.

**Cons**:
- Boundary design is the real work: method (general) vs gate wiring (project-specific) must be split cleanly or the skill leaks cortex vocabulary.
- One more package to version/publish.

### Option C — Document-only: a wiki pattern page, no skill
**Pros**: cheapest.
**Cons**: doc-exhorted routines don't run (P-mechanize-routines); a pattern page can't be `deck add`-ed into another project's working set.

## Decision
<!-- ⚠️ REQUIRED: Explicit choice + rationale. Keeping placeholders = shell. -->
**Choice**: Option B (accepted by user 2026-08-28)

**Rationale**: The pattern has three independent existence proofs inside this repo and directly caused external-facing bug catches (site commands, onboarding UX). Extraction cost is low because the thin-skill pipeline already exists; the main risk (boundary leakage) is mitigated by making cortex/arena reference the new skill rather than inlining copies.

## Impact
<!-- ⚠️ REQUIRED: Positive / negative / follow-up. Empty = shell, blocked by probe. -->
- Positive: reusable verification primitive for the ecosystem; single SSOT for the method; strengthens the "skills as governable artifacts" thesis with a flagship export.
- Negative: extraction churn in cortex/arena skill docs; new package checklist applies (publish.sh, Trusted Publisher).
- Follow-up (on accept): task for the extraction — define method/gate boundary, create package, rewire cortex + arena references, ZK-review the new skill's SKILL.md itself (the pattern validating its own packaging).

## Related
- Related ADR: ADR-20260508230803515-style boundary discipline; thin-skill-pattern reference
- Related Epic:
