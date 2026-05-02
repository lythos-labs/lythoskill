# TASK-20260503010227902: 扩展 cortex CLI 状态机命令(ADR + epic 流转动词)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |

## 背景与目标

当前 cortex CLI 仅 task 有完整状态机(start/review/done/suspend/resume/reject/terminate/archive)。ADR / epic 仍依赖手动 `git mv`,容易漏 Status History 表格更新与 INDEX 重生成。

ADR-20260503003314901 后续 T1。本 task 是 trailer 自动化(T3)的硬前置 —— hook 必须能调统一 verb 命令。

## 需求详情

- [ ] `cortex adr accept <ADR-ID>` — 移到 `02-accepted/`,Status History 加 accepted 行
- [ ] `cortex adr reject <ADR-ID>` — 移到 `03-rejected/`,Status History 加 rejected 行
- [ ] `cortex adr supersede <ADR-ID> [--by <new-ADR-ID>]` — 移到 `04-superseded/`,Status History 加 superseded 行
- [ ] `cortex epic done <EPIC-ID>` — 移到 `02-done/`(目录不存在则创建)
- [ ] `cortex epic suspend <EPIC-ID>` — 移到 `03-suspended/`
- [ ] `cortex epic resume <EPIC-ID>` — suspended → active
- [ ] 状态转换非法(如对已 04-completed 的卡再 done)友好报错,不破坏文件
- [ ] 每个动词执行后自动跑 INDEX 重生成

## 技术方案

- 实现位置:`packages/lythoskill-project-cortex/src/cli.ts`
- 复用 task 状态机现成的 parseStatusHistory / moveTo / regenerateIndex 内部函数,抽出公共部分
- ADR / epic 目录命名映射表(`02-accepted/` vs `02-in-progress/` 等)
- Status History 沿用现有列结构(Status / Date / Note)

## 验收标准

- [ ] 6 个新动词命令在 `--help` 中可见
- [ ] 对 ADR-20260502234833756(已 accepted)再跑 `cortex adr accept` → 友好提示已是 accepted,不重复加行
- [ ] 任意 ADR / epic 跑动词后:Status History 表格新行正确,目录正确移动,INDEX.md 已更新
- [ ] 非法转换返回 non-zero exit + 清晰错误消息

## 进度记录

(执行时追加)

## 关联文件

- 修改: `packages/lythoskill-project-cortex/src/cli.ts`
- 引用: `cortex/adr/01-proposed/ADR-20260503003314901-...md` 后续 T1 段

## 引用(per ADR-20260503003315478 references-only)

- ADR: ADR-20260503003314901(git-coupling — 后续 T1)
- Epic: EPIC-20260503010218940(主题A)
- Sibling: TASK-20260503010229362(T3 — 调本 task 实现的命令)

## Git 提交信息建议

```
feat(cortex): extend ADR/epic state machine CLI commands (TASK-20260503010227902)

Closes: TASK-20260503010227902
```

## 备注

- 硬前置 T3(post-commit hook)
- 不在本 task 中实现 lane / checklist(T2 处理)
