# ADR-20260501092809000: skills branch preserves `skills/` directory prefix to avoid dual locator standards

## Status History

| Status | Date | Note |
|--------|------|------|
| accepted | 2026-05-01 | Approved — skills branch now mirrors main's `skills/` structure |

## 背景

lythoskill 维护两个分支：

- `main`：完整 monorepo，包含 `packages/`（开发源码）、`skills/`（build 产物）、`cortex/`（治理文档）等
- `skills`：轻量分支，仅包含 agent 可直接消费的 skill 文件

`skills` 分支通过 `.husky/post-commit` 的 hexo-style deploy 机制同步：在 `main` 分支 commit 时，自动将 `skills/` 和 `README.md` 的内容写入 `skills` 分支。

## 问题：双重标准

旧版同步脚本**剥离了 `skills/` 前缀**：

```bash
# 旧 post-commit（已作废）
target="${f#skills/}"   # ← 剥离 skills/ 前缀
git update-index ... "$target"
```

这导致 `main` 和 `skills` 分支的目录结构不一致：

| 分支 | `lythoskill-deck` 位置 | Deck locator |
|------|------------------------|--------------|
| `main` | `skills/lythoskill-deck/SKILL.md` | `github.com/lythos-labs/lythoskill/skills/lythoskill-deck` |
| `skills`（旧） | `lythoskill-deck/SKILL.md`（root） | `github.com/lythos-labs/lythoskill/lythoskill-deck` |

**后果**：

1. **Locator 歧义**：同一个 skill 在不同分支下需要不同的 `skill-deck.toml` 声明路径
2. **Agent 困惑**：agent 克隆 `skills` 分支后，按照 `main` 分支文档中的 locator 写 `skill-deck.toml`，`deck link` 报 "Skill not found"
3. **文档成本**：所有文档示例必须标注 "如果你 clone 的是 main 分支，用这个路径；如果 clone 的是 skills 分支，用那个路径"
4. **违背单一真相来源**：同一个 repo 有两个互斥的 "正确" 路径

## 决策驱动

1. **单一真相来源**：`skill-deck.toml` 中的 locator 应该与分支无关
2. **Agent 零认知负担**：agent 不应该知道分支的存在就能正确使用 skill
3. **文档简洁性**：消除所有 "if clone main branch... if clone skills branch..." 的条件分支
4. **marketplace.json 兼容性**：`.claude-plugin/marketplace.json` 中的 `skills` 数组引用 `./skills/lythoskill-deck`，剥离前缀会导致 skills 分支下路径失效

## 选项

### 方案 A：保持现状（skills 分支剥离 `skills/` 前缀）

**优点**：
- skills 分支更"扁平"，视觉上更轻量
- 直接 `git clone -b skills` 后，skill 就在根目录，少一层 `cd skills/`

**缺点**：
- 双重 locator 标准，文档必须分支化
- agent 用户极易踩坑
- 与 marketplace.json 路径不一致

### 方案 B：skills 分支保留 `skills/` 前缀（Selected）

**优点**：
- `main` 和 `skills` 分支目录结构完全一致
- 同一个 locator 在两个分支下都有效
- 无需分支条件文档
- marketplace.json 在两个分支下都正确

**缺点**：
- skills 分支多一层 `skills/` 目录，视觉上不那么"扁平"
- `git clone -b skills` 后需要 `cd skills/` 才能看到 skill 列表

## 决策

**选择**：方案 B（保留 `skills/` 前缀）。

**原因**：

1. **路径一致性优于视觉扁平**：lythoskill 的核心理念是 "deny-by-default 的显式治理"，目录结构的一致性是治理的基础。为了一层目录的"扁平感"而引入双重标准，得不偿失。

2. **Agent 体验优先**：agent 用户（包括 AI agent 和人类用户）不应该知道分支的存在。他们 clone 任何一个分支，都应该得到相同的 skill 路径。

3. **消除文档漂移**：当 `skills` 分支和 `main` 分支路径一致时，`external-skill-governance-bridge.md` 中不需要 "Branch Path Pitfall" 章节 — 因为 pitfall 已不存在。

## 影响

### 正面

- `skill-deck.toml` 示例不再需要分支条件
- `bunx @lythos/skill-deck add github.com/lythos-labs/lythoskill/skills/lythoskill-deck` 在任意分支下都工作
- `.claude-plugin/marketplace.json` 在两个分支下都正确解析
- 文档中的 "Branch Structure Note" 从 "注意陷阱" 变为 "结构一致"

### 负面

- `git clone -b skills --depth 1` 后，`ls` 看到 `skills/` 而不是直接的 skill 目录
- 旧版 `skills` 分支的扁平结构已不可恢复（已被 force-push 覆盖）

## 实施

`.husky/post-commit` 修改：

```bash
# 旧（剥离前缀）
target="${f#skills/}"
git update-index --add --cacheinfo "$mode,$blob,$target"

# 新（保留前缀）
git update-index --add --cacheinfo "$mode,$blob,$f"
```

## 相关

- ADR-20260423124812645：Build output should live in `skills/` and be committed to Git
- `cortex/wiki/01-patterns/external-skill-governance-bridge.md` — 已更新 "Branch Structure Note"
- `.husky/post-commit` — hexo-style deploy 脚本
