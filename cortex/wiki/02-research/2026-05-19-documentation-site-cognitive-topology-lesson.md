---
created: 2026-05-19
updated: 2026-05-19
category: research
---

# Documentation site cognitive topology lesson

> **Source research:** [`2026-05-19-documentation-site-pattern-inventory-from-historical-excavation.md`](../02-research/2026-05-19-documentation-site-pattern-inventory-from-historical-excavation.md)
>
> **How this was produced:** A Feynman-learning dialogue between an agent and the project author, where the agent explained its understanding and was corrected point-by-point. This document captures the distilled corrections and principles.

---

## Core finding: Inventory as cognitive dependency graph

The pattern inventory is **not a content checklist**. It is a **topological sort of a cognitive dependency graph**.

Each page is ordered not by file type ("here are all ADRs") or alphabetical convenience, but by the constraint: **"without understanding A, the reader cannot meaningfully understand B."** The first five pages answer "who are you?"; the next five answer "how do you work?"; the remainder answer "why are you designed this deeply?".

This mirrors the onboarding skill's three-layer loading (`CLAUDE.md` → daily handoff → git log): static map first, dynamic context second, archaeological depth last.

---

## Lesson 1: Two superimposable layering schemes

The Three-Layer Pattern is often taught as a single stack. It is actually **two distinct layering schemes that can stack on top of each other**.

### Layering A — Single-skill internal anatomy (architecture perspective)

| Layer | Role | Spring analogy |
|-------|------|----------------|
| `SKILL.md` | Interface contract + routing rules | Controller |
| npm package | Implementation, independently evolvable | Service |
| Starter | BOM + CLI entry | Starter/BOM |

This describes **how one skill is constructed**. The SKILL.md is the façade; the npm package is the internal structure; the Starter is the dependency manifest and front door.

### Layering B — Deck runtime orchestration (urban-planning perspective)

| Layer | Role |
|-------|------|
| combo prompt | Lightweight coordination (conditions, sequencing, state passing) |
| standalone `SKILL.md` | Heavy reasoning (cross-project judgment, complex decisions) |
| CLI | Pure mechanical execution |

This describes **how multiple skills interact at runtime**. The combo prompt is the traffic signal; the skills are the buildings; the CLI is the municipal infrastructure.

**Key insight:** When a deck orchestrates a skill, Layer B governs the interaction, but the skill itself still contains Layer A internally. The schemes are orthogonal and composable.

---

## Lesson 2: "Where is the orchestrator?" is two questions, not one

The inventory lists `#3 Where is the Orchestrator?` and `#7 Combo as Lightweight Orchestrator` as separate pages. They are easy to conflate. The precise distinction:

- **#3** answers the architectural question: *Is there a single orchestrator component?*  
  **Answer:** No. Orchestration is distributed by weight across all three layers. There is no "orchestrator service" to point at.

- **#7** answers the implementation question: *In that distributed scheme, what handles the lightweight end?*  
  **Answer:** The combo prompt. It is not "the" orchestrator; it is the specific form that orchestration takes at the lightweight end of the spectrum.

**Analogy:** #3 says "the company has no CEO office; strategy is distributed across the board, managers, and team leads." #7 says "here is how the team leads run their morning stand-ups."

---

## Lesson 3: "Exists" is not sufficient for a dedicated page

During the Feynman review, the candidate concept "Deck as IaC" was evaluated and **rejected as a standalone page**.

The inventory already mentions deck declarations as infrastructure-as-code in the context of `#5 Deny-by-Default Governance` and `#12 Task→Deck Mapping`. The "IaC" framing is thin—just a passing analogy in README and a few sentences of description. It does not carry enough **cognitive weight** to justify independent treatment.

**Principle:** A concept earns a dedicated site page when it (a) has substantial content that cannot be absorbed into another page, **and** (b) sits at a critical node in the cognitive dependency graph. "Deck as IaC" fails (a). Existence alone is not justification.

---

## Lesson 4: AGENTS.md is a page table, not a document warehouse

This project's documentation strategy follows a specific hierarchy:

| Layer | Purpose | Analogy |
|-------|---------|---------|
| `README.md` | Human-facing shop window | Storefront |
| `AGENTS.md` | Lightweight page table for agents | Page table (pointers only, no bodies) |
| `ADR` / `wiki` | Full-context archaeological record | Museum archives |
| **Inventory / site plan** | Topological sort of the archives → exhibition | Curator's floor plan |

`AGENTS.md` never duplicates long-form content. It points. The site being planned by the inventory should adopt the same discipline: landing pages route; detail pages contain.

---

## Practical guidance for site construction

1. **Batch by cognitive dependency, not by source file type.** Grouping "all ADR concepts together" violates the dependency graph. Readers do not care which file a concept came from; they care what they must know first.

2. **Verify every analogy against the original source.** The Spring analogy for the three-layer pattern exists only in ADR-20260423101938000. If the site invents its own analogy without checking provenance, it risks semantic drift.

3. **Expose evolution stories explicitly.** The combo prompt's trajectory—from "combo-as-skill" to "combo-as-prompt"—is scattered across two ADRs. The site should surface this narrative; it is evidence that the architecture was discovered, not decreed.

4. **Start with identity, then operation, then archaeology.** The three-batch priority proposed in the source inventory should be treated as mandatory sequencing, not a suggestion.

---

## Cross-references

- Source inventory: [`2026-05-19-documentation-site-pattern-inventory-from-historical-excavation.md`](./2026-05-19-documentation-site-pattern-inventory-from-historical-excavation.md)
- Thin skill pattern (Layer A): [`../01-patterns/2026-05-02-thin-skill-pattern.md`](../01-patterns/2026-05-02-thin-skill-pattern.md)
- Orchestrator distribution (Layer B): [`../01-patterns/2026-05-19-where-is-the-orchestrator-combo-prompt-as-lightweight-orchestrator-pattern.md`](../01-patterns/2026-05-19-where-is-the-orchestrator-combo-prompt-as-lightweight-orchestrator-pattern.md)
- Intent/Plan/Execute fractal: [`../01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md`](../01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md)
