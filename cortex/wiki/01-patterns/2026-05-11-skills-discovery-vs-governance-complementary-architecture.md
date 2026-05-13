---
created: 2026-05-11
updated: 2026-05-13
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
   command-line install (-g opt-in)      per-project working set
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

**skills.sh discovers; lythoskill governs** — but "governs" here means *declarative* governance,
not that skills.sh lacks governance entirely.

skills.sh *can* install to a specific project (`npx skills add -g ./my-project owner/repo`).
It is **command-line governance**: run a bash script, the skill is there. The mental model is
imperative — you *do* something to change state. This works well for solo exploration and
quick experiments.

lythoskill is **declarative governance**: you write what you want in `skill-deck.toml`, then
`deck link` reconciles reality to match the declaration. The mental model is state-driven —
like `pom.xml` or `package.json`. This works well for team collaboration, CI reproducibility,
and deny-by-default isolation (only declared skills are visible; everything else is excluded).

| Dimension | skills.sh (`npx skills add`) | lythoskill (`skill-deck.toml`) |
|---|---|---|
| Mental model | Imperative — "run this command" | Declarative — "declare desired state" |
| Sharing intent | Re-run the script (or share the command) | Share the file (git-tracked, diffable) |
| Per-project isolation | `-g` flag (opt-in per invocation) | Deny-by-default (all undeclared excluded) |
| Lock/reconcile | Manual — re-run scripts when env changes | Automatic — `deck link` reconciles drift |
| Team sync | Bash scripts, README instructions | Single `skill-deck.toml` + `deck.lock` |
| Rollback | Re-run previous commands | `git revert` on deck.toml, re-link |

**skills.sh has its own closed loop**: discovery → install → run. It is a complete toolchain
that works standalone. Users can `npx skills find`, `npx skills add`, and use the skill without
ever touching lythoskill.

**lythoskill chooses to interop with skills.sh** — not because skills.sh is incomplete, but
because openness is a design value. A user who discovers a skill on skills.sh should be able
to bring it into lythoskill's declarative workflow without friction. `deck add owner/repo`
accepts skills.sh shorthand precisely to honor that user's existing context.

**Together**: skills.sh (or any skill hub) runs its own full pipeline; lythoskill offers an
alternative governance layer that some teams prefer for declarative, reproducible, team-scoped
skill management. They coexist — skills.sh for quick discovery and imperative install,
lythoskill for declarative working-set contracts.

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
