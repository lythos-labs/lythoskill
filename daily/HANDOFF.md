---
type: handoff
created_at: 2026-05-01T02:56:00
session_rounds: ~25
git_branch: main
git_commit: 624c5ac
---

# Handoff: Skills branch 修复 + 文档全名化 + .claude-plugin 补充

## 0. 验证当前状态（请先运行）⭐

```bash
# 1. 查看从 handoff 创建后有哪些新改动
git diff 624c5ac --stat

# 2. 查看当前 working tree 状态
git status --short

# 3. 查看最近 commit 是否匹配
git log --oneline -5

# 4. 检查 skills 分支是否同步
git log refs/heads/skills --oneline -1
```

**注意**: `624c5ac` 和 `41fe947` 是另一个 session（Claude Sonnet）提交的，内容见下方。本 handoff 记录的是后续 Kimi session 的工作。

---

## 1. 项目身份

- **项目名称**: lythoskill
- **类型**: thin-skill monorepo
- **技术栈**: Bun runtime, pnpm workspaces, TypeScript ESM
- **当前分支**: `main`
- **最近 commit**: `624c5ac` — docs(wiki): add external-skill-governance-bridge pattern

## 2. 本次 Session 做了什么

### 已完成修改

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `.claude-plugin/marketplace.json` | add | Vercel skills.sh 入口，注册 10 个 skill |
| `.claude-plugin/plugin.json` | add | Repo 元数据 |
| `.github/workflows/sync-skills.yml` | delete | 删除不可靠的 GitHub workflow |
| `.husky/post-commit` | add | Hexo-style 同步 skills 分支 |
| `.husky/pre-push` | add | Push main 时连带 push skills 分支 |
| `README.md` / `README.zh.md` | modify | innate/tool 示例短名 → 全名 |
| `packages/lythoskill-deck/README.md` | modify | `skill-a/skill-b` → 社区全名 |
| `packages/lythoskill-deck/skill/references/toml-format.md` | modify | 短名 → 社区全名 |
| `cortex/adr/...player-deck-separation` | modify | 短名 → 社区全名 |
| `cortex/wiki/01-patterns/player-deck-separation` | modify | 表格短名 → 全名 |
| `cortex/wiki/03-lessons/skill-selection-case-study` | modify | `docx/design-doc-mermaid` → 全名 |
| `packages/lythoskill-arena/skill/references/combo-and-synergy.md` | modify | `report-generation-combo` → 全名 |
| `skills/lythoskill-deck/references/toml-format.md` | modify | build 输出同步更新 |
| `skills/lythoskill-arena/references/combo-and-synergy.md` | modify | build 输出同步更新 |

**已推送到 GitHub**: main (`a71fcbb`) 和 skills (`aaa5594`) 均已 push。

---

## 3. 关键决策

| 决策 | 考虑过的选项 | 最终选择 | 理由 |
|------|-------------|---------|------|
| skills 分支同步机制 | GitHub workflow / husky / 手动 | husky (post-commit + pre-push) | workflow 已落后 19 commits，不可靠；husky 在本地执行，确定性高 |
| 短名 vs 全名 | 保留短名 / 全名 | 文档示例强制全名 | 短名在扁平 monorepo（mattpocock/skills）中会冲突，全名无歧义 |
| skills 分支是否保留 | 删除 / 保留 | 保留 | 虽然 `npx skills add` 拉的是 main，但 `git clone -b skills` 仍是轻量备用入口 |

---

## 4. 踩过的坑与修正 ⭐

### 坑 1: hexo-style deploy 不能直接 `git update-ref`

- **错误尝试**: 在临时目录创建 git repo，commit 后用 `git update-ref refs/heads/skills <commit>` 更新主 repo 的 skills 分支
- **结果**: `fatal: update_ref failed... trying to write ref with nonexistent object`
- **根因**: 临时 repo 的 object database 与主 repo 隔离，commit hash 在主 repo 中不存在
- **正确做法**: 在主 repo 内用 `GIT_INDEX_FILE=.git/skills-index` + `git read-tree --empty` + `git update-index` + `git write-tree` + `git commit-tree` + `git update-ref` 直接创建 commit

### 坑 2: `git log skills` 歧义

- **错误尝试**: `git log skills --oneline -1`
- **结果**: `fatal: ambiguous argument 'skills': both revision and filename`
- **根因**: `skills/` 目录和 `skills` 分支同名
- **正确做法**: 始终使用 `git log refs/heads/skills --oneline -1`

### 坑 3: GitHub SSH (calt13.github.com:36022) 连接超时

- **现象**: `git push origin main` 超时
- **根因**: remote URL 是 `git@calt13.github.com:lythos-labs/lythoskill.git`，SSH 端口 36022 不通
- **正确做法**: 临时切换为 HTTPS: `git remote set-url origin https://github.com/lythos-labs/lythoskill.git`

### 坑 4: `npx skills add` 默认拉 main 分支

- **发现**: 即使存在 `skills` 分支，`npx skills add lythos-labs/lythoskill` 仍然下载 main 分支的全部内容
- **结论**: `skills` 分支对 Vercel 用户不可见；`.claude-plugin/marketplace.json` 才是 `npx skills add` 的真正入口

---

## 5. 真实状态（Ground Truth）⭐

| 文件 | 状态 | 说明 |
|------|------|------|
| `main` 分支 | ✅ committed & pushed | `624c5ac` 为最新 |
| `skills` 分支 | ✅ committed & pushed | `aaa5594`，与 main 的 `skills/` 无 diff |
| `.claude-plugin/` | ✅ committed & pushed | marketplace.json + plugin.json |
| `.husky/post-commit` | ✅ committed & pushed | 含 skills 分支同步逻辑 |
| `.husky/pre-push` | ✅ committed & pushed | 含 skills 分支推送逻辑 |
| `daily/HANDOFF.md` | 🆕 untracked | 本文件，session 交接用 |

### 环境状态

- **Bun 版本**: bun 1.x
- **依赖**: 无需更新
- **运行中进程**: 无

---

## 6. 下一步 ⭐

1. **验证 husky 稳定性**: 下次修改 `packages/**/skill/` 文件并 commit 时，确认 post-commit 是否自动更新 skills 分支
2. **观察 marketplace.json 效果**: 等网络恢复后，实际运行 `npx skills add lythos-labs/lythoskill` 验证 `.claude-plugin/` 是否被正确读取
3. **维护 marketplace.json**: 新增 skill 时记得同步更新 `.claude-plugin/marketplace.json` 中的 `skills` 数组
4. **文档跟进**: `cortex/wiki/01-patterns/skill-selection-pipeline.md` 中的 ASCII art 仍含短名（`docx` / `web-search`），但属于示意图而非可复制配置，暂未修改

---

## 7. 接手自检

- [ ] `git status` 输出 clean
- [ ] `git log --oneline -3` 包含 `624c5ac`
- [ ] `git log refs/heads/skills --oneline -1` 输出 `aaa5594`
- [ ] `git diff main refs/heads/skills -- skills/` 无差异

---

*Updated by project-scribe during session handoff*
*Next agent should read this file BEFORE exploring the repository*
