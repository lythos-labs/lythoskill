---
created: 2026-05-11
updated: 2026-05-11
category: pattern
---

# Skills Discovery vs Governance — Complementary Architecture

> Pattern: skills.sh (Vercel) handles "what exists" — lythoskill handles "what to use + how to isolate."

## The Two Layers

```
skills.sh / agent-skills hubs          lythoskill
─────────────────────────────          ──────────
   discovery (有什么?)                    governance (用什么 + 怎么隔离)
   trending / leaderboards               deny-by-default
   "npx skills add <repo>"               skill-deck.toml (declarative)
   universal .agents/skills/             per-project working set
   cross-agent compatible                lock + reconcile + restore
   security verification (Snyk/Gen)      arena test-before-adopt
```

They're not competitors — they're complementary layers in the same pipeline.

## The Full Pipeline

```
1. skills.sh / web search          → 发现候选技能
2. curator add <github.com/...>    → 下载到冷池 (本地缓存, 不污染工作集)
3. curator scan + query             → 索引, 按 niche/type 筛选
4. arena single --deck test-deck   → 测试效果 (隔离环境, 不碰主 deck)
5. deck add <locator>              → 声明到项目 (deny-by-default)
6. deck link                        → 同步工作集
```

每层各司其职:

| 层 | 工具 | 问的问题 |
|---|---|---|
| L0 发现 | skills.sh / web search | "外面有什么?" |
| L1 入库 | curator add + scan | "冷池里有什么?" |
| L2 评估 | arena single | "这个好用吗?" |
| L3 治理 | deck add + link | "我的项目用什么?" |

## Why This Separation Matters

**skills.sh can't govern**: it installs everything into a shared directory. No per-project isolation,
no deny-by-default, no lock file reconciliation across teams.

**lythoskill can't discover**: it indexes what's already in the cold pool. No trending, no
leaderboards, no community ratings.

**Together**: skills.sh (or any skill hub) finds candidates → lythoskill governs adoption.

## Concrete Example

```
# 1. 发现
web-search "claude code security audit skill" → finds trailofbits/skills

# 2. 入库
curator add github.com/trailofbits/skills

# 3. 索引
curator scan
curator query "SELECT name, type FROM skills WHERE source LIKE '%trailofbits%'"

# 4. 测试
arena single --deck examples/decks/qa-sweep.toml --brief "audit cold-pool package"

# 5. 采用
deck add github.com/trailofbits/skills/plugins/static-analysis/skills/semgrep --alias semgrep

# 6. 治理
deck link  # deny-by-default: only semgrep visible, not the other 72 trailofbits skills
```

## Related

- [Side Deck Pattern](./2026-05-10-side-deck-pattern-specialized-task-decks-for-arena-single.md)
- [Cold Pool Metadata — Filesystem as Ground Truth](./2026-05-10-cold-pool-metadata-filesystem-ground-truth.md)
