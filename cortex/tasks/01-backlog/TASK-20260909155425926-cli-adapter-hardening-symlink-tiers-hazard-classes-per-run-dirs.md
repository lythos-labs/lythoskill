# TASK-20260909155425926: CLI adapter hardening — symlink tiers, hazard classes, per-run dirs

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-09-09 | Created from wedge-path research synthesis (P2) |

## Background & Goals

The 2026-09-09 CLI skill-dir survey (16 agents, every claim sourced) gives deck's
fan-out layer its first independent audit. Headline: `.claude/skills` +
`.agents/skills` are the highest-coverage targets (repo defaults already align), but
symlink guarantees split into docs-level vs issue-level-hazard tiers, and one
confirmed deletion hazard (Goose #11600 — removing a linked project skill can
recursively delete the symlink target = cold-pool content). deck link's projection
design is validated; the adapter POLICY layer needs tiering to match reality.

Source: cortex/wiki/02-research/2026-09-09-wedge-path-research-synthesis.md §B.

## Requirements

- [ ] Adapter registry: per-CLI record of symlink guarantee tier (docs / issue /
      hazard), fan-out targets, per-run set-switching mechanism, per-role scoping
      shape. Data, not docs prose — link.ts `also_link_to` strategy becomes data.
- [ ] Hazard-class handling:
      - Goose unlink special-case (#11600: verify symlink before rm; never recurse
        into target)
      - Cline = copy/rsync target (`.clinerules/` symlinks confirmed not followed;
        skills symlinks unverified)
      - opencode: no double-fan to same pool via two scanned roots (duplicate-name
        WARN #46327); guarantee acyclic absolute symlinks (cycle = ENAMETOOLONG
        crash #45961)
      - Codex: 5 open symlink issues — keep symlinks valid; note name-loss risk
- [ ] Per-run mode: support Kimi `--skills-dir` / `extra_skill_dirs` and Crush
      `option skill-path` — side-deck without relinking (zero-projection path)
- [ ] Pinned-version smoke: deck link smoke test against docs-tier CLIs (Claude /
      Roo / Gemini / Codex-AGENTS.md) enters the probe discipline (round-2
      adapter depreciation discipline item c)

## Technical Approach

- Registry as a typed data file consumed by link.ts (avoid synonymous-command trap:
  name by target state, per ADR-20260509144134332)
- Goose unlink fix is correctness-critical (data loss), not UX — prioritize within
  the card; add dormancy test (rm path on Goose target must not touch cold pool)
- Per-run mode = render CLI args/config from deck state; no relink side effects
- Hazards sourced per-CLI in the registry; re-survey cadence = quarterly (P6 watch)

## Acceptance Criteria

- [ ] Registry file exists, covers all 16 surveyed CLIs, each row has source URL
      and verification date
- [ ] Goose unlink hazard has a test (dormancy: symlinked target survives unlink)
- [ ] Kimi/Crush per-run paths render from deck state with a smoke test
- [ ] link.ts behavior unchanged for docs-tier CLIs (no regression)

## Progress Log

- 2026-09-09: card created from synthesis P2.

## Related Files
- Modified:
- Added:

## Git Commit Message
```
fix(deck): adapter policy tiers from 16-CLI survey — Goose unlink hazard, per-run dirs (TASK-20260909155425926)

- adapter registry: guarantee tier + hazard flags + switching mechanism per CLI
- Goose unlink special-case (#11600 recursive-delete guard) + dormancy test
- Kimi --skills-dir / Crush skill-path per-run rendering (zero-projection path)
```

## Notes
