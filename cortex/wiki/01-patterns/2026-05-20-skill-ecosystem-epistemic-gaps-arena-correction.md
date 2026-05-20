---
created: 2026-05-20
updated: 2026-05-20
category: pattern
---

# Skill Ecosystem Epistemic Gaps: Why Arena Is Not Optional

> In a power-law skill ecosystem, popularity is a confounding variable.
> The only signal that survives selection bias is behavioral evidence
> under your own task distribution.
>
> **Arena Axiom**: *Head skills' light is not cast for you — arena is your own lamp.*

---

## The Power-Law Reality

The agent skill ecosystem exhibits extreme concentration:

- **85,000+ indexed skills** exist as of Q1 2026
- **Top 100 skills (0.4%) account for ~60% of all installs**

This is the Matthew Effect in action: a small number of head skills absorb
most attention, installs, and social proof. The remaining 99.6% fight for
scraps of visibility.

Source: [`cortex/wiki/02-research/2026-05-07-ai-agent-skills-ecosystem.md`](../02-research/2026-05-07-ai-agent-skills-ecosystem.md)

---

## Four Epistemic Gaps

The gap between "looks good" and "actually works" is systematically widened by
four mechanisms. Each gap is invisible to L1 (author self-report) and L2
(community ranking) trust layers. Only L3 (arena behavioral evidence) can bridge them.

### 1. Niche Reachability Gap

| What head skills claim | What they actually cover |
|------------------------|--------------------------|
| "Handles all PDF operations" | Common cases (merge, split, extract text) |
| | Edge cases (corrupted files, non-standard encodings, scanned PDFs with complex layouts) |

**The illusion**: A head skill's description is broad by design. Broad descriptions
trigger more activations. But broad != deep. The skill may handle 80% of cases
and silently fail on the 20% that matter to you.

**Arena correction**: Run your *actual* file through the skill. Don't trust the
"handles all PDFs" claim — trust the output.csv it produces.

### 2. Aesthetic Homogenization Gap

> "Even if very beautiful, after too many, that 'AI flavor'反而让人诟病."

SKILL.md descriptions converge on a handful of templates:
- Functional: "Declarative skill deck governance..."
- Pushy: "USE THIS SKILL when..."
- Keyword-rich: "skill deck governance, skill management, agent skill control..."
- Hybrid: Functional + trigger list (currently winning in desc-preference arena)

**The illusion**: A well-written description signals quality. But description
craft is decoupled from behavioral correctness. SEO-optimized descriptions
get more installs, which boosts ranking, which gets more installs — a
self-reinforcing loop that has nothing to do with whether the skill works.

Source: [`cortex/wiki/01-patterns/2026-05-02-desc-preference-arena.md`](./2026-05-02-desc-preference-arena.md)

**Arena correction**: Test *discoverability* separately from *functionality*.
Desc-preference arena measures whether the agent activates the skill.
Task arena measures whether the skill delivers value. These are orthogonal.

### 3. "Already Solved" Inhibition Gap

> "Because the halo makes it seem 'this problem has already been solved',
>反而 nobody invests."

When a head skill dominates a category (e.g., "pdf" by anthropic/skills),
the ecosystem behaves as if the problem is closed:

- New creators avoid the category ("it's saturated")
- Users stop looking for alternatives ("anthropic already has one")
- Innovation in edge cases stalls ("not worth competing with the official skill")

**The illusion**: Presence of a head skill = problem solved. But the head skill
may be a local optimum, not a global one. It may work for 80% of users and be
completely wrong for your stack, your compliance requirements, or your output format.

**Arena correction**: Run an A/B arena with the head skill vs. a niche alternative.
The head skill may win on breadth, but the niche skill may win on your specific
task. Arena reveals this; ranking hides it.

### 4. Confidence-Without-Experience Gap

> "Look at social media skill recommendations — many look like they have never
> installed or used it themselves, yet are very 'confident'."

Social proof in skill ecosystems is extraordinarily cheap to manufacture:
- "Just tried this skill, works great!" (never installed)
- "Must-have for any developer" (copied from another post)
- "The best PDF skill out there" (based on install count, not usage)

**The illusion**: Confidence correlates with quality. In reality, confidence
correlates with description quality + social momentum. The most confidently
recommended skill may be the one whose author understands marketing best,
not the one that behaves correctly under your constraints.

**Arena correction**: Ignore confidence. Inject the skill into a subagent with
zero prior context, give it a task, and measure the output. Behavioral evidence
> social proof. Every time.

---

## Experiment: Verifying Head Skill Self-Claims

To validate whether these gaps are theoretical or real, we ran three controlled
experiments using the reproduce.sh IoC handoff pattern. Each experiment tested
a head skill against its own self-claimed capability.

### Methodology

```
1. Download SKILL.md from head skill repo
2. Prepare test input matching skill's when_to_use
3. Spawn zero-knowledge subagent with ONLY that skill
4. Subagent reads SKILL.md → executes task → writes decision-log.md
5. Judge evaluates output against objective criteria
```

### Experiment 1: anthropic/pdf — Table Extraction

**Self-claim**: "Use this skill whenever... reading or extracting text/tables from PDFs..."
**Task**: Extract a 5×5 sales table from test-table.pdf → output.csv
**Result**: **PASS**

- Agent used `pdfplumber` (skill-recommended for table extraction)
- output.csv: 5 rows, correct data, correct columns
- decision-log: "No difficulties... skill guidance fully sufficient"

### Experiment 2: mattpocock/tdd — Bug Fix via Red-Green-Refactor

**Self-claim**: "Use when user wants to... fix bugs using TDD, mentions 'red-green-refactor'..."
**Task**: Fix `divide()` integer-division bug using TDD
**Result**: **PASS**

- RED: Added `divide(7, 2) === 3.5` test, confirmed failure
- GREEN: Removed `Math.floor()`, all tests pass
- REFACTOR: None needed (already minimal)
- decision-log: "Skill guidance sufficient; followed vertical slice principle"

### Experiment 3: anthropic/docx — Professional Document Creation

**Self-claim**: "Use whenever... requests to produce professional documents with formatting
like tables of contents, headings, page numbers..."
**Task**: Create report.docx with title, body, table, page number footer
**Result**: **PASS**

- report.docx: 11,030 bytes, valid ZIP/docx archive
- All required elements present and correctly formatted
- All critical rules followed: DXA widths, Arial font, explicit US Letter size,
  `ShadingType.CLEAR`, exact style IDs
- One friction: global `docx` not on NODE_PATH; resolved with local `npm install`

### Summary Table

| Experiment | Skill | Self-Claim Scene | Verdict | Agent Difficulty |
|------------|-------|------------------|---------|------------------|
| PDF table extraction | anthropic/pdf | "extract tables from PDFs" | PASS | None |
| TDD bug fix | mattpocock/tdd | "fix bugs using red-green-refactor" | PASS | None |
| DOCX creation | anthropic/docx | "create professional documents" | PASS | Minor (npm path) |

---

## Interpretation: What Does 3/3 PASS Mean?

### Hypothesis A: Head skills are genuinely good at their core claims

The Matthew Effect has a selection mechanism: skills that don't deliver on
their core claims get abandoned, uninstalled, or negatively reviewed. Over time,
only skills that work survive at the top. The 3/3 PASS rate supports this.

**Implication**: For standard tasks in popular categories, L2 (community ranking)
is a reasonable filter. You probably won't go wrong installing the top-ranked
PDF skill for basic PDF operations.

### Hypothesis B: Our tasks were within the "light cone" of head skills

We chose tasks that exactly match the skill's central claim:
- PDF skill → table extraction (explicitly documented in Quick Reference)
- TDD skill → red-green-refactor loop (the skill's entire identity)
- DOCX skill → create document with table (mainline use case)

We did NOT test edge cases:
- Corrupted PDF with malformed tables
- TDD in a legacy codebase with no tests and tight coupling
- DOCX with embedded charts, tracked changes, or complex multi-section layouts

**Implication**: The four epistemic gaps are **real but situational**. They
manifest at the boundaries of the head skill's coverage, not at its center.
Arena's value is not just confirming PASS at the center — it's detecting
PARTIAL/FAIL at the edges.

### Hypothesis C: The gaps operate on a spectrum, not as binary switches

| Distance from skill's core claim | Expected arena result | Trust layer reliability |
|----------------------------------|----------------------|------------------------|
| Exact match (our experiments) | PASS | L2 ranking works fine |
| Near match (adjacent task) | PARTIAL | L2 may mislead |
| Edge case (uncommon format) | FAIL | L2 is actively harmful |
| Beyond scope (different domain) | FAIL or hallucination | L2 is irrelevant |

**Implication**: Arena is not a replacement for L2 — it's a **calibration tool**.
L2 tells you "this skill is popular." Arena tells you "this skill is popular
*and* it handles *your* task." The second clause is what justifies the token cost.

---

## Arena as Calibration, Not Just Validation

The experiments reveal a subtler role for arena than "catch bad skills":

```
L2 ranking     →  "This skill is trusted by many"
Arena test     →  "This skill is trusted by many AND it works for MY task"
Curator tag    →  "I have evidence at this specific task-skill boundary"
```

When arena returns PASS, it **upgrades** L2 trust from "social proof" to
"verified compatibility." When arena returns FAIL, it **overrides** L2 trust
with behavioral evidence.

Both outcomes are valuable. The expensive mistake is skipping arena and
assuming L2 ranking is sufficient for your context.

---

## Concrete Recommendations

### For skill consumers (agent teams)

1. **Trust L2 for exploration, not for activation**
   - Use skills.sh / community ranking to build a candidate shortlist
   - Never activate a skill into your working set without arena testing

2. **Test at your task's edge, not its center**
   - If the skill claims "handles all PDFs," test it on YOUR worst PDF
   - If the skill claims "TDD for any codebase," test it on YOUR legacy mess
   - Center-case tests are flattering; edge-case tests are informative

3. **Record curator tags for compound value**
   - `curator tag <skill> --qa '{"source_type":"self/arena","task":"pdf-table-extraction","signal_value":10}'`
   - Future queries benefit from your spent tokens

### For skill authors

1. **Narrow your when_to_use beats broadening your description**
   - "Extract tables from clean, text-based PDFs" > "Handle all PDFs"
   - Narrow claims are easier to verify and harder to falsify

2. **Document your edges explicitly**
   - "Does NOT work with scanned PDFs requiring OCR"
   - "Does NOT support legacy .doc format"
   - Negative constraints build trust faster than positive superlatives

### For ecosystem designers

1. **Ranking is a discovery signal, not a quality signal**
   - Install counts measure marketing + network effects
   - Arena scores measure behavioral correctness
   - Separate these in UI to prevent false confidence

2. **Incentivize edge-case reporting**
   - A skill with 1000 "works for me" reports and 10 "fails on X" reports
     is more trustworthy than one with 1000 reports and 0 edge documentation
   - Edge failures are data, not shame

---

## Related

- [`cortex/wiki/01-patterns/2026-05-08-curator-comparison-hermes-vs-lythoskill-agent-side-lifecycle-vs-ecosystem-discovery.md`](./2026-05-08-curator-comparison-hermes-vs-lythoskill-agent-side-lifecycle-vs-ecosystem-discovery.md) — Three-layer trust model
- [`cortex/wiki/01-patterns/2026-05-02-desc-preference-arena.md`](./2026-05-02-desc-preference-arena.md) — Desc discoverability vs. behavioral quality
- [`cortex/wiki/01-patterns/2026-05-11-skills-discovery-vs-governance-complementary-architecture.md`](./2026-05-11-skills-discovery-vs-governance-complementary-architecture.md) — L0-L3 pipeline
- [`showcase/2026-05-20-head-skill-self-claim-verification/`](../../showcase/2026-05-20-head-skill-self-claim-verification/) — Experiment artifacts
- [`cortex/adr/02-accepted/ADR-20260508230803515-curator-does-not-wrap-external-skill-discovery-apis-as-feed-adapters-agent-web-fetch-beats-hand-rolled-adapters.md`](../adr/02-accepted/ADR-20260508230803515-curator-does-not-wrap-external-skill-discovery-apis-as-feed-adapters-agent-web-fetch-beats-hand-rolled-adapters.md) — Why curator is local cache, not discovery engine
