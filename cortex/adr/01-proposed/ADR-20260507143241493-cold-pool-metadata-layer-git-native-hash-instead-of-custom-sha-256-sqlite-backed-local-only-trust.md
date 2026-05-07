# ADR-20260507143241493: cold-pool metadata layer: git-native hash instead of custom SHA-256, SQLite-backed, local-only trust

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-07 | Created |

## 背景

Cold pool 已具备 URI-based FQ locator 与 `@lythos/cold-pool` 包骨架，但缺少 metadata 层。当前状态：

1. `skill-deck.lock` 使用 SHA-256 of SKILL.md 作为 `content_hash` — 与 git 生态割裂，localhost 需额外实现
2. `deck prune --plan` 无法安全判断多 deck 共享场景 — 无 cross-deck 引用记录
3. `deck refresh` 无法显示 behind-count — 无 per-repo HEAD ref 缓存
4. 调研 Go sumdb / Maven SHA1 后，需决定哪些机制采纳、哪些拒绝

Wiki `cold-pool-evolutionary-rationale.md` 与 memory `project_cold_pool_metadata_layer_research.md` 已完成前期调研。

## 决策驱动

1. **不发明新 hash**：既然 cold pool 全是 git repo，自建 SHA-256 是重复造轮子
2. **localhost 不特殊**：localhost skill 也能 `git init`，hash 机制应统一
3. **分层粒度不混淆**：repo 级用 `git rev-parse HEAD`，skill 级用 `git hash-object SKILL.md`
4. **local-only trust**：per-user 场景，用户是信任根，Merkle tree 过重
5. **SQLite 优于 JSON**：原子事务 + JOIN，curator 已验证 `catalog.db` 模式

## 选项

### 方案 A：自建 SHA-256 + JSON sidecar — Rejected
- `content_hash` 继续用独立 SHA-256 算法
- Metadata 存 JSON 文件(如 `.cold-pool-meta.json`)

**优点**:
- 不依赖 git(纯文件系统操作)
- 与现有 `skill-deck.lock` 的 `content_hash` 字段兼容

**缺点**:
- 与 git 生态割裂：git 已经有内容寻址，再算一套 SHA-256 是冗余
- localhost 需单独实现 hash 逻辑(无 git 的 bare 目录无法复用)
- JSON 无事务：并发 `deck add/remove` 可能损坏文件
- 无 JOIN：cross-deck 引用查询需手动聚合

### 方案 B：Git-native hash + SQLite + local-only trust — Selected
- Repo 级：`git rev-parse HEAD`
- Skill 级：`git hash-object SKILL.md`(或 `git ls-tree HEAD <skill-path>`)
- Storage：SQLite `~/.agents/skill-repos/.cold-pool-meta.db`
- Trust：用户本地信任，无 Merkle tree

**优点**:
- 零新算法：git 的 blob/tree hash 就是内容指纹
- localhost 统一：localhost skill `git init` 后即可使用相同机制
- SQLite 事务：`deck add` + 写 metadata 原子完成
- JOIN 查询：`SELECT ... FROM skills JOIN references WHERE deck_path = ?`
- 与 git 工具链互通：`git cat-file -p <hash>` 可直接查看内容

**缺点**:
- 0.10.0 breaking change：`skill-deck.lock` 的 `content_hash` 从 SHA-256 改为 git blob hash
- 要求 cold pool 中的 repo 必须是 git repo(deck add 的本来就是；localhost 需 `git init`)
- Git SHA-1 的碰撞风险(但 git 社区已广泛接受，且 git 2.29+ 可选 SHA-256)

## 决策

**选择**: 方案 B — Git-native hash + SQLite + local-only trust

**原因**:
1. Lythoskill 的设计原则之一是"defer every layer to mature infra" — git 的内容寻址就是成熟 infra
2. "FQ locator 其实是 path"的同一精神：不发明新 identity，用已有的 web/git 原生机制
3. SQLite 已在 curator 中验证，团队熟悉，无新依赖
4. Merkle tree / transparent log(Go sumdb)对 per-user 场景是 over-engineering

## 影响

### 正面
- `skill-deck.lock` 与 metadata DB 的 hash 格式统一(git blob hash)
- `deck validate` 可检测"SKILL.md 改了但还没 commit"(工作区 hash ≠ HEAD hash)
- `deck refresh discover` 有 cached HEAD ref 对比上游
- `deck prune --plan` 能标注 `# kept by deck-X`
- localhost 不再特殊：统一走 git hash

### 负面
- `skill-deck.lock` 格式 breaking change(0.10.0 窗口内)
- 旧 cold pool 中未 git-init 的 localhost skill 需补 `git init`
- Git blob hash 与外部系统(如 CI artifact hash)不互通(但这不是我们的问题域)

### 后续
1. 实施 `TASK-20260507143022480` — cold-pool metadata layer
2. `skill-deck.lock` 迁移：`content_hash` 字段改名 `content_git_hash`，值从 SHA-256 切 git blob hash
3. 0.10.0 release 统一 landing

## 相关
- 关联 ADR:
- 关联 Epic:
