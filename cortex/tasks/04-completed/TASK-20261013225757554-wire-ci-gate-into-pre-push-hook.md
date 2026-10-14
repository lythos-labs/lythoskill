# TASK-20261013225757554: wire ci-gate into pre-push hook

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-13 | Created |
| in-progress | 2026-10-14 | Started |
| review | 2026-10-14 | Deliverables committed |
| completed | 2026-10-14 | Done |

## Background & Goals
原前提（把 ci-gate 接进 pre-push 当机械护栏）被 owner 2026-10-14 重定向：ADR-20260512002131099 已定「pre-push 必须快（>15s 会被跳过）」，深门在 GitHub CI 本身（unit + BDD + codeql）。全量 ci-gate 只在 release 时本地跑。真正要堵的缺口不是「push 前没跑全量」,而是「push 后红 CI 放着没人看 6h」——那个已由 push-watch SOP（TASK-20261013225251343）+ backstop cron 覆盖，本卡只补一个非阻塞提醒。

## Requirements
- [ ] `.husky/pre-push` 加非阻塞 release-confirmation 提醒（"如果这次是 release，记得确认发布落地"），不改 gate、不加延迟
- [ ] ci-gate.ts 撤销 `--skip-unit`，保持 release-only 全量工具（注释点明这个角色）
- [ ] 决策记录：全量 gate = release 工具，pre-push = 快（ADR-20260512002131099）

## Technical Approach
无 guard 改动（只加 echo 提醒），无需负测试/qa-sweep。决策已在 ADR-20260512002131099
（pre-push semgrep ~10s + CI CodeQL 深门，layered defense 明写「pre-push: semgrep pattern
scan ~10s」）。本卡落地是「把 reminder 钉在 push 必经路径上」，不是「把深门搬到本地」。

## Acceptance Criteria
- [ ] pre-push 有 release-confirmation 提醒，且为 echo 非阻断、零延迟
- [ ] ci-gate.ts 无 `--skip-unit`，仍是全量 gate（`bun scripts/ci-gate.ts` 绿）
- [ ] 决策落卡（本卡 Progress Log + 引 ADR-20260512002131099）

## Progress Log
- 2026-10-13 ZK 评审 handoff 时发现本卡双 `## Technical Approach`/`## Acceptance Criteria` 段(probe 按最后一段判 empty shell),当场修掉——填卡要替换占位段落,不是往上堆。
- 2026-10-14 owner 重定向：原「pre-push 接 ci-gate 当护栏」被否——ADR-20260512002131099 已定 pre-push 必须快，深门在 GitHub CI。改为非阻塞 reminder + ci-gate 保持 release 工具。

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20261013225757554)

- Detail 1
- Detail 2
```

## Notes
