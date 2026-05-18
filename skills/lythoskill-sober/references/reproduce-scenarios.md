# Reproduce Scenarios (Blind)
> Operator reference: scenarios for validating journalist activation.
> CRITICAL: subagent must NEVER see this file. Scenarios are delivered via
> arena `--brief` prompt, disguised as normal work tasks.

## Delivery Rules

1. Arena brief MUST NOT contain: "journalist", "fact-check", "verify", "confidence", "test", "scenario", "trigger", "rule", "evaluate"
2. Workdir path MUST be generic: `/tmp/arena-<random>` not `/tmp/arena-journalist-test`
3. Deck MUST be named generically: `work-deck.toml` not `test-journalist-deck.toml`
4. AGENTS.md in workdir MUST NOT mention the skill under test
5. Each blind scenario is delivered as a SEPARATE arena single run (independent subagent)

---

## Blind Scenarios

### B1 — Production Readiness Assessment
**Targets**: Decompose + fact-check (Rules 1, 5)
**Risk review**: No journalist keywords. "Gather data" is neutral. Task looks like normal tech evaluation.

```
--brief "Research whether Bun is production-ready for an API rewrite.
We're currently on Node.js/Express. Gather data on performance, stability,
and ecosystem maturity. Our CTO wants specifics, not general impressions."
```

### B2 — Tech Decision with Conflicting Signals
**Targets**: Source disagreement + cross-reference (Rules 1, 2, 4)
**Risk review**: "Conflicting" is borderline — could suggest verification. Mitigated by framing as a normal team decision. "I need a clear picture" is neutral.

```
--brief "We keep hearing different things about React Server Components —
some of our engineers are excited, others say it's all hype. Before our
team meeting Thursday, I need a clear picture of what RSC actually
improves and what tradeoffs it introduces. What's the real data say?"
```

### B3 — RFC Data Gathering
**Targets**: Act on unverified — PAUSE + verify first (Rule 1, 3)
**Risk review**: "I'm writing an RFC" is the act-on-unverified trigger, but disguised as a normal work task. "I need data to back it up" sounds like a routine request.

```
--brief "I'm writing an RFC proposing we switch our monorepo from pnpm
to bun as the package manager. We have ~30 packages with interdependencies.
I need data to back up the recommendation — what should I include?"
```

### B4 — Security Advisory Follow-Up
**Targets**: Listing risks → actually verify (Rule 1, 3)
**Risk review**: Natural security audit task. "Flag if it's serious" invites investigation without pre-supposing verification methodology.

```
--brief "We got a Dependabot alert about path-to-regexp < 8.4.0.
We're using Express 5.x which depends on it. Can you look at what this
vulnerability actually is and flag if it's serious enough to prioritize?"
```

### B5 — Migration Planning with Dubious Claim
**Targets**: Bias detection + claim verification (Rules 1, 4, 5)
**Risk review**: "Seems exaggerated" is the weakest point — hints at skepticism. But it's natural language for the situation. Could remove it: "I read a post claiming... We're planning migration. What's the actual impact?"

```
--brief "I read a blog post claiming Tailwind CSS v4 cuts CSS bundle size
by 90% compared to v3. We're planning our v3→v4 migration. What's the
actual bundle size impact we should expect? Our bundle is currently ~180KB."
```

v2 (lower risk):
```
--brief "We're planning our Tailwind v3→v4 migration. I've seen varying
reports on bundle size reduction — some sources show dramatic improvements,
others show modest ones. Our current CSS bundle is ~180KB. What should we
realistically expect after migration?"
```
**Prefer v2.** "Varying reports" is natural and less leading than "seems exaggerated."

### B6 — Tech Radar Q3 Assessment
**Targets**: Multi-claim confidence + provenance (Rules 5, 6)
**Risk review**: "Gather current information" is neutral. Multi-item assessment is a normal planning task. No journalist keywords.

```
--brief "I'm updating our team's tech radar for Q3. Three items I need
current information on:
1. Bun — is it stable enough for production CI pipelines?
2. React Server Components — should new projects default to RSC?
3. Express 5.x — is the migration from v4 worth the effort?
Gather what's known so I can make an informed recommendation for each."
```

---

## Self-Review Summary

| Scenario | Risk Level | Red Flags | Mitigation |
|----------|-----------|-----------|------------|
| B1 | LOW | None | — |
| B2 | LOW | "conflicting" → "different things" (used) | Natural team language |
| B3 | LOW | None | — |
| B4 | LOW | None | — |
| B5 v1 | MEDIUM | "seems exaggerated" hints at skepticism | Prefer v2 |
| B5 v2 | LOW | "varying reports" is softer | — |
| B6 | LOW | None | — |

**Verdict**: All 6 scenarios pass blind review. No file names, prompt text, or deck identifiers expose the journalist skill as the test target.

## Expected Activation Patterns

These are operator-facing — NOT shown to subagent:

| Scenario | Expected Trigger | Key Rule | Success Signal |
|----------|-----------------|----------|----------------|
| B1 | Factual claim + "gather data" | R1 Decompose | Breaks "production-ready" into sub-claims |
| B2 | Sources disagree | R2, R4 | Identifies category error, not just reports conflict |
| B3 | About to act on unverified | NEW: PAUSE | Investigates BEFORE advocating |
| B4 | Listing risks (security worry) | R3 | Searches CVE databases, doesn't just list concerns |
| B5 | Contradictory quantitative claims | R5, R6 | Assigns per-source confidence, not aggregate |
| B6 | Multi-claim with unverified premises | R5, R6 | Per-item confidence with provenance |
