# TASK-20260503010228602: 实现 cortex epic create 双轨 + checklist + probe lane 扩展

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created |

## 背景与目标

ADR-20260503003315478 选项 E 的核心机制实现。`cortex epic create` 时:

- **Hard**:lane 检查(main / emergency 各 ≤ 1)
- **Soft**:5 题 checklist
- 同时扩展 `cortex probe` 检查 lane 超额

把 epic 创建从"agent 自觉"变为 admission control 工具不变量。

## 需求详情

- [ ] `cortex epic "<title>" --lane main|emergency` — 必填,缺省时报错引导
- [ ] Lane-full 拒绝:目标 lane 已有 active epic → 阻断,提示四选一(完成 / 挂起 / 归档 / 重分类为现有 epic 的 task)
- [ ] `--override "<reason>"` 应急口:lane 满时绕过,理由记入 epic frontmatter `lane_override_reason`
- [ ] 5 题 checklist(题目见 ADR-B 方案 E):outcome 明确 / 可结案性 / 1~3 周尺寸 / 不是 task / 不是 ADR
- [ ] `--skip-checklist [reason]` 跳过,reason 记入 frontmatter
- [ ] Epic frontmatter 新字段:`lane`、`checklist_completed`、`checklist_skipped_reason`(可选)、`lane_override_reason`(可选)
- [ ] `cortex probe` 扩展:扫描 `01-active/` 下 epic,统计 lane 数;main > 1 或 emergency > 1 → warn
- [ ] 更新 epic 模板顶部加 callout:"Epic 是什么 / 不是什么 + Workflowy focus 心智 + 双轨说明"

## 技术方案

- 实现位置:`packages/lythoskill-project-cortex/src/cli.ts`(epic 子命令扩展)
- 模板:若已有 `templates/epic.md` 修改;否则先抽出为模板再用
- Checklist prompt:简单 readline 交互;非 TTY 场景 fallback 到 `--skip-checklist` warn
- Frontmatter:可继续用现有 Status History + 在文件顶部加 YAML 块兼容
- Probe:复用现有 probe 入口,加 lane 统计子检查

## 验收标准

- [ ] `cortex epic "X" --lane main` 在 main lane 已有 active epic 时拒绝
- [ ] `cortex epic "X" --lane main --override "reason"` 通过,frontmatter 含 reason
- [ ] checklist 5 题 prompt 可创建;`--skip-checklist "reason"` 也可,frontmatter 区分
- [ ] `cortex probe` 在主动构造 2 个 main lane epic 的 fixture 上输出 warn
- [ ] 已有 `EPIC-20260503010218940` 加 `lane: main` 字段后 probe 不报警

## 进度记录

(执行时追加)

## 关联文件

- 修改: `packages/lythoskill-project-cortex/src/cli.ts`
- 修改/新增: `packages/lythoskill-project-cortex/templates/epic.md`
- 修改: `cortex/epics/01-active/EPIC-20260503010218940-...md`(回填 lane: main 字段)

## 引用

- ADR: ADR-20260503003315478(方案 E + 决策驱动 + 决策原因 1-3 + 影响段)
- Epic: EPIC-20260503010218940(主题B)
- Sibling: TASK-20260503010227902(T1 — 状态机命令前置)

## Git 提交信息建议

```
feat(cortex): epic create dual-lane + checklist + probe lane check (TASK-20260503010228602)

Closes: TASK-20260503010228602
```

## 备注

- 不依赖 hook(T3/T4),但 T5 的文档需要等 lane / checklist UX 稳定后再写
