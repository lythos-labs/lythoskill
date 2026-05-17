---
lane: main
checklist_completed: true
---

# EPIC-20260503220647: Deck onboarding friction reduction — pre-built decks and 30s quick-start

> K8s 心智的 deck 治理：声明式模板化降低上手门槛，让新用户 30 秒内看到 working set 里出现技能。

## Status History

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-03 | Created — pre-built deck templates + README quick-start refresh |
| active | 2026-05-03 | Themes A+B completed — 4 pre-built decks + README refresh + hyphen alias BDD |
| active | 2026-05-03 | Theme C completed — install-deck.sh one-command installer |
| done | 2026-05-03 | Themes A+B+C done. Theme D (deck demo CLI) remains backlog — value unclear vs install.sh |

## Lane / Granularity 标记

- **Lane**: `main`
- **Workflowy 心智**: deck 生态 Adoption 层——从"能用"到"30 秒上手"

## 背景故事

Deck 的 CLI 已经生产级（20 BDD scenarios，3-axis CRUD 全绿），但上手路径仍有摩擦：

1. **冷启动问题**：新用户装完 Bun 后，要理解 cold pool → deck.toml → link 三层概念才能看到第一个技能
2. **选择 paralysis**：`skill-deck.toml` 是空白的，用户不知道"我该声明什么技能"
3. **格式认知负担**：即使知道要声明什么，还要写对 FQ 路径和 dict 格式

K8s 心智的解法：**预组 deck（pre-built deck）= Helm chart / kustomization 模板**。用户不从零写 manifest，而是 `curl` 一个场景化模板 + `link`，立刻看到效果。

## 需求树

### 主题A: 预组 deck 模板库 ✅ completed
- **触发**: 用户"pdf 和 word 那些第三方广泛传播的，特化了场景的 deck"
- **需求**: 提供 4+ 场景化预组 deck toml，覆盖常见工作流
- **实现**: `examples/decks/*.toml`（documents / engineering / full-stack / governance）
- **产出**: 用户 `curl` 一个 toml → `link` 就能看到技能生效
- **验证**: BDD scenario 覆盖 hyphen alias（`web-search`、`design-doc-mermaid`）在 link 中正确创建 symlink — **21/21 passed**

### 主题B: README 快速开始刷新 ✅ completed
- **触发**: 当前 Quick Start 只展示"add 一个技能"，没有展示"场景化 deck"的价值
- **需求**: Quick Start 加入预组 deck 一行命令体验
- **实现**: README.md / README.zh.md 新增 "Or start with a pre-built deck" 段
- **产出**: 30 秒内 `curl toml + link` 闭环
- **验证**: 人类读者读完 Quick Start 能独立复制命令并跑通

### 主题C: 30 秒体验脚本 ✅ completed
- **触发**: 用户"30s 我觉得应该就是一句 curl 在自己的项目执行一下就成功"
- **需求**: 一键脚本：下载 demo deck → 跑 link → 验证 skills 出现
- **实现**: `examples/install-deck.sh`
- **产出**: `curl -fsSL ... | bash` 或 `curl ... | bash -s engineering` 后 skill-deck.toml + link 完成
- **验证**: 脚本语法通过 shellcheck 等价检查，参数守卫（未知 deck 拒绝、已存在 toml 拒绝）

### 主题D: `deck demo` 命令（可选） #backlog
- **触发**: 用户"技能变成 demo 的那几个，是非常顺滑的体验"
- **需求**: CLI 内置 demo deck 选择器
- **实现**: `deck demo` 列出预组 deck → 用户选一个 → 写入 skill-deck.toml → link
- **产出**: 不依赖 curl/网络，纯本地体验
- **验证**: BDD scenario

## 技术决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 预组 deck 位置 | `examples/decks/*.toml` | 与仓库共存，raw GitHub URL 可直接 curl |
| 格式 | alias-as-key dict | 当前 schema 标准，已验证 |
| alias 命名 | 短语义名（`pdf`, `tdd`） | 读者秒懂，已验证 hyphen 合法 |
| 依赖技能 | 第三方广泛传播的技能 | 社区认可度高，降低"这是什么"的认知负担 |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260503220647-A | in-progress | Pre-built deck templates (documents / engineering / full-stack / governance) |
| TASK-20260503220647-B | in-progress | README Quick Start refresh (en + zh) |
| TASK-20260503220647-C | backlog | 30s install script |
| TASK-20260503220647-D | backlog | `deck demo` CLI command |

## 验收标准

- [ ] 4 个预组 deck toml 文件入 `examples/decks/`
- [ ] hyphen alias BDD scenario 通过（`web-search`, `design-doc-mermaid`）
- [ ] README Quick Start 展示 curl + link 一行体验
- [ ] SCENARIOS.md / README scenario count 同步
- [ ] 用户能在 30 秒内从"没听过 deck"到"`.claude/skills/` 里有技能"
