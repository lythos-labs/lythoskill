---
created: 2026-05-17
category: lesson
---

# Codex Symlink Bug → Snapshot Mode: Origin & Evolution

> How a Codex CLI compatibility issue drove the dual-mode (symlink/snapshot) architecture.

## Timeline

| Date | Event | Artifact |
|------|-------|----------|
| 2026-04-23 | Multi-platform working set paths recognized (Claude `.claude/skills/`, Codex `.agents/skills/`) | ADR-20260423130348396 |
| 2026-05-07 | Dual-mode proposed: snapshot (cp pinned) vs symlink (live) | ADR-20260507190157540 |
| 2026-05-08 | EPIC-20260507191713917 delivered — `sync/freeze` + reconcile + schema mode field | daily/2026-05-08 |
| 2026-05-08 | Codex variant decks updated: `cp -rL` → `link --mode snapshot` | daily/2026-05-08 |
| 2026-05-09 | `sync/freeze` renamed to `to-symlink`/`to-snapshot` | ADR-20260509144134332 |
| 2026-05-17 | BDD verifies round-trip works; link reconciler not yet mode-aware | TASK-20260517121819470 |

## Two Motives, One Mechanism

### Motive 1: Codex CLI Top-Level Symlink Bug (#11314, CLOSED)

Codex CLI v0.98.0 had a bug: when `.agents/skills/` **itself** was a symlink (to e.g. `skills-store/`), Codex would not traverse into it. Individual skill symlinks INSIDE a real `.agents/skills/` directory worked fine.

**Fact-check (2026-05-17)**: User tested — Codex does support symlinked skills inside a real working set directory. The bug was specifically about the top-level `.agents/skills/` being a symlink, not about individual skill entries. Issue #11314 was CLOSED.

**Lythoskill is unaffected**: our working set (`.claude/skills/`) is a real directory. Individual skill entries inside are symlinks — this pattern works on Codex. The snapshot mode was motivated by an overly broad interpretation of the bug; version pinning remains the stronger rationale.

Initial workaround (pre-dual-mode): `cp -rL` (copy, follow symlinks) — manual, fragile, not version-tracked. Replaced by `deck link --mode=snapshot` in v0.9.32.

### Motive 2: Project Version Isolation

Some projects want to freeze a skill at a specific commit. If all skills are symlinks following the cold pool HEAD, `git pull` on the cold pool silently updates all projects. Projects that need stability want to **pin** a version and opt into updates explicitly.

### Unified Solution: Per-Skill Mode

```toml
# schema.ts: LinkedSkillSchema
mode: z.enum(["symlink", "snapshot"]).default("symlink")
```

- **symlink mode**: `ln -s <cold-pool>/<skill> <working-set>/<alias>` — always follows cold pool HEAD
- **snapshot mode**: `cp -r <cold-pool>/<skill> <working-set>/<alias>` — pinned at current commit, independent copy

Commands:
- `deck add` — defaults to snapshot (safe: ADR-20260507190157540)
- `deck link --mode=snapshot` — global default override (v0.9.32)
- `deck to-symlink <alias>` — per-skill: snapshot → symlink
- `deck to-snapshot <alias>` — per-skill: symlink → snapshot (pin current)

## Schema Evolution

v0.9.32 introduced `mode` field in lock file:

```
LinkedSkill {
  alias: string
  path: string            // FQ locator
  mode: "symlink" | "snapshot"  // NEW — defaults to "symlink" for backward compat
  content_hash: string
  head_ref: string
}
```

Backward compatible: old lock files without `mode` → Zod defaults to `"symlink"`.

## Additional Uses for mode Field

The `mode` field serves multiple purposes beyond symlink/snapshot switching:

1. **Prune safety**: `cold-pool prune` uses mode to determine reference counting — snapshot skills cannot be pruned while still referenced
2. **Refresh behavior**: `deck refresh` for snapshot mode only reports ("3 commits behind"), does not auto-pull; symlink mode can apply
3. **Cold-pool GC**: snapshot mode creates an independent copy — the cold pool original is safe to prune even if the snapshot diverges

## Current State (2026-05-17)

| Component | Status |
|-----------|--------|
| `to-symlink` / `to-snapshot` round-trip | ✅ Working (BDD verified) |
| Snapshot content integrity | ✅ Working (complete directory copy) |
| Lock file `mode` field | ✅ Schema exists, written by link |
| `deck link --mode=snapshot` global default | ✅ CLI flag exists |
| Link reconciler per-skill mode awareness | ❌ Not yet — link always produces symlinks regardless of per-skill mode in lock |
| `deck add` default snapshot | ❌ Current default is symlink (ADR says should be snapshot) |

The two remaining gaps (link per-skill mode + add default snapshot) are tracked in TASK-20260517122556223.

## Key Insight

What started as a Codex CLI compatibility workaround (`cp -rL`) evolved into a general-purpose version isolation mechanism that serves both cross-agent compatibility AND project stability. The `mode` field was deliberately placed in the lock file schema from day one (v0.9.32) anticipating future reconciliation logic — the schema was designed for the full feature, even though the implementation is still catching up.

## Related

- TASK-20260517121819470: BDD snapshot symlink round-trip
- TASK-20260517122556223: Wire per-skill mode into link reconciler
- ADR-20260423130348396: Port skill-manager, multi-platform working set
- ADR-20260507190157540: Cold-pool dual-mode design
- ADR-20260509144134332: Rename sync/freeze → to-symlink/to-snapshot
- EPIC-20260507191713917: Cold-pool reconcile + dual-mode delivery
- daily/2026-05-08: EPIC delivery + Codex variant deck update
