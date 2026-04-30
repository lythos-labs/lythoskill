---
type: handoff
created_at: 2026-05-01T03:00:00
session_rounds: ~80
git_branch: main
git_commit: 6dd060c
---

# Handoff: Creator 0.6.2 发布 + Mermaid 套件 0.2.2 发布 + Coach 重命名

## 1. 项目身份

- **项目名称**: lythoskill
- **类型**: thin-skill monorepo（npm 包 + SKILL.md agent skill 双层结构）
- **技术栈**: Bun runtime, pnpm workspaces, TypeScript ESM
- **当前分支**: `main`
- **最近 commit**: `6dd060c` — chore: add .claude-plugin for Vercel skills.sh compatibility; replace workflow with husky for skills branch sync

## 2. 本次 Session 做了什么

### 主项目 (lythoskill)

| Commit | 说明 |
|--------|------|
| `a17c565` | **feat(creator)**: init 模板自带 husky + pre-commit；新增 `align` 命令审计项目规范 |
| `d9f825a` | **chore**: 全项目版本 0.6.1 → 0.6.2，同步所有 package.json 和 SKILL.md，发布到 npm |
| `85e4c37` | **refactor(coach)**: `lythoskill-skill-coach` → `lythoskill-coach`（lythoskill 已含 skill 概念）|
| `6dd060c` | **chore**: 新增 `.claude-plugin/`（Vercel skills.sh 兼容）；删除 `.github/workflows/sync-skills.yml`；新增 `.husky/post-commit` + `pre-push` |

**已发布到 npm 的包（0.6.2）:**
- `@lythos/hello-world`
- `@lythos/project-cortex`
- `@lythos/skill-curator`
- `@lythos/skill-arena`
- `@lythos/skill-creator`（含 align 命令）
- `@lythos/skill-deck`

### 独立项目：lythoskill-mermaid（dogfooding demo）

仓库: `github.com:lythos-labs/lythoskill-mermaid.git`

| Commit | 说明 |
|--------|------|
| `67a87d7` | 统一版本管理：root package.json 为 version source of truth，`sync-versions.ts` 自动同步 |
| `91048ee` | **fix(bin)**: shell wrapper → Node.js `.cjs` wrapper，`realpathSync(__filename)` 解决 bunx symlink 解析问题 |
| `feaa915` | **fix(validate)**: `mermaid-validate check missing.mmd` 返回干净 `File not found` 而非 Bun stack trace |

**已发布到 npm 的包（0.2.2）:**
- `@lythos/mermaid-describe`
- `@lythos/mermaid-validate`
- `@lythos/mermaid-render`
- `@lythos/design-system`

## 3. 关键决策

| 决策 | 选项 | 选择 | 理由 |
|------|------|------|------|
| bin wrapper 方案 | shell `dirname "$0"` / Node `.cjs` / 编译为 `.js` | Node `.cjs` + `realpathSync` | shell 不解 symlink，bunx 的 `.bin/` 结构下路径解析错误；Node `__filename` + `realpathSync` 跨平台可靠 |
| align 命令 scope | 只读 audit / 可修复 | 可修复（`--fix`）| 用户明确要"少了的东西可以加回来，不用 reinit" |
| 历史文档是否改名 | 全改 / 只改 functional | 只改 functional | daily 和 epic 是历史记录，保留原貌；仅更新实际文件路径和 skill-deck.toml |

## 4. 踩过的坑与修正

### 坑 1: bunx 执行报 "Module not found"

- **错误尝试**: 用 `#!/bin/sh` + `bun "$(dirname "$0")/../src/cli.ts"` 做 bin wrapper
- **正确做法**: 改成 `#!/usr/bin/env node` + `realpathSync(__filename)` 的 `.cjs` wrapper
- **根因**: `dirname "$0"` 不解 symlink。npm/bunx 在 `node_modules/.bin/` 创建 symlink 指向包的 `bin/` 脚本，此时 `$0` 是 `.bin/` 下的 symlink 路径，`dirname` 返回 `.bin/` 而非实际脚本目录，`../src/cli.ts` 就指向了错误位置
- **浪费 time**: ~15 分钟（subagent 测试发现 → 本地复现 → 修复 → 模拟 npm symlink 验证 → 重发布）

### 坑 2: GitHub push 反复 timeout

- **错误尝试**: 反复 `git push origin main`
- **正确做法**: 切 HTTPS remote 推送，SSH 等代理恢复后再切回来
- **根因**: SSH config 中 `calt13.github.com` 使用 `ProxyJump dogyun-proxy`，该代理节点当前不可达
- **影响**: lythoskill-mermaid 项目的 `feaa915`（0.2.2 修复）尚未推送到 GitHub，已发布到 npm

### 坑 3: `type: module` 包中 `.cjs` 被当作 ESM

- **错误尝试**: bin wrapper 文件无扩展名，被 `package.json` 的 `"type": "module"` 强制当作 ESM
- **正确做法**: 显式使用 `.cjs` 扩展名强制 CommonJS
- **根因**: Node.js 在 `"type": "module"` 包中，无扩展名文件也按 ESM 解析，`require()` 会报 `ReferenceError`

## 5. 真实状态

### 主项目 (lythoskill)

| 文件/目录 | 状态 | 说明 |
|-----------|------|------|
| `packages/lythoskill-creator/src/align.ts` | ✅ committed | 新增 align 命令完整实现 |
| `packages/lythoskill-creator/src/init.ts` | ✅ committed | 新增 husky 目录和文件创建 |
| `packages/lythoskill-creator/src/templates.ts` | ✅ committed | 新增 `huskyPreCommit()` 模板函数，rootPackageJson 含 devDependencies |
| `packages/lythoskill-coach/` | ✅ committed | 原名 `lythoskill-skill-coach`，git mv 保留历史 |
| `.claude-plugin/` | ✅ committed | Vercel skills.sh 兼容配置 |
| `.husky/post-commit` | ✅ committed | 自动 push built skills 到 skills 分支 |
| `.husky/pre-push` | ✅ committed | 自动同步 skills 分支 |
| `.github/workflows/sync-skills.yml` | ❌ deleted | 已被 husky 替代 |
| Working tree | ✅ clean | 无未提交修改 |
| vs origin/main | ⬆️ ahead 1 | `6dd060c` 未推送（但已可推，SSH 正常）|

### Mermaid 项目 (lythoskill-mermaid) — 独立仓库

| 文件/目录 | 状态 | 说明 |
|-----------|------|------|
| `scripts/sync-versions.ts` | ✅ committed | 根 package.json version 同步到所有子包和 SKILL.md |
| `scripts/publish.sh` | ✅ committed | 按依赖顺序发布 4 个包 |
| `packages/*/bin/*.cjs` | ✅ committed | Node.js wrapper，解决 symlink 问题 |
| `packages/mermaid-validate/src/index.ts` | ✅ committed | 新增 ENOENT try-catch |
| `feaa915` (0.2.2) | 📝 unpushed | GitHub 443 timeout，稍后需手动 push |
| npm registry | ✅ published | 4 个包全部 0.2.2 |

## 6. 下一步

1. **推送 mermaid 项目**: `cd /tmp/lythoskill-mermaid && git push origin main`（网络恢复后执行）
2. **验证 creator align**: 找个旧项目跑 `bunx @lythos/skill-creator align --fix` 测试实际效果
3. **考虑 bump 主项目 0.6.3**: 当前主项目有未推送的 `6dd060c`，需决定是否发布
4. **mermaid 项目 subagent 复测**: 网络恢复后，用 subagent 完整跑一遍 bunx end-to-end workflow（此前因 bin wrapper bug 中断）

## 7. 接手自检

- [ ] `git status` 在主项目输出 clean，ahead origin/main by 1
- [ ] `git log --oneline -3` 显示 `6dd060c`, `85e4c37`, `d9f825a`
- [ ] `/tmp/lythoskill-mermaid/` 存在且 `git log` 显示 `feaa915` 为 HEAD
- [ ] `npm view @lythos/skill-creator version` 返回 `0.6.2`
- [ ] `npm view @lythos/mermaid-validate version` 返回 `0.2.2`

---

*Updated by project-scribe during session handoff*
*Next agent should read this file BEFORE exploring the repository*
