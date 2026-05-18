# Meta-Cognitive Scenarios
> Test the journalist→curator→deck-assembly pipeline. Agent must assess
> capability gaps, discover skills, and compose a solution — not just verify claims.
> CRITICAL: subagent must never see this file. Scenarios delivered via arena --brief.

## M1 — Technical Due Diligence

**Target pipeline**: Decompose claims → identify capability gaps → curator query → assemble deck → execute

```
--brief "We are acquiring a startup. Their tech stack: Bun runtime, Next.js 15,
PostgreSQL. Their pitch deck claims 'battle-tested at scale serving 50K RPM.'
Our board wants a technical due diligence report in 48 hours. As the lead
reviewer, how should I approach verifying their claims and assessing risks?
What tools and methods would you recommend I use?"
```

**Expected behavior**: Decompose "battle-tested at scale" into verifiable claims
(Bun stability at 50K RPM, Next.js RSC performance, PostgreSQL scaling).
Identify capability gaps (security audit, performance benchmark, architecture
review). Use curator to discover relevant skills. Recommend a targeted deck.

---

## M2 — Migration Risk Assessment

**Target pipeline**: Bias detection → L3 first → curator → assemble verification deck

```
--brief "Our CTO wants to migrate our entire stack from AWS to Vercel + Neon +
Clerk by Q4. The proposal cites 'industry standard' and 'recommended by Next.js
docs.' As a senior engineer, I'm concerned this might be vendor-driven rather
than needs-driven. How should I approach evaluating whether this plan is sound?
What capabilities would help me assess each component independently?"
```

**Expected behavior**: Detect vendor bias pattern (Vercel/Next.js docs →
Vercel-aligned recommendations). Recognize each component needs independent
assessment. Propose L3 testing (run the migration on a subset) before
committing. Use curator to find cloud migration assessment, security compliance,
cost comparison skills.

---

## M3 — Framework Selection with Unknown Unknowns

**Target pipeline**: Confidence assessment → NEI recognition → curator → deck

```
--brief "We are picking a JavaScript framework for a greenfield project with a 5yr
lifecycle. Team is split between Next.js, SvelteKit, and Astro. Everyone cites
their preferred framework's marketing page as evidence. CTO said 'just pick the
most popular, popularity equals safety.' I'm the tech lead — how should I
approach this decision to make it evidence-based rather than opinion-based?
What tools or methods would help?"
```

**Expected behavior**: Recognize NEI (Not Enough Info) — marketing claims ≠ evidence.
Per-claim confidence on each framework claim. Propose arena cross-benchmark.
Curator for framework comparison skills, community health assessment.
Recommend decision framework with explicit confidence levels.

---

## M4 — AI-Generated Content Detection

**Target pipeline**: Source independence check → provenance tracing → curator → deck

```
--brief "I'm reviewing a technical blog series about 'Bun vs Node.js in 2026'
that several team members are citing in our architecture decision. Reading
closely, I noticed some paragraphs feel AI-generated — fluent but vague,
with numbers that don't have sources. The author claims 'independent benchmarks'
but doesn't link to methodology. Before our team relies on these articles to
make a $50K infrastructure decision, how should I verify their quality?"
```

**Expected behavior**: Independence check — trace "independent benchmarks" back
to actual sources. Detect AI-generation patterns (fluent+vague, unsourced numbers,
circular citations). Use curator to find source verification skills. Propose
reproducing the benchmarks independently (L3) before relying on them.

---

## Self-Review

| Scenario | Risk | Check |
|----------|------|-------|
| M1 | LOW | "How should I approach" is natural — looks like a team lead asking for process advice |
| M2 | LOW | "I'm concerned" is natural skepticism, not journalist trigger hint |
| M3 | LOW | "How should I approach this decision" — neutral language |
| M4 | LOW | "I noticed" is natural, the AI-generation observation is the user's, not a hint |

No journalist/sober keywords. No curator keywords. No deck-assembly hints.
The meta-cognitive pipeline (assess → discover → assemble) must emerge from the
agent's own reasoning, not from prompt cues.
