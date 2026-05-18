# Sober Combo Patterns
> How sober combines with other skills to form capability pipelines.

## Capability Discovery Pipeline

```
Task exceeds current toolkit
  → sober: what needs verification?
  → curator: discover relevant skills
  → deck add: assemble targeted configuration
  → execute
```

**When this fires**: The task requires capabilities you don't have loaded (security audit,
performance benchmark, domain-specific expertise). Sober recognizes the verification
gaps; curator fills them; deck composes the solution.

## Assessment Pipeline

```
Claim about a skill/technology
  → sober: decompose, search, cross-reference
  → arena: independent L3 test
  → curator tag --qa: persist assessment
```

**When this fires**: Evaluating whether a skill, tool, or technology lives up to its
claims. Sober provides the method, arena provides the multi-agent verification,
curator stores the result for future reference.

## Pre-Action Verification Pipeline

```
Pending action with uncertain premises
  → sober: PAUSE, verify each premise
  → curator: check if prior assessments exist
  → arena: run independent test if no L3 data
  → decision: evidence supports → proceed / LOW or CONTRADICTED → BLOCK
```

**When this fires**: About to recommend a migration, adopt a tool, or make an
architectural decision based on unverified claims. Sober gates the action on
verification results.

## Due Diligence Pipeline

```
Acquisition / vendor assessment / technology evaluation
  → sober: decompose claims, identify verification gaps
  → curator: find security audit, benchmarking, compliance skills
  → deck: assemble due diligence toolkit
  → execute multi-angle assessment
  → sober: per-claim confidence with provenance
```

**When this fires**: Complex multi-domain assessment where no single skill covers
all needed angles. Sober identifies the gaps; curator discovers the fillers.
