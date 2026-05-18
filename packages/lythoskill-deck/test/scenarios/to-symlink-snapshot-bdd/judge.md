# Judge Criteria — deck to-symlink / to-snapshot roundtrip

> Task agent never sees this file. Only judge reads it.
> Per ADR-20260518024500631 (judge separation) + ADR-20260514050300.

## Task Context

Agent was asked to verify symlink ↔ snapshot roundtrip on `skill-x`.

## Criteria

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| `initial_symlink` | After link, skill-x is a symlink | 1 | `lstat` → isSymbolicLink() = true |
| `initial_lock_mode` | Lock file has mode: "symlink" | 1 | Read skill-deck.lock → find skill-x → mode field |
| `snapshot_dir` | After to-snapshot, skill-x is a real directory | 1 | `lstat` → isDirectory() = true, isSymbolicLink() = false |
| `snapshot_content` | Snapshot preserves SKILL.md content | 1 | Read SKILL.md → contains "Test skill" |
| `snapshot_lock_mode` | Lock file updated to mode: "snapshot" | 1 | Read skill-deck.lock → find skill-x → mode field |
| `symlink_restored` | After to-symlink, back to symlink | 1 | `lstat` → isSymbolicLink() = true |
| `symlink_lock_mode` | Lock file back to mode: "symlink" | 1 | Read skill-deck.lock → find skill-x → mode field |
| `idempotent_snapshot` | Second to-snapshot is no-op | 0.5 | stdout contains "already" or exit code unchanged |
| `idempotent_symlink` | Second to-symlink is no-op | 0.5 | stdout contains "already" or exit code unchanged |
| `decision_log` | decision-log.jsonl has valid entries | 1 | ≥8 lines with step/decision/reason/ts |

## Verdict

- **PASS**: all 1-weight criteria met
- **PARTIAL**: 6+ criteria met
- **FAIL**: <6 criteria met or content lost during roundtrip
