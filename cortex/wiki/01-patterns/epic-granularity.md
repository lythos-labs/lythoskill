# Pattern: Epic Granularity

> 状态: ✅ 实践验证中

## 核心原则

**Epic = 迭代里程碑，不是任务分类器。**

一个 Epic 应该对应"一个可以独立交付价值的阶段"，例如：
- MVP（初次上线）
- v1.0（正式版）
- v2.0（大版本升级）

## 判断标准

### ✅ 应该开 Epic 的情况

- 需要跨多周/多月的阶段性目标
- 有明确的"完成定义"（Definition of Done）
- 完成后可以对外宣布一个里程碑
- 内部包含多个 Task，可能涉及多个 ADR

### ❌ 不应该开 Epic 的情况

- 一个具体的功能点（用 Task）
- 一个技术决策（用 ADR）
- 日常 bug 修复（用 Task）
- 文档更新（用 Task）

## 反模式

| 反模式 | 例子 | 后果 |
|--------|------|------|
| **每个任务都开 Epic** | "修复登录 bug" 也开一个 Epic | Epic 泛滥，失去里程碑意义 |
| **Epic 即任务清单** | Epic 里只有平铺的任务列表 | 应该用 Task 管理，Epic 应聚焦"为什么这个阶段重要" |
| **Epic 永不归档** | 长期活跃的 Epic 不断加新任务 | 说明粒度太粗或范围失控，应拆分新 Epic |

## 本项目实践

当前只有一个 Epic：

- **EPIC-20260423102000000**: lythoskill MVP — Initial Release

所有开发工作（init 命令、build 命令、ESM 修复、文档、模式沉淀）都挂在这个 MVP 里程碑下。当 MVP 完成并归档后，下一个 Epic 可能是 "lythoskill v1.0 — Ecosystem Ready"。

## Task 与 Epic 的关系

```
Epic (MVP)
  ├── Task: 实现 init 命令
  ├── Task: 实现 build 命令
  ├── Task: 修复 ESM require bug
  ├── Task: 编写 ADR
  └── Task: 沉淀 Wiki
```

Epic 回答"我们要到达哪个里程碑"，Task 回答"具体做什么"。

## 相关

- EPIC-20260423102000000: 本项目的 MVP Epic 示例
