---
lane: main
checklist_completed: false
checklist_skipped_reason: T1-T2 are pure refactors with existing test coverage; T3-T5 are new UX
lane_override_reason: "UX-layer epic: URL-first experience across all CLI surfaces"
---
# EPIC-20260508082810062: Everything-from-URL: deck, arena, task, agents.md as network-native resources

> Everything-from-URL: `deck link --deck <url>` proved the pattern. Now make every CLI surface URL-native.

## Status History

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-08 | Created; deck link + arena agent-run already support URL |

## 背景故事

`deck link --deck <url>` (ADR-20260508075301691) 和 `arena agent-run --deck <url>` 证明了 URL-as-resource 模式可行。但当前只有 link 和 arena 支持 URL — validate, add, refresh, remove, prune, sync, freeze, reconcile 全都不支持。URL fetch 逻辑只存在于 link.ts 中，没有共享。

同时，11 个预组 deck 在 `examples/decks/` 中全部通过了 `--remote` 验证 — 它们已经是高质量的网络原生资源。用户可以通过 `curl | link` 获取，但缺少"先验证再采用"的体验（`deck validate <url>` → 满意 → `deck link <url>`）。

更大的图景：lythoskill 资源（deck, task, agents.md）应该是 URL 可寻址的，类似 DeepWiki 的"一个 URL 就能工作"体验。

## 需求树

### T1: 提取共享 `resolveDeckPath()` — URL fetch 去重 #backlog
- **触发**: URL fetch 逻辑只在 link.ts，其他 8 个命令无法复用
- **需求**: 新建 `packages/lythoskill-deck/src/resolve-deck.ts`
  - `async resolveDeckPath(cliArg?: string): Promise<string>` — 输入 URL/路径/空，返回本地文件路径
  - URL → fetch + 保存到临时文件或 cwd → 返回本地路径
  - 本地路径 → 返回 resolve() 后的绝对路径
  - 空 → findDeckToml(cwd) 或默认 "skill-deck.toml"
  - 超时 30s，错误友好
- **实现**: 从 link.ts 提取 fetch 逻辑，所有命令改用 resolveDeckPath
- **验证**: link.ts 行为不变（regression test），resolveDeckPath 纯函数可单测

### T2: 全命令 URL 化 — validate, add, refresh, remove, prune, sync, freeze, reconcile #backlog
- **触发**: T1 完成后，所有命令自动获得 URL 支持
- **需求**: 每个命令的 --deck 参数都通过 resolveDeckPath() 解析
  - `deck validate --deck <url>` — 先 fetch 再验证（"先看再买"）
  - `deck add <locator> --deck <url>` — fetch deck, 加 skill, 写回本地
  - `deck refresh --deck <url>` — 刷新远程 deck 声明的 skills
  - `deck reconcile --deck <url>` — 远程 deck 的漂移检测
- **实现**: 逐一替换 cli.ts 中 resolve(cliDeck) → await resolveDeckPath(cliDeck)
- **验证**: 每个命令的 CLI BDD 场景加 URL 变体

### T3: `deck validate <url>` 作为"发现-评估-采用"入口 #backlog
- **触发**: 用户想先看 deck 里有什么 skill，再决定是否采用
- **需求**: `deck validate --deck <url> --remote` — 显示所有 skill 的验证结果，不保存 deck 文件
- **实现**: validate 已支持 --deck 参数，T2 加上 URL fetch 后自然实现
- **验证**: `deck validate --deck <raw-url>/scout.toml --remote` → 显示 1 skill valid

### T4: Task from URL — cortex task URL 模板 #backlog
- **触发**: 类似 deck 预组，task 模板也应该可以 URL 获取
- **需求**: `cortex task <url>` — fetch 远程 task 模板，存入 backlog
- **实现**: fetch markdown → 解析 frontmatter → create task with body
- **验证**: 用 raw GitHub URL 的 task 模板测试

### T5: AGENTS.md as network-native agent bootloader #backlog
- **触发**: `playground/architecture-explainer/AGENTS.md` 验证了模式：agent 读取 AGENTS.md → 知道 cwd 的 parent 是主项目 → 访问 cortex/wiki/ADR → 产出架构文档。Karpathy 的 skills 实践也在社交媒体流传：指定一个指令文件，agent 启动即理解任务。
- **需求**:
  - AGENTS.md 可通过 URL 引用：`deck link --deck <url>` 之后，AGENTS.md URL 告诉 agent 做什么
  - `AGENTS.md` 作为 bootloader 的约定：声明 skills 可用性、parent 项目上下文、任务描述、输出目标
  - 与 CLAUDE.md 的分工：CLAUDE.md = 项目规范（稳定），AGENTS.md = 本次任务 bootloader（可变）
- **实现**: 模式文档化到 wiki，示例 AGENTS.md（architecture-explainer 已验证），README 加 AGENTS.md URL 引导
- **验证**: agent 进入 playground 目录 → 读 AGENTS.md → 正确导航 parent → 完成任务

### T6: 预组 deck 注册表 + 快捷指令 #backlog
- **触发**: 11 个预组 deck 已全部 --remote 验证通过，但缺少统一入口
- **需求**:
  - `examples/decks/INDEX.md` — deck 名称、用途、URL、skill 数量表
  - README 快捷指令章节（已部分完成）
  - `deck link --deck <shortname>` 的想法（后续：deck registry）
- **实现**: INDEX.md 生成（可手写初版，后续 cortex index 自动化）
- **验证**: 每个 INDEX 条目可点击 URL 直接获取 deck

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260508075301691 | deck link --deck accepts http/https URL (fetch + save + link) | accepted |
| ADR-20260508074057834 | working_set path resolution: --deck explicit → cwd default | accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|

## 经验沉淀

## 归档条件
- [x] T1: resolveDeckPath 提取（resolve-deck.ts: sync/async split）
- [x] T2: 全命令 URL 化 — scope corrected: link + validate only（其余操作本地资源）
- [x] T3: `deck validate <url>` — URL dispatch at CLI layer, fetch → validate → report
- [x] ~~T4~~: merged into T5（AGENTS.md IS the task）
- [x] T5: AGENTS.md bootloader — wiki documented + playground PoC + fact-checked cross-tool standard
- [x] T6: 预组 deck INDEX.md — 11 decks catalogued by use case with raw URLs
