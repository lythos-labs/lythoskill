# ADR-20260509170343037: Cold-pool metadata DB data fingerprint for integrity verification

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-09 | Created |

## 背景

Metadata DB（`.cold-pool-meta.db` v3–6）已有 schema version 跟踪表结构，
但**数据层没有任何完整性校验**。可能出现的隐患：

1. **文件损坏/部分写入**：进程 crash 或文件系统故障导致 DB 内容不一致
2. **DB 被 swap**：用户恢复备份或同步到不同机器时，`.cold-pool-meta.db`
   跟 `.agents/skill-repos/` 文件系统不匹配（老 DB 配新冷池）
3. **版本错位**：新 code 升级了 CURRENT_SCHEMA 但迁移失败或被跳过，
   `_schema_version` 表正确但实际数据不对应新版本语义
4. **跨冷池复制**：开发者把 A 机器的 meta.db 复制到 B 机器，但数据不同

## 决策驱动

- 希望用低成本的"软检测"而不是强约束
- 不影响性能关键路径（`getAllActiveLocators` 是 prune 时才调用，不频繁）
- 检测出问题时应该怎么做要清晰（不 panic，建议重建）
- schema version 只保证表结构，不保证数据完整性——这是不同层面的校验

## 选项

### 方案 A：写入时附加 fingerprint，读取时校验（选中）

每次 `reconcileDeckReferences`（关键写入点）之后计算并存储 fingerprint：

```
fingerprint = SHA256(
  sort(active_locators) + CURRENT_SCHEMA + ref_count + last_updated_at
)
```

存到 `skill_hashes` 表（已有）或新增 `_meta_fingerprint` 表。

读取前可选校验（如 `getAllActiveLocators` → 校验 → warning）。

**优点**：
- 低成本、无外部依赖（bun 内置 crypto）
- 检测到不一致时可以精确提示"DB 与冷池不匹配，建议 deck link 重建"
- fingerprint 列可以索引，不破坏现有查询

**缺点**：
- 需要决定哪些字段参与 hash 范围
- 如果每次读之前都校验，高频读取（比如 deck link 内部的 metadata 读写）
  有性能影响——需要做"写后校验、读时跳过或惰性校验"
- 多进程同时写 meta.db 时 fingerprint 需要最终一致性处理
  （当前实际单进程无此问题）

### 方案 B：不做 fingerprint，依靠 filesystem 同步

不引入 hash 校验，信任文件系统和 SQLite 自身的 WAL/原子写入。

**优点**：
- 零改动
- SQLite 的 WAL 模式已经处理了部分写入失败（自动回滚）

**缺点**：
- SQLite 不解决"DB 版本不对应冷池"的问题
- 用户 swap meta.db 后不会收到任何提示

### 方案 C：外部 checksum 文件

在 `.cold-pool-meta.db` 旁边放一个 `.cold-pool-meta.db.sha256`，
shell 友好，用户可以用 `sha256sum` 手动验证。

**优点**：
- shell 可验证，不依赖 code
- 不污染 SQLite schema

**缺点**：
- 外部文件和 DB 之间的一致性需要两层维护
- 无法在 code 读取时自动校验（需要额外 IO）
- 多一个文件需要同步/备份

## 决策

**选择**: 方案 A（写入时 fingerprint，惰性校验）

**原因**:
- 写入点明确（`reconcileDeckReferences` 是关键事件），校验成本集中在写入端
- 读取端做惰性校验（首次读取或定期校验），不影响高频路径
- 提示信息可比 SQLite 默认错误更友好（"run deck link to rebuild"）
- 当前为 single-process 模型，无并发写入冲突

**未实施，仅记录决策草案**。等 cold-pool CLI 和使用场景稳定后再落地。

## 影响

- **正面**：
  - 多一层数据完整性保障
  - 检测 swap/损坏/版本错位，可给出精确修复指引
  - 低侵入（写入点 1 处 + 校验方法 1 个 + 读前可选校验）
- **负面**：
  - 需要决定 hash 字段范围（只 hash locator list，还是包含 mode/timestamps？）
  - 惰性校验可能在损坏后第一次读取时才发现（不是即时发现）
- **后续**：
  - schema v7 可以加 `_meta_fingerprint` 表或 `_data_fingerprint` 列到 `repos` 表
  - fingerprint 校验结果可以纳入 `cold-pool validate --lock` 的输出

## 相关

- 关联 ADR: ADR-20260507143241493（metadata layer SQLite design）
- 关联 wiki: `cortex/wiki/01-patterns/2026-05-09-cold-pool-architecture-deck-decoupling-with-fsm-reference-counting.md`
- 关联 ADR: ADR-20260509144134332（deck_refs FSM）
