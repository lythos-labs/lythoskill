# TASK-20260528114758563: Fix site command shorthands — ensure all code blocks use runnable commands, establish shorthand resolution convention in AGENTS.md

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-28 | Created — prior agent-written site docs contain bare shorthands that aren't runnable |

## 背景与目标

之前的 site 文档由 agent 扫描 repo 后直接撰写，产生了大量裸简称命令（"deck link"、"arena single"、"curator scan"），这些不是可直接执行的 shell 命令。Naive agent 或新用户读到 "Run `deck link`" 会尝试运行字面命令然后失败。

根本原因：agent 扫 repo 时看到 AGENTS.md 和 SKILL.md 中的简称（在项目内部语境中是合法的），但没有意识到 site 面向外部用户，需要完整可执行命令。

目标：
1. AGENTS.md 建立 "Command Shorthand Convention" — 明确简称→实跑命令的映射规则，区分两类用户
2. Site 全站代码块中的命令必须是可直接执行的（`bunx` 或 `bun packages/...`）
3. 正文中首次引用命令时用完整形式，后续可接受简称

## 需求详情

### Phase 1 — AGENTS.md: 建立简称规范

- [ ] 在 AGENTS.md 中新增 "Command Shorthand Convention" 小节
- [ ] 定义两类用户的命令解析规则：
  - **In-repo dev**: `deck link` → `bun packages/lythoskill-deck/src/cli.ts link`
  - **External user**: `deck link` → `bunx @lythos/skill-deck@latest link`
- [ ] 列出所有内部简称及其完整形式（deck link/add/remove/refresh/validate, arena single/vs, curator scan/add/query, cortex task/epic/adr/probe/index）

### Phase 2 — Site: 修正代码块和首次引用

- [ ] `site/index.md` + `site/zh/index.md`:
  - Quick-start TOML 示例后紧跟的命令必须可执行
  - 正文中首次 "deck link" → "`bunx @lythos/skill-deck link`"
  - 表格中的命令缩写替换或加注释
- [ ] `site/guide/index.md` + `site/zh/guide/index.md`:
  - 所有 code block 中的命令必须可执行
  - "Run `deck link`" → "Run `bunx @lythos/skill-deck link`"
  - `curator scan` → `bunx @lythos/curator scan`
  - `arena single --deck ...` → `bunx @lythos/skill-arena single --deck ...`
  - `arena vs --config ...` → `bunx @lythos/skill-arena vs --config ...`
- [ ] `site/architecture.md` + `site/zh/architecture.md`:
  - 表格中作为概念引用的简称可以保留（"`deck link` reconciles..."）
  - 但代码块中的示例命令必须是完整形式
  - 首次概念引用时加括号注释: "`deck link` (via `bunx @lythos/skill-deck link`)"
- [ ] `site/ecosystem.md` + `site/zh/ecosystem.md`: 同上
- [ ] `site/philosophy.md` + `site/zh/philosophy.md`: 同上

### Phase 3 — 验证

- [ ] EN + ZH 站点页面同步修正
- [ ] Site 代码块中所有命令 grep 确认：引用 `bunx @lythos/` 或 `bun packages/` 或 `npx`，不存在裸命令
- [ ] `cortex probe` 通过

## 技术方案

### 简称映射表

| 简称 | In-repo (dev) | External (user via npm) |
|------|--------------|------------------------|
| `deck link` | `bun packages/lythoskill-deck/src/cli.ts link` | `bunx @lythos/skill-deck@latest link` |
| `deck add` | `bun packages/lythoskill-deck/src/cli.ts add` | `bunx @lythos/skill-deck@latest add` |
| `deck remove` | `bun packages/lythoskill-deck/src/cli.ts remove` | `bunx @lythos/skill-deck@latest remove` |
| `deck validate` | `bun packages/lythoskill-deck/src/cli.ts validate` | `bunx @lythos/skill-deck@latest validate` |
| `deck refresh` | `bun packages/lythoskill-deck/src/cli.ts refresh` | `bunx @lythos/skill-deck@latest refresh` |
| `arena single` | `bun packages/lythoskill-arena/src/cli.ts single` | `bunx @lythos/skill-arena@latest single` |
| `arena vs` | `bun packages/lythoskill-arena/src/cli.ts vs` | `bunx @lythos/skill-arena@latest vs` |
| `curator scan` | `bun packages/lythoskill-curator/src/cli.ts scan` | `bunx @lythos/curator@latest scan` |
| `curator add` | `bun packages/lythoskill-curator/src/cli.ts add` | `bunx @lythos/curator@latest add` |
| `curator query` | `bun packages/lythoskill-curator/src/cli.ts query` | `bunx @lythos/curator@latest query` |
| `cortex task` | `bun packages/lythoskill-project-cortex/src/cli.ts task` | `bunx @lythos/project-cortex@latest task` |
| `cortex adr` | `bun packages/lythoskill-project-cortex/src/cli.ts adr` | `bunx @lythos/project-cortex@latest adr` |
| `cortex probe` | `bun packages/lythoskill-project-cortex/src/cli.ts probe` | `bunx @lythos/project-cortex@latest probe` |

### 规则

1. **Code block (```) 中的命令必须可直接执行** — 用 `bunx` 形式（site 面向外部用户）
2. **正文首次出现**: 完整形式，后续可接受简称
3. **表格中的概念引用**: 可以保留简称，但表头或表前需有映射说明
4. **AGENTS.md 内部**: 可以继续用简称（读者是 agent，有上下文），但必须有一个集中段落声明映射

## 验收标准

- [ ] AGENTS.md 有 "Command Shorthand Convention" 小节，包含完整映射表
- [ ] Site 全站 EN+ZH 代码块中的命令都是可执行的
- [ ] 每个 .md 首次出现简称时有完整形式
- [ ] `grep -rn '`\(deck\|arena\|curator\|cortex\) ' site/` 在代码块中返回 0（裸命令不出现在 code block 中）
- [ ] `cortex probe` 通过

## 进度记录

## 关联文件
- 修改: `AGENTS.md`, `site/index.md`, `site/zh/index.md`, `site/guide/index.md`, `site/zh/guide/index.md`, `site/architecture.md`, `site/zh/architecture.md`, `site/ecosystem.md`, `site/zh/ecosystem.md`, `site/philosophy.md`, `site/zh/philosophy.md`
- 新增: (无)

## Git 提交信息建议
```
fix(site): replace bare command shorthands with runnable bunx commands (TASK-20260528114758563)

- Add Command Shorthand Convention to AGENTS.md with full mapping table
- Site EN+ZH: all code blocks use bunx form for copy-paste
- First occurrence in prose uses full command; shorthand acceptable after
```

## 备注

Refs: EPIC-20260527212032856 (site narrative stabilization)
Blocked by: None
Blocks: None
Root cause: prior agents scanned repo but didn't distinguish in-repo conventions from external-facing docs
