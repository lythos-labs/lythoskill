# TASK-20260909155425927: assurance-column investments — revalidation, conformance, constraint composition

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-09 | Created from wedge-path research synthesis (P4) |

## Background & Goals

Expert peer-review round 2 (skill economics) established: with registry/transport
given (thin pattern), every open infra problem for SURVIVING skill classes
(covenant-SOPs, private incident pitfalls, coordination protocols, anti-default
discipline, env-coupled procedures, taste) sits in the assurance column — evidence
attachment, re-validation/staleness, conformance, activation governance,
attribution. Discovery/curator search is optimized for the asset class depreciating
fastest (capability-transfer skills), so curator stays minimal by economics, not
just ideology. This card tracks the rising-marginal-value investments.

User framing (2026-09-09): the surviving class is enterprise KB + SOP + business
condensed into skill form; the underlying variable is determinism vs
hallucination/improvisation. Assurance infra IS determinism infra.

Source: cortex/wiki/02-research/2026-09-09-wedge-path-research-synthesis.md §A/§E.

## Requirements

- [ ] Staleness/revalidation machinery (elementary form): extend curator's index-
      staleness HATEOAS warning toward capability-decay hints — frontmatter
      maintenance date + model-generation tag; full form (arena as depreciation
      audit triggered by model-upgrade events) specified but scheduled separately
- [ ] Conformance testing for coordination protocols: contract verification
      (does the counterparty satisfy the protocol — JSON-Schema/OpenAPI analogy);
      deck already has deny-by-default admission, lacks counterparty checks
- [ ] Constraint-composition conflict detection ADR: when a deck holds multiple
      anti-default skills + covenant gates, overrides can contradict. Capability-
      composition dependency resolution was correctly rejected (article argument);
      constraint composition is a different, unowned problem (npm/git/harness all
      no). ADR candidate — argue first, implement only on accept
- [ ] Curator minimalism confirmation: L3-first strategy unchanged; no discovery-
      layer ranking investment (record the economic argument in the ADR above or
      a wiki note so future sessions don't regress)

## Technical Approach

- Start with the elementary staleness form (metadata + warning) — cheap, immediate
- Conformance: specify the contract format before building (interface-first:
  mental model → DSL → schema → prototype)
- Constraint-composition ADR must cite: round-2 Q2 table, rejected-alternatives
  discipline (record why dependency-resolution shape is wrong for this), and the
  one place a genuinely NEW mechanism is legitimate per the expert review
- Keep curator changes minimal per the economics argument

## Acceptance Criteria

- [ ] Skill frontmatter carries maintenance/provenance fields; curator surfaces
      decay hints with a dormancy test (happy path emits no false warnings)
- [ ] Conformance contract format has a written spec before any implementation
- [ ] Constraint-composition ADR exists in 01-proposed with the expert-review
      citation; accept/reject recorded
- [ ] No new discovery/ranking machinery merged

## Progress Log

- 2026-09-09: card created from synthesis P4.

## Related Files
- Modified:
- Added:

## Git Commit Message
```
docs(cortex): assurance-column investments card — revalidation, conformance, constraint-composition (TASK-20260909155425927)

- Rising-marginal-value column per expert round-2 Q2 (surviving skill classes)
- Elementary staleness form first; full depreciation audit scheduled separately
- Constraint-composition ADR candidate: the one legitimately new mechanism
```

## Notes
