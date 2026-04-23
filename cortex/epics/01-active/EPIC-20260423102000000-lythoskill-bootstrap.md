# EPIC-20260423102000000: lythoskill MVP — Initial Release

> **Epic 粒度原则**: 本 Epic 对标"初次上线前必须完成的所有工作"，是一个迭代里程碑，而非功能清单。Epic 不应细到每个任务都开一个，而是聚合同一里程碑下的所有工作。

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-04-23 | Migrated from old format |

## Background Story

lythos 生态需要一个标准的 skill 开发模式。核心矛盾：开发态需要 monorepo 的完整性，发布态需要极致的轻量。本 EPIC 实现 lythoskill 工具的自举——用 lythoskill 模式创建 lythoskill 本身，并作为 MVP 完成首次可发布状态。

Trademark: **lythos** (λίθος, stone)
Pattern name: **lythoskill** (lythos + skill, wordplay)

## Requirement Tree

- [x] **USR-001**: Scaffold thin-skill monorepo (init command)
- [x] **USR-002**: Build skill for distribution (build command)
- [x] **USR-003**: Self-bootstrap — lythoskill is a lythoskill project itself
- [x] **USR-004**: ESM-only, no require() in generated code
- [ ] **USR-005**: 创建 lythoskill 生态三类核心角色的标准化模板
  - skill-creator：已有 `skills/lythoskill-creator/`，需验证完整性并 build dist
  - skill-builder：构建分发的标准化流程（当前仅有 build 命令，缺独立 skill 模板）
  - skill-curator：技能池策展工具（尚未创建，需设计 SKILL.md + scripts）
- [ ] **USR-006**: 定义并实施 lythos 生态命名规范与发布路径
  - npm scope: `@lythos/*`
  - PyPI prefix: `lythos-*`
  - Skill prefix: `lythoskill-*`
  - 当前仅停留在 AGENTS.md 计划段落，未实际注册/发布

## Technical Decisions

| Decision | ADR | Status |
|---------|-----|--------|
| Thin Skill Pattern | ADR-20260423101938000 | Accepted |
| ESM import over require | ADR-20260423101950000 | Accepted |
| Bun runtime | N/A (implicit) | Active |
| Zero deps in starter | N/A (implicit) | Active |

## Naming Convention

```
GitHub:   lythos-labs/ (organization)
npm:      @lythos/* (scope)
PyPI:     lythos-* (prefix)
Skills:   lythoskill-* (trademarked prefix)
```

## Lessons Learned

1. **Self-bootstrap is proof**: 如果 lythoskill 不能 scaffold 自己，说明模式不完整
2. **fence trick**: 模板字符串中嵌套反引号的唯一干净方式是 `` '`'.repeat(3) ``
3. **Bun built-ins sufficient**: fs/path all built-in, zero external dependencies needed
4. **Epic 粒度**: Epic 是里程碑，不是任务分类器。一个迭代周期（如 MVP）只应有一个 Epic，所有相关任务挂在其下。任务粒度用 Task 管理，Epic 粒度用"能否独立交付价值"判断

## Related Tasks

| Task | Status | Description |
|------|--------|-------------|
| TASK-20260423102009000 | ✅ | Generate lythoskill project files |
| TASK-20260423124059736 | ⬜ | Create skill-creator/builder/curator templates |
| TASK-20260423124059766 | ⬜ | Define lythos naming conventions and publish path |

## Archive Criteria

- [x] Build produces clean dist/ with exactly SKILL.md + scripts/
- [x] ESM require bug fixed in starterCli template
- [x] Cortex governance docs complete
- [x] Thin skill pattern documented in ADR + Wiki
