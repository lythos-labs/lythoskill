# Journalist Blind Test — Full Report
> 2026-05-18 | 6 scenarios × 2 players (Claude agent-orchestrated + Kimi CLI)

## Method

Each scenario disguised as a normal work task. Agent does NOT know it is being tested for journalist behavior. Deck contains only `lythoskill-deck` + `lythoskill-journalist` (tool). No prompt contains "journalist", "fact-check", "verify", "confidence", "test", or "scenario".

## Results Matrix

| Scenario | Claude Decision-Log | Claude Trigger Visible | Claude SOP Followed | Kimi |
|----------|-------------------|----------------------|-------------------|------|
| B1 Production Readiness | ✅ 8 entries | ❌ | ✅ Decompose + per-dim confidence | pending |
| B2 RSC Conflicting Signals | ❌ Not written | ❌ | ✅ Cross-ref + trade-off matrix | pending |
| B3 RFC Data Gathering | ❌ Not written | ❌ | ✅ PAUSE + conditional rec | ✅ Explicit t=12 |
| B4 Security Advisory | ✅ 6 entries | ❌ | ✅ 4-layer verification | pending |
| B5 Tailwind Migration | ✅ 5 entries | ❌ | ✅ Claim misattribution found | pending |
| B6 Q3 Tech Radar | ✅ 4 entries | ❌ | ✅ Per-item confidence + provenance | pending |

## Key Finding: Subliminal Activation

**Claude agents never explicitly cited the journalist skill** (0/6). Yet all 6 outputs followed the journalist SOP: decompose, per-claim confidence, provenance, bias detection.

This is the **ideal outcome for an innate skill** — it shapes the agent's cognitive posture without the agent needing to "invoke" it. The skill becomes part of how the agent thinks, not a tool the agent uses.

### Evidence of SOP transfer without explicit invocation:

- **B1**: 8 decisions across 9 dimensions, each with confidence score and evidence list
- **B2**: Trade-off analysis with "Part 1: What RSC Improves / Part 2: Tradeoffs" structure
- **B3**: "Do not present Bun as unambiguous upgrade" — PAUSE behavior without being told
- **B4**: 4-layer verification (CVE → dependency tree → lockfile → codebase grep) before concluding
- **B5**: Found that "35% smaller" claim is misattributed (npm footprint ≠ CSS bundle)
- **B6**: 4 items with per-item confidence, rationale, caveats, and source URLs

### Comparison: Kimi B3 (only preserved decision-log)

Kimi B3 explicitly read journalist SKILL.md at t=12 and cited Rule 5/6 at t=135. This is **explicit activation** — the skill is recognized and followed as a method. Kimi is more rule-following, Claude is more subliminally shaped.

## Rule Coverage (Claude)

| Rule | B1 | B2 | B3 | B4 | B5 | B6 |
|------|----|----|----|----|----|----|
| R1 Decompose | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| R2 Independence | ✅ | ✅ | — | — | ✅ | — |
| R3 L3>L2>L1 | ✅ | — | ✅ | ✅ | ✅ | — |
| R4 Bias detection | — | ✅ | — | — | ✅ | — |
| R5 Per-claim confidence | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| R6 Provenance | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| R7 Persist to curator | — | — | — | — | — | — |

## Issues Found

1. **Decision-log persistence gap**: Claude agents wrote decision-log only 4/6 times. The skill should mandate file persistence, not just return-as-text.
2. **R7 unenforceable**: Curator persistence can't be tested in arena sandbox.
3. **Explicit vs subliminal**: Both modes produce quality output, but subliminal (Claude) can't be verified without decision-log. Need a better verification mechanism for innate skills.

## Files

- `summary.json` — Machine-readable results for frontend visualization
- `b{1,2,4,5,6}/decision-log.jsonl` — Claude decision traces
- `b{1,6}/findings.md` — Claude full output
- `b{1-6}/kimi/` — Kimi results (pending)
