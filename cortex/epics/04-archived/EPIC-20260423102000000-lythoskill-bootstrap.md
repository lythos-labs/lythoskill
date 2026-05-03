# EPIC-20260423102000000: lythoskill MVP — Initial Release

> **Epic 粒度原则**: 本 Epic 对标"初次上线前必须完成的所有工作"，是一个迭代里程碑，而非功能清单。Epic 不应细到每个任务都开一个，而是聚合同一里程碑下的所有工作。

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-04-23 | Migrated from old format |
| active | 2026-04-23 | Published @lythos/skill-deck, @lythos/skill-creator, @lythos/project-cortex to npm |
| active | 2026-04-23 | Created lythos-labs/lythoskill GitHub repo with CI/CD workflow |
| archived | 2026-05-02 | Epic completed; project self-bootstrapped. Migrated to archive. |

## Background Story

lythos 生态需要一个标准的 skill 开发模式。核心矛盾：开发态需要 monorepo 的完整性，发布态需要极致的轻量。本 EPIC 实现 lythoskill 工具的自举——用 lythoskill 模式创建 lythoskill 本身，并作为 MVP 完成首次可发布状态。

Trademark: **lythos** (λίθος, stone)
Pattern name: **lythoskill** (lythos + skill, wordplay)

## Requirement Tree

- [x] **USR-001**: Scaffold thin-skill monorepo (init command)
- [x] **USR-002**: Build skill for distribution (build command)
- [x] **USR-003**: Self-bootstrap — lythoskill is a lythoskill project itself
- [x] **USR-004**: ESM-only, no require() in generated code
- [x] **USR-005**: 创建 lythoskill 生态核心角色模板
  - skill-creator：✅ 已完成 `skills/lythoskill-creator/` + npm 发布 `@lythos/skill-creator`
  - skill-builder：⚠️ 合入 creator（build 命令已可用，无需独立模板）
  - skill-curator：⬜ 尚未创建（待后续迭代）
- [x] **USR-006**: 定义并实施 lythos 生态命名规范与发布路径
  - npm scope: `@lythos/*` ✅ 已注册并发布 `@lythos/skill-creator`, `@lythos/skill-deck`, `@lythos/project-cortex`
  - GitHub org: `lythos-labs/` ✅ 已创建 `lythos-labs/lythoskill`
  - PyPI prefix: `lythos-*` ⬜ 尚未注册（Python 技能待后续迭代）
  - Skill prefix: `lythoskill-*` ✅ 已统一使用

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
5. **Skill naming alignment**: `lythoskill` = `lythos` + `skill`。npm 包名应加 `skill-` 前缀（`@lythos/skill-deck`）与 skill 名语义对齐。非 skill 工具（如 project-cortex）不需要前缀
6. **Vercel skills 兼容**: `skills/` 目录必须提交到 Git，且 `SKILL.md` frontmatter 必须是合法 YAML（引号要包完整）
7. **README.md 是 skill repo 的门面**: 必须有技能列表表格、安装方式、项目概述，否则 `npx skills add` 用户无法发现价值

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
- [x] npm packages published and installable (`bunx @lythos/*` works)
- [x] GitHub repo created with CI/CD workflow
- [x] README.md for skill repo discoverability
- [x] CLAUDE.md for agent developer guidance
