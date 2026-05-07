# TASK-20260507143022480: cold-pool metadata layer: SQLite-backed per-repo HEAD ref + per-skill content hash + cross-deck reference index

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-07 | Created |

## 背景与目标

由 wiki `cortex/wiki/01-patterns/cold-pool-evolutionary-rationale.md` 研究孵化。Cold pool 已具备 URI-based FQ locator + `@lythos/cold-pool` 包骨架，但缺少 metadata 层来回答三个问题：

1. 这个 repo 在当前 cold pool 里是什么版本？(per-repo HEAD ref)
2. 这个 skill 的内容自上次 deck link 以来是否变化？(per-skill content hash)
3. 这个 repo 被哪些 deck 引用着？(cross-deck reference index)

没有 metadata 层，prune 无法安全判断"是否可以删除"(多 deck 共享 cold pool 时)，refresh 无法显示"落后上游多少 commit"。

## Exit Criteria

Metadata DB 能持续记录 cold pool 中所有 repo 的 HEAD ref、所有 skill 的内容 hash、以及跨 deck 的引用关系。`deck add/remove` 自动更新引用索引，`deck validate` 能报告内容漂移，`deck refresh discover` 能显示 behind-count，`deck prune --plan` 能标注"被哪些 deck 引用"。

## Deliverables

| # | Deliverable | Verification |
|---|-------------|--------------|
| 1 | `packages/lythoskill-cold-pool/src/metadata-db.ts` — SQLite DB 管理器(schema init, CRUD, query) | `bun test src/metadata-db.test.ts` 通过 |
| 2 | Schema: `repos` 表(host, owner, repo, head_ref, last_pulled_at) | PRAGMA 验证 + 行插入/查询测试 |
| 3 | Schema: `skills` 表(host, owner, repo, skill_subpath, skill_md_hash, last_seen_at) | 同上 |
| 4 | Schema: `references` 表(skill_locator, deck_path, declared_alias) | 同上 |
| 5 | `ColdPool` 类集成 metadata DB — `coldPool.recordRepoRef(locator, headRef)` / `coldPool.recordSkillHash(locator, hash)` / `coldPool.getReferencingDecks(locator)` | 单元测试覆盖 |
| 6 | `deck add` 成功后自动写入 repo HEAD ref + skill content hash 到 metadata DB | agent BDD 验证 |
| 7 | `deck remove` 自动清理 references 表中对应 deck 的引用记录 | agent BDD 验证 |
| 8 | `deck prune --plan` 消费 references 表，输出 `# kept: <path> — referenced by <deck-A>, <deck-B>` 注释 | agent BDD 验证(heredoc-only,不真删) |
| 9 | `deck refresh discover` 消费 repos 表 cached HEAD ref，对比 `git ls-remote` 计算 behind-count | agent BDD 验证 |
| 10 | Wiki 更新 — `cold-pool-unified-facility-design.md` §6 已落地/待 epic 对照表更新 | 人工 review |

## Explicitly Not Delivering

- ❌ Merkle tree / transparent log(Go sumdb 式的跨用户 tamper-evidence)。信任模型保持 local-only(用户是信任根)。
- ❌ 自动 prune 或自动 refresh apply。仍保持 ADR-20260507110332770(prune heredoc-only) + ADR-20260507110332805(refresh discover-then-apply) 政策。
- ❌ Content hash 覆盖整个 skill 目录(dirhash)。本 task 只做到 SKILL.md 的 SHA-256(与现有 `skill-deck.lock` 的 `content_hash` 对齐)。全目录 dirhash 留给后续优化。
- ❌ Cold-pool reconcile 完整实现。本 task 只提供 metadata 基础设施；reconcile 的 desired/actual 对比逻辑是独立 epic。
- ❌ TUI / 可视化界面。纯 CLI + heredoc 输出。

## 技术方案

**核心原则: 不发明新 hash，直接用 git 原生机制。**

- SQLite 文件位置: `~/.agents/skill-repos/.cold-pool-meta.db` (与 curator `catalog.db` 同目录，不同文件)
- 复用 curator 的 `bun:sqlite` 模式，不新增依赖
- `ColdPool` 类持有一个 `MetadataDB` 实例，lazy init

**Hash 策略(git-native):**

| 粒度 | 来源命令 | 含义 |
|------|---------|------|
| Repo 级 | `git -C <repo-dir> rev-parse HEAD` | 当前 commit hash |
| Skill 级(standalone) | 同 repo 级 | standalone repo 只有一个 skill |
| Skill 级(monorepo 子路径) | `git -C <repo-dir> hash-object <skill-subpath>/SKILL.md` | 该 SKILL.md 的 git blob hash(只读，不写入 object store) |
| Skill 级(monorepo 备选) | `git -C <repo-dir> ls-tree HEAD <skill-subpath>` | 子目录 tree hash(包含目录内所有文件) |

**localhost 同样适用**: localhost skill 目录也 `git init`(无 remote 即可)，则上述命令对 localhost 同样生效。`isLocalhost` 只跳过网络操作，不跳过 git hash。

**Schema:**

```sql
CREATE TABLE repos (
  host TEXT, owner TEXT, repo TEXT,
  head_ref TEXT,              -- git rev-parse HEAD
  last_pulled_at TEXT,
  PRIMARY KEY (host, owner, repo)
);

CREATE TABLE skills (
  host TEXT, owner TEXT, repo TEXT, skill_subpath TEXT,
  content_git_hash TEXT,      -- git hash-object SKILL.md (or git ls-tree)
  head_ref_at_record TEXT,    -- 记录时的 repo HEAD(追溯一致性)
  last_seen_at TEXT,
  PRIMARY KEY (host, owner, repo, skill_subpath)
);

CREATE TABLE references (
  skill_locator TEXT,
  deck_path TEXT,
  declared_alias TEXT,
  PRIMARY KEY (skill_locator, deck_path)
);
```

**references 表更新时机:** `deck add`(insert)、`deck remove`(delete by deck_path)、`deck link`(全量 reconcile — 扫描 deck.toml 重刷 references)

**与 skill-deck.lock 的关系**: `skill-deck.lock` 的 `content_hash` 字段从"SHA-256 of SKILL.md"改为"git blob hash of SKILL.md"。这是 0.10.0 breaking change 的一部分，与 metadata DB 对齐。

## 参考资源

- `cortex/wiki/01-patterns/cold-pool-evolutionary-rationale.md` — 本 task 的 rationale 来源
- `cortex/adr/02-accepted/ADR-20260507021957847-*.md` — cold-pool 包决策
- `~/.claude/projects/.../memory/project_cold_pool_metadata_layer_research.md` — Go sumdb / Maven SHA1 调研笔记
- `packages/lythoskill-deck/src/prune-plan.ts:113-132` — 现有 multi-deck 不安全 prune 的代码注释
- `packages/lythoskill-cold-pool/src/cold-pool.ts` — ColdPool 类现有接口

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260507143022480)

- Detail 1
- Detail 2
```

## 备注
