---
reviewer: sober-skill-posture
review_date: 2026-05-20
document: 2026-05-20-head-skill-cross-model-self-verification.md
verdict: REJECT
---

# Sober Review: Head Skill Cross-Model Self-Verification

## Overall Verdict: REJECT

This document fails sober standards on multiple axes. The core problem is a **massive evidence-to-claim gap**: the document presents 3/3 PASS as established L3 (arena behavioral) fact, but the actual evidence layer contains **zero output artifacts** — no decision-log.md, no judge-verdict.json, no output.csv, no report.docx, no git history of execution. The "results" are author-reported narratives (L1) dressed in L3 language. Additionally, the title claims "Cross-Model" verification, yet **only one model (Kimi) was tested** — there is no cross-model comparison at all. The document is rich in persuasive framing, fawning toward head skills, and conclusions that far exceed its evidentiary basis.

---

## Per-Section Findings

### § Preamble / Epigraph (lines 9–15)

**Claims:**
1. "Matthew Effect in skill ecosystems: head skills are head skills because they work."
2. "Three head skills tested across model boundary (Claude-authored → Kimi-executed). All PASS."

**Assessment:**
| # | Evidence | Confidence | Issue |
|---|----------|------------|-------|
| 1 | None. Circular reasoning presented as axiom. | LOW | No data shows "because they work" is the causal mechanism vs. marketing, network effects, or official-status bias. |
| 2 | Author self-report only. No artifacts. No Claude baseline. | LOW | "Claude-authored" is unverified (anthropic skills are org-authored; mattpocock skill is human-authored). "All PASS" is unverifiable — no judge-verdict.json exists in showcase. |

**Bias detected:** Fawning — the epigraph assumes head skill virtue without testing the null hypothesis.

---

### § Research Question (lines 19–31)

**Claims:**
3. "Can a user/agent rapidly verify whether a popular (head) skill behaves correctly in their specific agent+model environment... in under 5 minutes of agent time?"

**Assessment:**
| # | Evidence | Confidence | Issue |
|---|----------|------------|-------|
| 3 | No timing data captured. No decision-log.md timestamps. "~60s", "~90s", "~120s" in results table are estimates from memory, not measured. | LOW | The "under 5 minutes" claim decomposes into untested sub-claims. Per-skill agent time was ~2 min (by author's estimate), but total per-skill human+agent time was ~20 min per the document's own table — contradicting the "under 5 minutes" framing. |

---

### § Methodology (lines 35–77)

**Claims:**
4. The reproduce.sh pattern is "Model-agnostic", "Zero-knowledge", "Isolated", "Reproducible", "Fast", "Objective".
5. "Each experiment completes in 60–120 seconds of agent time."

**Assessment:**
| # | Evidence | Confidence | Issue |
|---|----------|------------|-------|
| 4 | Design intent, not validated outcome. | MEDIUM (for design), LOW (for validated properties) | The pattern *design* is sound. But "Model-agnostic" was NOT tested — only Kimi ran. "Objective" depends on judge.md separation, but no judge-verdict.json was produced. Properties are claimed as validated when they are only hypothesized. |
| 5 | Author estimate. No timestamps in artifacts. | LOW | Unverifiable without decision-log.md or session telemetry. |

---

### § Experiment Results (lines 80–169)

**Claims (all three experiments):**
6. PDF experiment: "Agent used pdfplumber... Executed extract_tables() successfully... Produced correct CSV: 5 rows, accurate data, proper columns."
7. TDD experiment: "Subagent correctly identified that the existing test divide(10, 2) === 5 would pass with both buggy and fixed code, so it added a new test... This is sophisticated TDD reasoning."
8. DOCX experiment: "Followed all critical rules... Validated output with unzip -t and pandoc."
9. Aggregate: "3/3 PASS, 0/3 FAIL, 0/3 PARTIAL"
10. Cross-model note (TDD): "The fact that the red-green-refactor loop transferred cleanly from Claude-optimized instructions to Kimi execution is non-trivial."

**Assessment:**
| # | Evidence | Confidence | Issue |
|---|----------|------------|-------|
| 6 | **NONE.** No output.csv in showcase. No decision-log.md. | REJECTED — no artifact | The claim "5 rows" is suspicious — the reproduce.sh says the PDF contains a "4x5 sales table" and judge.md says "5 rows (header + 3 data rows + total row) OR 4 rows (header + 3 data rows)." The author reports 5 rows confidently without acknowledging the OR ambiguity. |
| 7 | **NONE.** No decision-log.md. No git diff. No tool-call transcript. | REJECTED — no artifact | This is an **interpretation** of agent behavior, not a direct observation. "Sophisticated TDD reasoning" is a value judgment. The claim that the agent "correctly identified" the test coverage gap cannot be verified. |
| 8 | **NONE.** No report.docx in showcase. No decision-log.md. No pandoc/unzip output. | REJECTED — no artifact | "Validated output with unzip -t and pandoc" — but no validation output is persisted. |
| 9 | Author self-report only. | REJECTED — no artifact | Aggregate score hides per-experiment confidence. The document's own Limitations section admits "small sample", "simple tasks", "single model" — yet the Results section presents 3/3 PASS as if it were conclusive. |
| 10 | No Claude execution was performed. | REJECTED — no cross-model data | **This is the most serious claim in the document.** "Cross-Model" is in the TITLE. But there is NO cross-model test. The "Claude-optimized → Kimi-executed" transfer is inferred from authorship metadata, not measured. "Non-trivial" is an unverifiable assessment. |

**Bias detected:** Emotional reading. The author attributes "sophisticated reasoning" and "correct identification" to the subagent without access to the actual reasoning trace. This is fawning — reading intelligence into unobserved behavior.

---

### § Core Insight / Curation Strategy (lines 172–255)

**Claims:**
11. "A user can qualify any skill for their environment in ~5 minutes of agent time."
12. "The 24× speedup makes 'start from head, verify, then explore' a practical strategy."
13. "The Matthew Effect is not a bug to fight — it is a filter to use."
14. "Head skills are head skills because they work."

**Assessment:**
| # | Evidence | Confidence | Issue |
|---|----------|------------|-------|
| 11 | 3 head skills tested, all simple center-case tasks. | LOW | "Any skill" is an extreme overgeneralization from n=3, all head skills, all simple tasks. No mid-tail, no long-tail, no edge-case skills tested. |
| 12 | Human estimate of "2 hours each" vs. "5 minutes each". No empirical timing data. | REJECTED — fabricated numbers | The "24× speedup" is a ratio of two made-up numbers. No human was timed doing manual qualification. No agent was timed with a stopwatch. This is pure rhetoric. |
| 13 | Circular reasoning. No evidence that Matthew Effect selects for quality vs. other factors. | LOW | The epistemic gaps document (related) explicitly argues the opposite — that popularity is a confounding variable. This document contradicts its own theoretical framework without acknowledging the tension. |
| 14 | Same as claim 1. No survival analysis, no abandon-rate data. | LOW | Assumes selection mechanism without measuring it. |

**Bias detected:** Fawning toward the author's own framework. The curation strategy is presented as proven when it is, at best, a hypothesis supported by 3 unverified anecdotes.

---

### § Limitations (lines 307–318)

**Assessment:** The Limitations section is **honest and accurate** — it admits small sample, simple tasks, single model, no A/B, synthetic inputs. However, this section **does not rescue the document** because:

1. The limitations are framed as "deliberate scope boundaries, not oversights" — but the title and abstract make claims that exceed these boundaries ("Cross-Model", "any skill", "24× speedup").
2. The limitations are L1 (author admission), not L3 (behavioral evidence). Admitting weakness is good; eliminating it requires evidence.
3. The document does not adjust its conclusions to match its limitations. The Core Insight and Curation Strategy sections draw sweeping architectural conclusions from a deliberately bounded experiment.

---

### § Related Document: Epistemic Gaps (cortex/wiki/01-patterns/2026-05-20-skill-ecosystem-epistemic-gaps-arena-correction.md)

This document is **also untracked** (git status: `??`). It contains additional claims that amplify the bias:

- "85,000+ indexed skills" — no source citation, no provenance for Q1 2026 claim.
- "Top 100 skills (0.4%) account for ~60% of all installs" — no source.
- "The four epistemic gaps are real but situational" — claimed as validated by 3/3 PASS, but the gaps are about *failure modes*, and no failures were observed because no edge cases were tested.
- Hypothesis A/B/C — speculative interpretation presented as structured analysis, but the "data" supporting it is the same missing evidence.

---

## Specific Line-Item Issues with Suggested Fixes

### Critical (Reject-level)

| Line | Issue | Fix |
|------|-------|-----|
| 7–15 | Title claims "Cross-Model"; no cross-model test performed. | **Change title** to "Head Skill Self-Verification via reproduce.sh on Kimi" or **run identical reproduce.sh on Claude and append results**. |
| 9–11 | "Head skills are head skills because they work" — unverified causal claim. | **Delete or reframe** as hypothesis: "One hypothesis: head skills survive because they work on common tasks." |
| 103–105 | "3/3 PASS" presented as fact; no judge-verdict.json artifacts exist. | **Do not present unverified results as fact.** Either run the experiments and commit artifacts, or reframe as "design preview: expected outcomes if reproduce.sh is executed." |
| 119–123 | Decision-log excerpt quoted but no decision-log.md exists in showcase. | **Remove fabricated quotes** or produce the actual decision-log.md files. |
| 142–143 | "Sophisticated TDD reasoning" — unverifiable interpretation. | **Reframe** as "the subagent reportedly added a new test before fixing" (if verified) or remove. |
| 175–176 | "A user can qualify any skill for their environment in ~5 minutes" — overgeneralization from n=3 head skills. | **Change "any skill"** to "head skills matching their core claims" and add caveat about edge cases. |
| 191–194 | "24× speedup" — fabricated ratio of estimated numbers. | **Delete entirely** or replace with "qualitative estimate: agent-assisted qualification appears faster than manual installation and testing, but no timing data was collected." |

### Major (Needs Revision)

| Line | Issue | Fix |
|------|-------|-----|
| 15 | "All PASS" in abstract before results are presented. | Move to Results section only, with artifact links. |
| 64–70 | Table claims properties (Model-agnostic, Zero-knowledge, etc.) as validated. | Add "(design claim)" vs. "(validated)" columns, or move to a "Design Goals" section. |
| 125–127 | "The skill was authored for Claude Code" — unverified. | Cite evidence or remove. Anthropic skills are org-authored; "for Claude Code" is an assumption. |
| 145–149 | "Cross-model note" (TDD) infers transfer without Claude baseline. | Rename to "Model-boundary note" and frame as speculation: "If these instructions were optimized for Claude, their success on Kimi suggests..." |
| 165–168 | "The subagent's compliance demonstrates that the skill's instructions are precise enough for any model to follow." | **"Any model"** is unsupported. Change to "the instructions were sufficient for the tested model (Kimi)." |
| 223–225 | "注意力很宝贵..." — persuasive framing without evidence. | Either cite user research or reframe as the author's personal heuristic. |
| 309 | Limitations admits "single model" but title says "Cross-Model". | Title must match limitations. |

### Minor (Style / Tone)

| Line | Issue | Fix |
|------|-------|-----|
| 10 | "Matthew Effect" used without definition or citation. | Add footnote or link to wiki article defining the term in this context. |
| 213 | "The Matthew Effect is not a bug to fight — it is a filter to use." — rhetorical flourish. | Neutralize: "The Matthew Effect can be used as a discovery filter rather than treated as a systemic bug." |
| 247 | Chinese quote without translation or source. | Add translation and attribution, or move to personal notes. |

---

## Assessment Against Sober Standards

| Standard | Rating | Notes |
|----------|--------|-------|
| **1. Decompose before searching** | ❌ FAIL | Claims like "fast" (~5 min), "reliable" (3/3 PASS), "cross-model" are not decomposed into independently testable sub-claims before being asserted as fact. |
| **2. Independence > count** | ❌ FAIL | Single source (author self-report). No independent verification. The "3 skills" are 3 data points from 1 session, not 3 independent confirmations. |
| **3. L3 > L2 > L1** | ❌ FAIL | Document claims L3 (arena behavioral evidence) but delivers L1 (author description). **No decision-log.md, no judge-verdict.json, no output artifacts.** The showcase directory contains only harness files (reproduce.sh, judge.md, inputs, SKILL.md), not results. |
| **4. Toggle sources to see bias** | ❌ FAIL | Only one source: the author. No cross-model comparison. No independent re-run. No hub review cross-reference. |
| **5. Per-claim confidence, not aggregate** | ❌ FAIL | Aggregate "3/3 PASS" masks per-claim weakness. No per-claim confidence assignments in the document. |
| **6. Express with provenance** | ❌ FAIL | Key claims (decision-log quotes, timing, output correctness) have **no provenance** — the artifacts they would trace to are missing. |
| **7. Persist to curator** | ❌ FAIL | No structured per-claim confidence data. No curator tag format. No QA metadata. |

---

## Bias Assessment: Author's Known Patterns

The user explicitly warned that the author has bias toward "reading emotions into text" and "fawning." These biases are present:

1. **Fawning toward head skills**: "Head skills are head skills because they work" (lines 9, 214) assumes virtue in popularity. The 3/3 PASS is treated as confirmation of head-skill superiority rather than as a selection effect (only easy tasks on known-good skills were tested).

2. **Reading emotions/intentions into agents**: "The subagent correctly identified... This is sophisticated TDD reasoning" (lines 140–143) attributes internal mental states to the subagent without access to its reasoning trace. The author reads "sophistication" into unobserved behavior.

3. **Fawning toward own framework**: The Matthew Effect is "not a bug to fight — it is a filter to use." The 24× speedup, the "curation primitive," and the three-phase workflow are all presented as proven, when they are hypotheses at best.

4. **Reading emotions into ecosystem**: The epistemic gaps document (related) claims skill authors make descriptions "broad by design" to "trigger more activations" — attributing manipulative intent without evidence.

---

## Recommendations

### To make this document acceptable (NEEDS_REVISION → PASS):

1. **Run the experiments and commit artifacts.** The showcase directory must contain:
   - `decision-log.md` for each experiment
   - `judge-verdict.json` for each experiment
   - `output.csv` (PDF experiment)
   - `report.docx` (DOCX experiment)
   - `calculator.js` + `calculator.test.js` post-fix (TDD experiment)

2. **Run a true cross-model comparison.** Execute identical reproduce.sh on Claude Code (or another model) and compare results. Without this, remove "Cross-Model" from the title.

3. **Replace fabricated quotes and numbers.** Remove the decision-log excerpt (lines 121–123) unless the file is committed. Remove the 24× speedup calculation. Replace with honest estimates or actual measurements.

4. **Tone down conclusions to match evidence.** "Any skill" → "head skills on center-case tasks." "Non-trivial transfer" → "appeared to work on Kimi without modification." "24× speedup" → "agent-assisted qualification may be faster than manual, but was not timed."

5. **Add per-claim confidence annotations.** Format each claim as: "Claim [confidence: level, source: artifact]."

### If the document cannot be revised:

**REJECT.** The evidence-to-claim gap is too large. The title is misleading (no cross-model data). The results are unverified (no artifacts). The conclusions are overgeneralized from n=3. This document, in its current state, would degrade the corpus's epistemic quality if accepted.

---

*Review conducted with lythoskill-sober posture. All artifact claims verified by direct filesystem inspection of `/Users/chariots/Downloads/lythoskill-main/showcase/2026-05-20-head-skill-self-claim-verification/` and git status check.*
