# Path Usage Convention: `working_set` and `cold_pool`

> Established by TASK-20260527212829974 — Global path alignment sweep.
> Scope: `examples/`, `showcase/`, `site/`, `packages/lythoskill-deck/`, `packages/lythoskill-curator/`, `packages/lythoskill-arena/`, `skills/`, `scripts/`

---

## Convention Rules

### `working_set`

| Context | Rule |
|---------|------|
| **Default** | `.claude/skills` — Claude Code is the primary audience and skill concept originator. |
| **Codex-specific** | `.agents/skills` — use **only** in `codex/` subdirectories or explicitly multi-platform examples. |
| **`also_link_to`** | May include `.agents/skills`, `.kimi/skills`, `.cursor/skills`, `.codex/skills`, `.windsurf/skills`, `.github/skills` — multi-platform fan-out is encouraged. |
| **User-facing examples** (`site/`, `examples/decks/*.toml`, `examples/*.sh`) | **MUST** include a comment or note that `working_set` is configurable per platform. The default is not the only choice. |
| **Code / tests** (`packages/`) | Use `.claude/skills` as the runtime default, but **must not** hardcode it as the *only* valid path in error messages, prompts, or documentation that agents consume. |
| **Built skill output** (`skills/`) | Must stay in sync with `packages/<pkg>/skill/` source. Narrative implying `.claude/skills` is the "sole" path is a P0 deviation. |
| **Safety** | `working_set = "skills"` (build output directory) is **forbidden** per ADR-20260519144445916. |

### `cold_pool`

| Context | Rule |
|---------|------|
| **Default** | `~/.agents/skill-repos` — already consistent across the repo. Keep it. |
| **User-facing examples** | May omit configurability note; `cold_pool` rarely needs per-project changes. |
| **Code** | Default via `deck.deck?.cold_pool || "~/.agents/skill-repos"` is the canonical pattern. |

### Quick Reference

```toml
# ✅ Correct — default with configurability note
[deck]
working_set = ".claude/skills"  # Configure per platform: .agents/skills, .cursor/skills, ...
cold_pool   = "~/.agents/skill-repos"

# ✅ Correct — Codex-specific subdirectory
# examples/decks/codex/documents.toml
working_set = ".agents/skills"  # Codex CLI default scan path

# ✅ Correct — multi-platform fan-out
also_link_to = [".agents/skills", ".cursor/skills"]

# ❌ Forbidden — build output collision
working_set = "skills"

# ❌ P0 — narrative contradiction
# "The sole location the agent scans for skills"  (false — .agents/skills is equally valid)
```

---

## Deviation Report

> **Legend:** Severity — P0 (narrative contradiction), P1 (missing configurability), P2 (inconsistent but correct), P3 (minor style).  
> **Action:** `keep` (correct), `annotate` (add comment), `change` (modify path/text), `remove` (delete misleading).  
> **Note:** `site/` fixes are owned by T1 (site narrative stabilization epic). This document reports them for tracking only.

### P0 — Narrative Contradiction

| File | Line | Current | Expected | Severity | Action |
|------|------|---------|----------|----------|--------|
| `showcase/sober-journalist-evolution/reproduce.sh` | 17, 42, 55, 84 | `working_set = "skills"` | `working_set = ".claude/skills"` | **P0** | `change` |
| `skills/lythoskill-deck/SKILL.md` | 41 | "`deck link` makes `.claude/skills/` match" | "`deck link` makes the working set (default `.claude/skills/`) match" | **P0** | `change` |
| `skills/lythoskill-deck/SKILL.md` | 134 | "Working Set \| `.claude/skills/` — symlinks only. The **sole** location the agent scans for skills." | Remove "sole"; mention configurability | **P0** | `change` |
| `skills/lythoskill-deck/SKILL.md` | 144 | "Never manually create subdirectories in `.claude/skills/`" | "Never manually create subdirectories in the working set directory" | **P0** | `change` |
| `packages/lythoskill-deck/skill/SKILL.md` | 41 | Same as above (source template) | Same fix | **P0** | `change` |
| `packages/lythoskill-deck/skill/SKILL.md` | 134 | Same as above (source template) | Same fix | **P0** | `change` |
| `packages/lythoskill-deck/skill/SKILL.md` | 144 | Same as above (source template) | Same fix | **P0** | `change` |
| `packages/lythoskill-deck/skill/references/glossary.md` | 5 | "Working Set \| `.claude/skills/` — symlinks only. The **sole** location the agent scans for skills." | Remove "sole"; mention configurability | **P0** | `change` |
| `skills/lythoskill-deck/references/glossary.md` | 5 | Same as above (built output) | Same fix | **P0** | `change` |
| `site/index.md` | 83 | "`deck link` reconciles the **working set** (`.claude/skills/`) to match exactly" | "`deck link` reconciles the **working set** (default `.claude/skills/`, configurable) to match exactly" | **P0** | `change` *(T1)* |
| `site/zh/index.md` | 83 | Same as above (ZH) | Same fix | **P0** | `change` *(T1)* |

### P1 — Missing Configurability Note in User-Facing Example

| File | Line | Current | Expected | Severity | Action |
|------|------|---------|----------|----------|--------|
| `examples/install-deck.sh` | 29–30 | `echo "✅ Done. Active skills in .claude/skills/:"` + `ls -1 .claude/skills/` | Add note: "(or your configured `working_set`)" | **P1** | `annotate` |
| `examples/quick-init.sh` | 74–86 | Self-check block hardcodes `.claude/skills/` throughout | Add configurability comment at top of self-check section | **P1** | `annotate` |
| `examples/decks/vanilla.toml` | 10 | `working_set = ".claude/skills"` (no comment) | Add `# Claude Code default; change for Cursor/Codex` | **P1** | `annotate` |
| `examples/decks/engineering.toml` | 11 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/documents.toml` | 11 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/full-stack.toml` | 11 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/design-studio.toml` | 11 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/research-documents.toml` | 11 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/visual-explainer.toml` | 11 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/scout.toml` | 11 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/governance.toml` | 10 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/deep-research.toml` | 16 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/recipe-report.toml` | 14 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/site-builder.toml` | 4 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/baoyu-visual-production.toml` | 10 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/baoyu-content-pipeline.toml` | 10 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/baoyu-social-chinese.toml` | 10 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/architecture-explainer.toml` | 16 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/qa-sweep.toml` | 4 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/deepseek-research.toml` | 19 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `examples/decks/deepseek-codebase.toml` | 20 | `working_set = ".claude/skills"` (no comment) | Add platform configurability comment | **P1** | `annotate` |
| `skills/lythoskill-deck/assets/skill-deck.toml.template` | 14 | `working_set = ".claude/skills"        # Agent scans here (symlinks only)` | Comment should mention platform configurability | **P1** | `annotate` |
| `packages/lythoskill-deck/skill/assets/skill-deck.toml.template` | 14 | Same as above (source template) | Same fix | **P1** | `annotate` |
| `site/index.md` | 60 | `working_set = ".claude/skills"` in quick-start toml (no comment) | Add inline comment or adjacent note about platform switching | **P1** | `annotate` *(T1)* |
| `site/zh/index.md` | 60 | Same as above (ZH) | Same fix | **P1** | `annotate` *(T1)* |
| `site/guide/index.md` | 25 | `working_set = ".claude/skills"` in guide example (no comment) | Add inline comment or adjacent note | **P1** | `annotate` *(T1)* |
| `site/architecture.md` | 14 | "Symlinks in `.claude/skills/`. Only skills declared..." | Mention path is configurable per platform | **P1** | `annotate` *(T1)* |

### P2 — Inconsistent but Technically Correct

| File | Line | Current | Expected | Severity | Action |
|------|------|---------|----------|----------|--------|
| `examples/decks/arena-add-remove/base.toml` | 8 | `working_set = ".claude/skills"` (no comment) | BDD scenario; acceptable but would benefit from comment | **P2** | `annotate` |
| `examples/decks/arena-add-remove/plus-research.toml` | 8 | Same | Same | **P2** | `annotate` |
| `examples/decks/arena-add-remove/minus-pdf.toml` | 8 | Same | Same | **P2** | `annotate` |
| `packages/lythoskill-arena/src/runner.ts` | 87 | Prompt: "skills already linked in `.claude/skills/`" | Prompt should say "skills already linked in your working set" or mention configurability | **P2** | `change` |
| `packages/lythoskill-arena/src/preflight.ts` | 279, 286 | AGENTS.md template: "visible in `.claude/skills/`" / "check `ls .claude/skills/`" | Genericize to "working set" or mention configurability | **P2** | `change` |
| `packages/lythoskill-arena/skill/SKILL.md` | 175, 195 | Hardcodes `.claude/skills/` in skill instructions | Genericize to "working set" or mention configurability | **P2** | `change` |
| `skills/lythoskill-arena/SKILL.md` | 175, 195 | Same as above (built output) | Same fix | **P2** | `change` |
| `packages/lythoskill-coach/skill/SKILL.md` | 147 | Prompt: "Use the skills in `.claude/skills/`" | Genericize to "working set" or mention configurability | **P2** | `change` |
| `skills/lythoskill-coach/SKILL.md` | 147 | Same as above (built output) | Same fix | **P2** | `change` |
| `showcase/2026-05-15-graduation-exam-seed-bootstrap/reproduce.sh` | 27, 48 | `working_set = ".claude/skills"` + hardcoded ls | BDD scenario; acceptable for Claude-specific test | **P2** | `keep` |
| `showcase/2026-05-15-arena-vs-seed-bootstrap-free-form-vs-baoyu-standardized/reproduce.sh` | 26, 44 | `working_set = ".claude/skills"` | BDD scenario; acceptable | **P2** | `keep` |
| `showcase/2026-05-17-arena-standard-posture-meta-test/reproduce.sh` | 20 | `working_set = ".claude/skills"` | BDD scenario; acceptable | **P2** | `keep` |
| `showcase/2026-05-17-zero-knowledge-arena-e2e/reproduce.sh` | 33 | `working_set = ".claude/skills"` | BDD scenario; acceptable | **P2** | `keep` |
| `showcase/2026-05-18-bdd-reproduce-sh-smoke-test/reproduce.sh` | 34 | `working_set = ".claude/skills"` | BDD scenario; acceptable | **P2** | `keep` |
| `showcase/2026-05-15-agent-orchestrated-arena/work/graduation-exam/skill-deck.toml` | 14 | `working_set = ".claude/skills"` | Arena work artifact; acceptable | **P2** | `keep` |
| `showcase/2026-05-15-agent-orchestrated-arena/work/graduation-exam-design/skill-deck.toml` | 7 | `working_set = ".claude/skills"` | Arena work artifact; acceptable | **P2** | `keep` |
| `showcase/2026-05-15-graduation-exam-seed-bootstrap/skill-deck.toml` | 4 | `working_set = ".claude/skills"` | Seed bootstrap artifact; acceptable | **P2** | `keep` |

### P3 — Minor Style Issue

| File | Line | Current | Expected | Severity | Action |
|------|------|---------|----------|----------|--------|
| `packages/lythoskill-deck/src/link.ts` | 169 | Error template: `working_set = ".claude/skills"` | Could say `working_set = ".claude/skills"  # or your configured path` | **P3** | `annotate` |
| `packages/lythoskill-curator/test/scenarios/graduation-exam.agent.md` | 11, 22, 39 | Mentions `.claude/skills/` in test scenario | Test scenario; acceptable | **P3** | `keep` |
| `showcase/2026-05-15-graduation-exam-v5/agent-stdout-raw.jsonl` | 2 | Raw agent output contains `.claude/skills` | Recorded artifact; not a deviation | **P3** | `keep` |

---

## Files That Are Correct (No Deviation)

| File | Why |
|------|-----|
| `examples/decks/codex/*.toml` | Uses `.agents/skills` in dedicated `codex/` subdirectory — correct per convention. |
| `examples/decks/INDEX.md` | Has explicit "Cross-Platform `working_set`" section with all platform paths — correct. |
| `examples/players.toml` | Mentions `.cursor/skills` as community-compatible — correct. |
| `skill-deck.toml` (repo root) | Uses `.claude/skills` + `also_link_to = [".agents/skills"]` — correct. |
| `packages/lythoskill-deck/src/add.ts` | Template includes 5 commented platform options — correct. |
| `packages/lythoskill-deck/src/path-guard.ts` | Validates any hidden directory; error message lists `.claude/skills, .agents/skills` as examples — correct. |
| `packages/lythoskill-deck/src/schema.ts` | `working_set` is a `z.string()` — no hardcoded validation — correct. |
| `packages/lythoskill-deck/src/link.test.ts` | Uses `.claude/skills` as test default; also tests `.agents/skills` in `also_link_to` — correct. |
| `scripts/entropy-check/checks.ts` | Scans `.agents/skills`, `.kimi/skills`, `.cursor/skills`, `.codex/skills` — correct multi-platform coverage. |
| `.gitignore` | Includes `.agents/skills/` — correct. |

---

## Summary

- **Total deviations found:** 48
- **P0 (narrative contradiction):** 11
- **P1 (missing configurability):** 27
- **P2 (inconsistent but correct):** 17
- **P3 (minor style):** 3

### Surprises

1. **`showcase/sober-journalist-evolution/reproduce.sh` uses `working_set = "skills"`** — This violates ADR-20260519144445916 (working_set must not alias build output directory). It was likely written before the ADR was accepted and never updated.
2. **Built skill output (`skills/lythoskill-deck/SKILL.md`) contains "sole location" language** — The skill that agents read claims `.claude/skills/` is the *only* valid working set. This directly contradicts the multi-platform `also_link_to` feature the same skill implements. The source (`packages/lythoskill-deck/skill/SKILL.md`) needs the same fix.
3. **Glossary references repeat the "sole location" claim** — Both `packages/lythoskill-deck/skill/references/glossary.md` and `skills/lythoskill-deck/references/glossary.md` define Working Set as "The sole location the agent scans for skills." This is factually false.
4. **`examples/*.sh` scripts hardcode `.claude/skills/` in success messages** — `install-deck.sh` and `quick-init.sh` tell the user to check `.claude/skills/` without mentioning the path is configurable. Codex users following these scripts will look in the wrong place.
5. **Most `examples/decks/*.toml` lack platform configurability comments** — 20 of 22 deck toml files use `.claude/skills` without a comment. Only `codex/*.toml` variants and `INDEX.md` are compliant.
6. **Arena prompts hardcode `.claude/skills/`** — `packages/lythoskill-arena/src/runner.ts` and `preflight.ts` tell subagents to check `.claude/skills/`. If the user is running with `.agents/skills`, the subagent will look in the wrong directory.

---

## Recommended Next Steps

1. **Fix P0 in `skills/` and `packages/lythoskill-deck/skill/`** — Update SKILL.md and glossary to remove "sole location" language and genericize path references. Re-run `lythoskill build` to sync built output.
2. **Fix `showcase/sober-journalist-evolution/reproduce.sh`** — Change `working_set = "skills"` to `working_set = ".claude/skills"` (or add a comment explaining the intentional collision if this is a negative test).
3. **Batch-annotate `examples/decks/*.toml`** — Add `# Claude Code default; change for Cursor/Codex/etc.` to all standard deck files.
4. **Fix `examples/install-deck.sh` and `examples/quick-init.sh`** — Add configurability note and genericize verification logic.
5. **T1: Fix `site/` deviations** — `site/index.md`, `site/zh/index.md`, `site/guide/index.md`, `site/architecture.md` need platform configurability notes.
6. **Fix Arena prompts** — Genericize `.claude/skills/` references in `runner.ts` and `preflight.ts` to "working set" or mention configurability.
