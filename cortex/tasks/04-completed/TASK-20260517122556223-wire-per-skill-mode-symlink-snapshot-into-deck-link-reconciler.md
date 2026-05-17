# TASK-20260517122556223: Wire per-skill mode (symlink/snapshot) into deck link reconciler

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| in-progress | 2026-05-17 | Started |
| review | 2026-05-17 | Deliverables committed |
| completed | 2026-05-17 | Done |

## 背景与目标
`deck link` always produces symlinks regardless of per-skill mode in lock file. Schema has had `mode` field since v0.9.32 but reconciler isn't mode-aware. Snapshot mode motivated by Codex symlink bug (#11314 — top-level symlink only, not individual skills). Lythoskill unaffected but snapshot mode is needed for cross-CLI compatibility.

Refs: ADR-20260517152850372 (deck also_link_to multi-CLI POSSE), Task TASK-20260517174257817 (archive fallback pattern — same "reconciler doesn't handle edge case" class)

## 需求详情
- [ ] Read per-skill `mode` from lock file (schema field exists since v0.9.32)
- [ ] Symlink mode: current behavior (default)
- [ ] Snapshot mode: copy SKILL.md + references into working set instead of symlink
- [ ] Mixed-mode deck: some skills symlink, some snapshot

## 技术方案
Modify `deck link` reconciler in `packages/lythoskill-deck/src/` to check lock file `mode` field per skill entry. Snapshot = `cp -r` instead of `ln -s`. Lock file schema: `[[skills]]` with `mode = "symlink" | "snapshot"`.

## 验收标准
- [ ] `deck link` with snapshot-mode skill creates copy, not symlink
- [ ] `deck link` with mixed-mode deck respects per-skill settings
- [ ] `deck link` without mode field defaults to symlink (backward compat)
- [ ] Dormancy test: symlink-only deck produces 0 snapshot artifacts

## 关联文件
- 修改: `packages/lythoskill-deck/src/` (reconciler)
- 参考: `cortex/adr/02-accepted/ADR-20260517152850372-*.md`

## 备注
