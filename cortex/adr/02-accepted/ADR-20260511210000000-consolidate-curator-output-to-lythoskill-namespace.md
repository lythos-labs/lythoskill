# ADR-20260511210000000: Consolidate curator output to `~/.agents/lythoskill/curator/`

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-11 | Created — resolve vacillation from ADR-20260424000744041 |
| accepted | 2026-05-17 | Accepted |

## 背景

ADR-20260424000744041 确立了 curator 产出是"个人环境扫描，不是项目 artifact"的原则，但在具体落地上自相矛盾：

- **第 24 行**：期望放在 `~/.agents/lythos/skill-curator/`（冷池同层级）
- **第 114-121 行**：推荐方案 B — `{pool}/.lythoskill-curator/`（冷池内部）
- **第 129-131 行**：将 B-alt (`~/.agents/lythos/skill-curator/`) 标记为"已放弃"
- **第 143 行**：决策 = 方案 B（冷池内部）
- **第 172 行**：后续影响又写回 B-alt 路径

结果是代码实现和文档之间存在摇摆：CLI 默认输出 `{pool}/.lythoskill-curator/`，SKILL.md 示例却用的是 `~/.agents/lythos/skill-curator/`。今天 arena 对齐到 `~/.agents/lythoskill/arena/` 后，这个不一致变得更加显眼。

## 核心问题

两个 pattern 在打架：

| | Pattern A: 冷池内部 | Pattern B: 独立命名空间 |
|---|---|---|
| 路径 | `~/.agents/skill-repos/.lythoskill-curator/` | `~/.agents/lythoskill/curator/` |
| 类比 | `.git/` — 元数据跟着数据 | `~/.m2/repository` vs `~/.m2/settings.xml` |
| 优点 | 多冷池隔离，自包含 | 个人配置集中，冷池无关 |
| 缺点 | 被 `git clean` 误删，冷池删则索引丢 | 多冷池时需 `--output` 区分 |

## 决策驱动

**curator 产出不是冷池的操作元数据。** `.cold-pool-meta.db` 是（跟踪 HEAD ref、content hash、deck ref FSM）——它放在冷池内部是正确的，因为它的生命周期与 clone 绑定。

但 curator 的 REGISTRY.json + catalog.db + additions.jsonl 是**对冷池的派生视图**——是一个 agent 可读的索引。它们的生命周期独立于冷池：
- 冷池可以删除重建，索引应该存活（重新 scan 即可，不需要重新 `curator add`）
- 索引是 agent 推理的输入，不是 git 操作的操作状态
- `additions.jsonl` 是决策日志，记录你*为什么*添加某个 skill——比冷池本身更持久

**counter-argument 重新评估**：ADR-20260424000744041 放弃 B-alt 的理由是"多个冷池的索引混在一起"。但：
- 绝大多数用户只有一个冷池（`~/.agents/skill-repos/`）
- 多冷池场景可以通过 `--output` flag 显式隔离
- 把默认路径优化给单冷池场景（99% case）是正确的取舍
- 即使多冷池，`curator scan <poolA> --output ~/.agents/lythoskill/curator-poolA/` 也能区分

## 决策

**选择**：Pattern B — 所有 curator 产出统一放在 `~/.agents/lythoskill/curator/`

### 目录结构

```
~/.agents/
├── skill-repos/                          ← Cold pool (shared skill data)
│   └── .cold-pool-meta.db                ← Cold pool operational metadata (stays here)
└── lythoskill/                           ← Lythoskill personal config namespace
    ├── curator/                          ← Curator output (NEW: consolidated)
    │   ├── REGISTRY.json                 ← Skill index
    │   ├── catalog.db                    ← SQLite queryable index
    │   └── additions.jsonl               ← Decision log (moved from cold pool)
    └── arena/
        └── players.json                  ← Player auto-detection config
```

### 关键区分

| 文件 | 是什么 | 放哪里 | 为什么 |
|------|--------|--------|--------|
| `.cold-pool-meta.db` | Cold pool 操作元数据（HEAD ref, hash, deck ref FSM） | `{pool}/.cold-pool-meta.db` | 生命周期与 clone 绑定 |
| `REGISTRY.json` | Curator 索引（所有 skill 的 frontmatter 快照） | `~/.agents/lythoskill/curator/` | 派生视图，agent 消费 |
| `catalog.db` | Curator SQLite 索引（可查询） | `~/.agents/lythoskill/curator/` | 同上 |
| `additions.jsonl` | Curator 决策日志（谁添加了什么、为什么） | `~/.agents/lythoskill/curator/` | 决策记录，比冷池持久 |

### 迁移路径

1. **CLI 默认 `--output`**：从 `{pool}/.lythoskill-curator/` 改为 `~/.agents/lythoskill/curator/`
2. **backward compat**：保持 `{pool}/.lythoskill-curator/` 和 `~/.agents/lythos/skill-curator/` 为 fallback 查询路径（带 `legacy` 注释），不做自动迁移
3. **`additions.jsonl`**：从 `{pool}/.lythoskill-curator/additions.jsonl` 迁移到 `~/.agents/lythoskill/curator/additions.jsonl`，旧路径作为 fallback 读取
4. **SKILL.md**：统一所有示例使用 `~/.agents/lythoskill/curator/`
5. **deck_managed_dirs**：curator SKILL.md 已更新为 `~/.agents/lythoskill/curator/`

## 影响

- 正面:
  - curator、arena、cold-pool 三个子系统的路径约定统一在 `~/.agents/` 下
  - 消除 ADR-20260424000744041 内部的自我矛盾
  - 冷池变成纯数据目录，不再包含任何 lythoskill 工具链的衍生文件
  - `rm -rf ~/.agents/skill-repos/` 不再丢失 curator 决策记录
- 负面:
  - 已有用户的 `{pool}/.lythoskill-curator/` 数据不会被自动迁移（但 fallback 读取确保不丢数据）
  - 多冷池用户需要显式使用 `--output`（边缘场景，且当前也没有自动隔离）
- 后续:
  - CLI 代码将 `~/.agents/lythoskill/curator/` 设为首选路径
  - ADR-20260424000744041 标记为 superseded（核心原则"个人环境扫描"保留，但落地路径被本 ADR 覆盖）

## 相关

- Supersedes: ADR-20260424000744041（落地路径部分；"个人环境扫描"原则保留）
- 关联: arena `~/.agents/lythoskill/arena/players.json` 对齐（同日）
- 关联: cold pool metadata `.cold-pool-meta.db` 保持在冷池内部（本 ADR 确认此设计）
