# TASK-20260423124059736: Create lythoskill ecosystem skill templates (creator/builder/curator)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-04-23 | Created |

## 背景与目标

lythoskill 是一个自举的 thin-skill monorepo 脚手架。"自举"指它使用自身的 thin-skill 模式来构建和管理自身。核心模式是把"重逻辑"放在 npm 包（Starter），"轻描述"放在 Skill（SKILL.md + scripts）。

当前生态只有两类 skill：
1. `lythoskill-creator`：生成新 lythoskill 项目
2. `lythoskill-project-cortex`：GTD 项目管理

缺少两类关键角色：
- **builder**：负责把 Starter 包构建成轻量 Skill（当前仅有 `build` CLI 命令，没有独立的 skill 模板）
- **curator**：负责扫描、索引、推荐 skill 组合（当前完全缺失）

本 Task 的目标是为这三类角色提供标准化模板，使未来任何开发者都能按统一模式扩展 lythoskill 生态。

## 需求详情

### skill-creator（已有，需验证）
- [ ] 检查 `skills/lythoskill-creator/` 是否包含完整的 SKILL.md + scripts
- [ ] 运行 `bun packages/lythoskill-creator/src/cli.ts build lythoskill-creator` 生成 dist
- [ ] 确认 dist 产物仅包含 SKILL.md + scripts（符合 thin-skill 规范）

### skill-builder（新建）
- [ ] 设计 builder 的职责边界：接收 Starter 包路径 → 过滤 dev 文件 → 验证 frontmatter → 输出 dist/
- [ ] 在 `skills/` 下新建 `lythoskill-builder/`，包含 SKILL.md + scripts/
- [ ] SKILL.md 中必须描述 build 命令的完整行为（过滤规则、验证规则、输出结构）

### skill-curator（新建）
- [ ] 设计 curator 的职责边界：扫描 skill 池 → 提取元数据 → 生成索引 → 推荐组合
- [ ] 在 `skills/` 下新建 `lythoskill-curator/`，包含 SKILL.md + scripts/
- [ ] SKILL.md 中必须描述 curator 的使用场景（如"为代码审查推荐 skill 组合"）

## 技术方案

参考已有 skill 的 Thin Skill Pattern：
- `packages/<name>/` = Starter（npm 包，含 CLI）
- `skills/<name>/` = Skill（SKILL.md + scripts/）
- `dist/<name>/` = 发布产物

builder 和 curator 的 Starter 包可以暂时为空（仅预留目录），但 Skill 层必须先有完整描述，因为 Skill 层定义了"人类/Agent 如何使用这个能力"。

参考文件：
- `skills/lythoskill-creator/SKILL.md` — 现有 skill 的参考模板
- `skills/lythoskill-project-cortex/SKILL.md` — 带 frontmatter 的参考模板
- `packages/lythoskill-creator/src/build.ts` — build 命令的实现参考

## 验收标准

- [ ] `skills/lythoskill-creator/` 完成 build 并输出到 `dist/lythoskill-creator/`
- [ ] `skills/lythoskill-builder/` 存在，SKILL.md + scripts/ 完整，dist 产物符合规范
- [ ] `skills/lythoskill-curator/` 存在，SKILL.md + scripts/ 完整，dist 产物符合规范
- [ ] 三个 skill 的 SKILL.md 脱离本项目任何内部文档（包括 AGENTS.md、Epic、Wiki）仍能独立理解

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- **修改**: `skills/lythoskill-creator/SKILL.md`（如需补全）
- **创建**: `skills/lythoskill-builder/SKILL.md`, `skills/lythoskill-builder/scripts/`
- **创建**: `skills/lythoskill-curator/SKILL.md`, `skills/lythoskill-curator/scripts/`
- **参考**: `skills/lythoskill-project-cortex/SKILL.md`

## Git 提交信息建议
```
feat(skills): add builder and curator skill templates (TASK-20260423124059736)

- Verify lythoskill-creator completeness and build dist
- Create lythoskill-builder skill with build pipeline docs
- Create lythoskill-curator skill with indexing docs

Refs: EPIC-20260423102000000
```

## 备注

- 优先级: Medium
- 阻塞: 无（但建议先完成本 Task 再推进 USR-006，因为命名规范会影响 skill 前缀）
