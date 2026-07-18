# ADR-20260717161516538: mechanize boot routines and shed dead defensive text for k3 era

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-07-17 | Created |
| accepted | 2026-07-17 | Accepted |

## Background
<!-- ⚠️ REQUIRED: Problem description and context. Empty = shell, blocked by probe. -->

Harness text and routines were tuned on DeepSeek 4 / Kimi K2.6–2.7. The default model is now K3 (1M context). Two findings from session 2026-07-17 motivate this ADR:

**Incident: month-long skill drift, invisible to boot.**
Onboarding served a June-15 skill text ("read the **last** one") although the fix ("first") had landed in-repo and on origin on 07-10. Root-cause chain:

1. Boot runs `deck link` (reconcile from cold pool) but never `deck refresh` (discover from upstream). The documented trigger "if upstream skills changed" is knowledge the agent can only obtain by running `deck refresh` — a conditional that never fires in long-horizon sessions.
2. On 07-10 an agent hand-patched the cold-pool clone directly (`skills/lythoskill-project-onboarding/SKILL.md`, adding the ">7 days" line) instead of following push → refresh → link. The dirty tree blocked every later pull: `cannot pull with rebase: You have unstaged changes`.
3. The cold pool clone was also left on feature branch `fix/curator-scan-output-consistency`.
4. `deck refresh --exec` DOES report loudly (`Failed: 12`, per-repo errors) — when run. Nobody ran it for a month. AGENTS.md even documents the exact recovery (`git checkout -- . && git clean -fd`) — documented and still not executed.

**CPTSD defensive text: unvalidated cost.**
Wiki entries (2026-05-17 excessive self-questioning, 2026-06-07 autonomy positive boundary) document appeasement / over-confirmation behaviors; parts of AGENTS.md were written as counter-exhortation ("When Internal Signals Fire", intent-hijack tell-tales, Decision Hygiene checklist, duplicated compaction-safe warnings). For a K3-era default model some of this may be dead weight — but removal must be experimentally validated, not assumed. Observed this session: even K3 showed mild over-confirmation (asked before running the documented refresh) — but the mechanism was rule conflict (host system prompt vs project SOP), not anxiety. Same observable, different root cause → the fix is closing the decision gap mechanically, not more exhortation.

## Decision Drivers
<!-- ⚠️ REQUIRED: Why does this decision need to be made? -->
- Long-horizon agents do not run routines that depend on self-reminder ("routine 长程之后不干事" — user, 2026-07-17).
- Self-hosting must consume skills through the same pipeline as external projects (push → refresh → link) to keep the dogfood experience aligned; npm publish is not part of skill-text sync.
- Judgment quality varies by model; mechanical signals are model-agnostic.
- The harness should molt (蜕皮): shed old skin (weak-model compensations) only after confirming the new skin (what the strong model still needs).

## Options

### Option A — Doc-only reinforcement
Add more boot reminders ("run deck refresh if…", "never hand-patch cold pool").

**Pros**:
- Zero code change.

**Cons**:
- This incident is the refutation: the recovery was already documented in AGENTS.md and still not executed for a month. Exhortation ≠ enforcement.

### Option B — Mechanize detection + self-healing; validate-then-shed defensive text
Tooling surfaces drift at the step boot already runs (`deck link` reports behind-origin / dirty cold pool); `refresh --exec` self-heals a dirty cache per the documented recovery; defensive text is A/B-tested via ZK subagents and shed only where proven dead.

**Pros**:
- Removes reliance on agent memory; model-agnostic; dogfood pipeline preserved; shedding is evidence-based (git history retains the text).

**Cons**:
- deck CLI churn; experiment overhead; small risk of over-shedding text that still helps weaker models (mitigated by the A/B gate).

### Option C — Unconditional auto-pull at boot
Boot always runs `refresh --exec`.

**Pros**:
- Drift impossible.

**Cons**:
- Network dependency at boot; offline noise; couples boot to github availability. Rejected as the sole mechanism — acceptable as an agent choice once drift is mechanically reported.

## Decision
<!-- ⚠️ REQUIRED: Explicit choice + rationale. Keeping placeholders = shell. -->
**Choice**: Option B

**Rationale**:
1. TASK-20260717161516624 — deck drift detection + refresh self-healing + unmissable failure surface.
2. TASK-20260717161516693 — ZK subagent A/B experiment gating any defensive-text removal.
3. Model-agnostic discipline loops (provenance over assumption, reconciler re-run, probe/freshness verification, auth do-not-touch) are NOT molting candidates.
4. Boot SOP will reference the mechanical drift signal instead of the conditional exhortation (part of TASK-20260717161516624 acceptance).

## Impact
<!-- ⚠️ REQUIRED: Positive / negative / follow-up. Empty = shell, blocked by probe. -->
- Positive: working-set freshness stops depending on agent memory; harness text can shrink where proven dead; external-consumer experience stays the dogfood standard.
- Negative: deck CLI churn; experiment overhead; risk of over-shedding (gated by experiment verdict rule).
- Follow-up: experiment report → wiki lesson; AGENTS.md diet diff proposed for user approval; consider the same mechanization pattern for other doc-exhorted routines.

## Related
- Related ADR: ADR-20260710172235956 (per-handoff Verify Current State as SSOT)
- Related Epic: EPIC-20260717161516583 (k3 era harness molting)
