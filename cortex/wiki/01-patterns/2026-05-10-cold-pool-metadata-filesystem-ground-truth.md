---
created: 2026-05-10
updated: 2026-05-10
category: pattern
---

# Cold Pool Metadata — Filesystem as Ground Truth, DB as Cache

> Pattern: filesystem is the authoritative source; metadata.db is a lossy accelerator that can always be rebuilt from `findSkillDirectories()` + `scanSkill()`.

## The Principle

```
findSkillDirectories()          ← 纯 readdirSync，只认 SKILL.md 存在性
        ↓
scanSkill()                     ← 纯 readFileSync + YAML.parse + SHA-256
        ↓
catalog.db / REGISTRY.json      ← 加速索引，可随时重建
```

两者都不依赖 git。目录怎么来的（`git clone` / `cp -r` / `ln -s` / 手写）完全透明 — 文件系统是唯一 ground truth。

## 三层 metadata 的"可重建性"

`~/.agents/skill-repos/.cold-pool-meta.db` 三张表：

| 表 | 内容 | 可否从 FS 重建 | 当前状态 |
|---|---|---|---|
| `repos` | (host, owner, repo, head_ref, last_pulled_at) | ✅ `git ls-remote` + fs 路径推断 | 空（schema 已建，未灌入） |
| `skills` | (host, owner, repo, subpath, content_sha256, git_blob_hash, head_ref_at_record, last_seen_at) | ✅ `find+scan` + `git hash-object` | 空（schema 已建，未灌入） |
| `deck_refs` | (skill_locator, deck_path, declared_alias, state, mode) | ❌ 跨仓库关系，不可从 FS 推断 | ✅ 14 条，正常 |

`repos`/`skills` 是锦上添花 — 提供 HEAD 版本追踪和 Git blob hash，但不阻塞核心发现管线。删掉 `.cold-pool-meta.db` 不影响 `curator scan` 产出正确索引。

`deck_refs` 是唯一不可重建的表 — 记录"哪个项目的 `skill-deck.toml` 引用了哪个技能"，这种跨仓库关联无法从单边文件系统推断。

## 类比

和 Maven `~/.m2/repository` 同构：

| Maven | Lythoskill |
|---|---|
| `~/.m2/repository/` (jar/pom 文件) | `~/.agents/skill-repos/` (SKILL.md 文件) |
| `mvn install` 把 jar 写进本地缓存 | `curator add` 把 repo clone 进 cold pool |
| 本地缓存可删掉重建 (`mvn dependency:resolve`) | metadata 可删掉重建 (`curator scan`) |
| `~/.m2/repository/` 不依赖 git | cold pool 不依赖 git |

## 为什么这对 agent 友好

Agent 裸操作（手写 SKILL.md、`cp -r` 搬目录、删除目录）后，curator 不需要任何"注册"步骤 — 下次 `scan` 自动收敛到真实状态。这是 reconciler 模式的基础：**any state → scan → converges to clean index**。

## Skill 工作模式鉴定：CLI-first vs Agent-scan

curator 的 L3（买家秀）层需要记录每个 skill 的实际工作模式，而非仅信任 description (L1) 或索引 (L2)。不改 skill 本身，维护平行评价。

### 鉴定维度

| 维度 | 含义 | 典型值 |
|---|---|---|
| `pattern` | 核心工作模式 | `cli-first` / `agent-scan` / `hybrid` |
| `scope` | 默认扫描范围 | `diff` / `full` / `workflow-only` / `sampled` |
| `token_efficiency` | Token 消耗特征 | `low` (只读 report) / `medium` (读变更文件) / `high` (全扫) |
| `relevance` | 对当前项目的适用性 | `ts-project` / `solidity-only` / `universal` |

### CLI-first (理想模式)

Agent 只编排 CLI 工具，不直接读代码。CLI 产出 JSON/SARIF → agent 解析 report → 精准打开文件:行号。

```
codeql database analyze → SARIF → agent 读 report → target 具体文件
semgrep scan → JSON → agent parse → target
npm audit --json → agent parse → target
```

Token 消耗: O(问题数)，不 O(代码库大小)。

### Agent-scan (需评估)

Agent 直接读文件进行推理。对于业务逻辑、IDOR、跨文件鉴权等"语义层"问题是必需的，但应限定 scope。

```
security-advisor: diff-scope 默认 → 读变更文件 → 推理 ← 可接受
code-maturity: 9 维度采样 → 读代表性文件 → 评分 ← 可接受
全仓库无差别扫描 → 读所有文件 → 报告 ← 应避免
```

### L1 → L2 → L3 信任递进

```
L1 卖家秀: skill 自己的 description          ← "我能做代码审查"
L2 Big V:   curator 索引 (REGISTRY.json)     ← 统一 schema，可查询
L3 买家秀:  实际工作模式鉴定 + arena 验证      ← "CLI-first, diff-scope, 质量高"
```

curator 不修改 skill（保持上游可追溯），但维护 `evaluations` 表存储这些结论。后续 `catalog.db` 扩展：

```sql
CREATE TABLE evaluations (
  skill_path TEXT PRIMARY KEY,
  pattern TEXT,           -- 'cli-first' | 'agent-scan' | 'hybrid'
  scope TEXT,             -- 'diff' | 'full' | 'workflow-only'
  token_efficiency TEXT,  -- 'low' | 'medium' | 'high'
  relevance TEXT,         -- 'ts-project' | 'solidity-only' | ...
  notes TEXT,
  evaluated_at TEXT,
  arena_run_id TEXT
);
```

### 实测案例 (2026-05-10)

7 个 QA skill 的鉴定结果：

| 技能 | pattern | scope | token | 评价 |
|---|---|---|---|---|
| codeql | cli-first | full (via CLI) | low | ✅ 纯 CLI 编排 |
| semgrep | cli-first | full (via CLI + subagent) | low | ✅ CLI + subagent 并行 |
| security-advisor | hybrid | diff (default) | medium | ✅ delegate to `npm audit`/`gitleaks` |
| agentic-actions-auditor | cli-first | workflow-only | low | ✅ 只扫 `.yml` 文件 |
| differential-review | agent-scan | diff | medium | ✅ scoped to diff + 1-hop |
| code-maturity-assessor | agent-scan | sampled | medium | ✅ 9 维度采样，非全扫 |
| entry-point-analyzer | cli-first | contract files | low | ❌ Solidity only, skip |

## 相关

- [Cold Pool Architecture — Deck Decoupling with FSM Reference Counting](./2026-05-09-cold-pool-architecture-deck-decoupling-with-fsm-reference-counting.md)
- [Cold Pool Unified Facility Design](./2026-05-07-cold-pool-unified-facility-design.md)
- ADR-20260509170343037 — DB data fingerprint proposal

---

> **Cold pool family**: 6 related pattern files. See index at [cold-pool-cli-boundary](./2026-05-07-cold-pool-cli-boundary.md) for full cross-reference list.
