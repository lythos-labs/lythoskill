---
created: 2026-07-10
updated: 2026-07-10
category: pattern
---

# ZK Review Trade-off Awareness

> ZK agent exposes gaps. Before treating every gap as a defect, ask: "What's the alternative? What would it cost?"

## Context

ZK Review's standard output is a gap list. The natural reflex is "fix all gaps." But many gaps are not defects — they are **reasonable trade-offs** where the current design accepts a cost to avoid a higher cost.

This pattern adds a second layer to ZK Review: **gap assessment with trade-off awareness**. The reviewer (human or agent) must ask "what's the alternative?" before flagging a gap as a problem.

## The Anti-Pattern: "Fix All Gaps"

**Symptom**: ZK agent reports "INDEX.md is stale (27 days old)" → immediate reaction: "Add auto-regeneration!"

**What's missed**:
- Auto-regeneration requires a trigger mechanism (hook? cron? agent自律?)
- Each trigger has lifecycle costs: hook fails → blocks commit; cron runs → wastes resources; agent forgets → stale again
- The real issue may be "INDEX.md's role is unclear", not "INDEX.md is stale"

**Result**: Over-engineering a solution for a non-problem.

## The Pattern: "Gap → Alternative → Cost → Verdict"

For every gap, run this sequence:

```
Gap: [ZK agent finding]
Alternative: [What would replace the current design?]
Cost of Alternative: [What does the alternative break or burden?]
Verdict: [Fix / Accept / Document / Challenge ZK]
```

## Examples from Project History

### Example 1: INDEX.md "staleness" (2026-07-10)

| | |
|---|---|
| **Gap** | INDEX.md "Last updated: 2026/6/13" — 27 days stale |
| **Alternative** | Auto-regenerate on every epic/task state change |
| **Cost** | Requires hook or cron; hook failure blocks commit; cron wastes resources; still has latency |
| **Verdict** | **Accept** — INDEX.md is a curated portal, not a dashboard. Real-time status is `cortex probe`. |
| **Action** | Add HATEOAS header: "What this file is / is NOT" |

### Example 2: Handoff stale detection "manual" (2026-07-10)

| | |
|---|---|
| **Gap** | Agent must manually compare git_commit from handoff against `git log` |
| **Alternative** | Script auto-detects staleness at boot time |
| **Cost** | Script requires environment (bun install + deck link); adds boot complexity; rare condition (most sessions handoff fresh) |
| **Verdict** | **Accept** — Manual comparison is 2 commands, zero dependency, always works. |
| **Action** | Document in AGENTS.md: "Compare git_commit against HEAD" |

### Example 3: Onboarding skill "omits bun install" (ZK Round 1, 2026-07-10)

| | |
|---|---|
| **Gap** | Onboarding skill doesn't mention `bun install` or `deck link` |
| **Alternative** | Add full boot sequence to onboarding skill |
| **Cost** | Onboarding skill becomes 200+ lines; duplicates AGENTS.md; violates "compact skill" principle |
| **Verdict** | **Challenge ZK** — Onboarding skill is Layer 2 (session state loader), not Layer 1 (environment setup). Boot sequence is in AGENTS.md by design. |
| **Action** | Clarify onboarding skill's role: "This skill loads session state. For environment setup, read CLAUDE.md → AGENTS.md." |

### Example 4: Two INDEX.md files "naming confusion" (ZK Round 2, 2026-07-10)

| | |
|---|---|
| **Gap** | `cortex/INDEX.md` and `cortex/wiki/INDEX.md` both named "INDEX" — agent confuses which to check first |
| **Alternative** | Rename one to `GUIDE.md` or `README.md` |
| **Cost** | Breaks 20+ existing references; requires updating generate-index.ts; agent may not recognize new filename |
| **Verdict** | **Accept** — Both are module entry points in a fractal structure. Naming consistency is a feature. |
| **Action** | HATEOAS header clarifies each INDEX's scope. |

## When to Challenge ZK (vs Fix)

| Signal | Action |
|--------|--------|
| ZK says "X is missing" but X exists in a referenced document | Challenge — ZK didn't follow the reference |
| ZK says "Y is confusing" but Y is a domain convention | Challenge — ZK lacks domain knowledge |
| ZK says "Z is slow/manual" but automation has higher cost | Accept — trade-off is intentional |
| ZK says "W is stale" but W is a curated snapshot, not a live feed | Accept + document — clarify role |

## When to Fix (vs Accept)

| Signal | Action |
|--------|--------|
| ZK says "X is missing" and X is critical for execution | Fix — add to task card |
| ZK says "Y is confusing" and Y is a user-facing command | Fix — rename or add alias |
| ZK says "Z is inconsistent" and inconsistency causes real errors | Fix — standardize |
| Multiple ZK agents independently report the same gap | Fix — doc ambiguity, not agent failure |

## Integration with Standard ZK Review

Standard ZK Review (3 rounds):
1. Spawn ZK agent → WHAT/WHY/HOW/GAPS
2. Process gaps → fill / challenge / ignore
3. Converge at <2 new gaps

**Trade-off Aware ZK Review** (adds step 2.5):
1. Spawn ZK agent → WHAT/WHY/HOW/GAPS
2. **For each gap: Alternative? Cost? Verdict?**
3. Process gaps → fix / accept / document / challenge ZK
4. Converge at <2 new gaps

## Related

- [ZK Review cognitive foundations](./2026-06-15-zk-review-cognitive-foundations-curse-of-knowledge-review-continuity-attention-economy.md) — why ZK works
- [ZK Review reference](../../packages/lythoskill-project-cortex/skill/references/zk-review.md) — operational guide
- [daily/2026-07-10.md](../../../daily/2026-07-10.md) — this pattern's origin session
- [ADR-20260710111933808](../../adr/02-accepted/ADR-20260710111933808-index-md-hateoas-boundary-explicit-is-is-not-contract-for-derived-state-curation.md) — HATEOAS boundary as trade-off example

---

**一句话总结**：ZK agent暴露的gap是信号，不是命令。处理者需要判断是"设计缺陷"还是"设计选择未被理解"——每个gap都值得问一句"不然呢"。
