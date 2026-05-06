# Cold Pool Unified Facility — Design Draft

> 综合 session 讨论的设计案，覆盖 deck path 深水区、cache 管理、agent-friendly error、版本锁定。
> Date: 2026-05-07
> Related: EPIC-20260507012858669, TASK-20260507011711797, ADR-20260507014124191

---

## 1. 问题域（深水区汇总）

| # | 深水区 | 根因 | 当前症状 |
|---|--------|------|----------|
| 1 | **Path 反直觉** | 隐式 `skills/` 插入 + repo 边界不可见 | `skills/skills/skills`、agent 猜路径 |
| 2 | **多包重复逻辑** | deck / curator / arena 各自解析 locator | 改 deck 坏 curator，打地鼠 |
| 3 | **未 clone 无法验证** | 只有本地文件系统检查，无远程预检 | `deck add` 盲目 clone，失败才报错 |
| 4 | **Agent CPTSD** | 错误信息是字符串，agent 无法自主修复 | "Skill not found" → agent 恐慌 |
| 5 | **无版本锁定** | `skill-deck.lock` 只有 content_hash，无 git ref | 上游结构变了，本地无法回退 |
| 6 | **Cache 无管理** | cold pool 是裸目录，无索引、无失效策略 | stale/orphan/diverged 无自动处理 |
| 7 | **预组卡组脆弱** | quick start 的 example decks 未经验证 | 新用户第一次用就失败 |

---

## 2. 架构分层（5 层）

```
┌─ E2E Validation Layer ───────────────────────┐
│  真实 repo 兼容性矩阵（定期扫描高星仓库）      │
│  Pre-built deck 冒烟测试                     │
├─ Error / Plan Layer ─────────────────────────┤
│  ValidationReport（结构化诊断，纯数据）        │
│  Dry-run = 打印 Plan，不执行                  │
├─ Resolver Layer (SSOT) ──────────────────────┤
│  Locator 解析、远程存在性验证、结构推断        │
├─ ColdPoolManager (Cache Layer) ──────────────┤
│  缓存生命周期：get / fetch / refresh / prune  │
├─ Curator Index Layer ────────────────────────┤
│  SQLite catalog.db（元数据 + cache 状态索引）  │
└─ Git Storage ────────────────────────────────┘
   ~/.agents/skill-repos/（实际 repo 文件）
```

---

## 3. Resolver Layer（SSOT）

### 3.1 职责
- 唯一解析入口：所有包通过 resolver 处理 locator
- 远程预检：GitHub API 验证 repo 存在性、Tree API 扫描结构
- 结构推断：对未指定 skillPath 的 repo，推断可能的 skill 位置

### 3.2 接口

```typescript
// 解析 locator → 结构化数据
export function parseLocator(locator: string): ParsedLocator

// 远程验证（不需要本地 clone）
export async function validateRemote(locator: string): Promise<ValidationReport>

// 扫描 repo 结构，推断 skill 路径
export async function inferSkillPath(repoUrl: string): Promise<InferenceResult>
```

### 3.3 覆盖的深水区
- **#1 Path 反直觉**：resolver 输出精确路径，无隐式插入
- **#2 多包重复逻辑**：一个 `parseLocator`，deck/curator/arena 共用
- **#3 未 clone 无法验证**：`validateRemote` 在 fetch 前调用 GitHub API
- **#7 预组卡组脆弱**：resolver 验证 example deck 中的每个 locator

---

## 4. ColdPoolManager（Cache Layer）

### 4.1 职责
- 缓存生命周期管理：把 cold pool 从"裸目录"提升为"结构化缓存"
- 版本锁定：支持 git ref（branch/tag/commit）
- 一致性维护：stale 检测、orphan 清理

### 4.2 接口

```typescript
export interface ColdPoolManager {
  // 读取缓存（纯读，不触发 IO）
  get(locator: string, ref?: string): CacheEntry | null

  // 填充缓存（clone + checkout ref）
  fetch(locator: string, ref?: string): Promise<CacheEntry>

  // 刷新缓存（git pull/fetch，更新 index）
  refresh(locator: string): Promise<UpdateResult>

  // 失效缓存（删除本地 clone + index 记录）
  invalidate(locator: string): void

  // 垃圾回收（扫描 unreferenced / orphan / diverged）
  prune(): PrunePlan
}
```

### 4.3 Cache Entry

```typescript
export interface CacheEntry {
  locator: string
  localPath: string
  gitRef: string        // HEAD commit hash
  gitRemote: string     // origin URL
  clonedAt: string      // ISO timestamp
  refreshedAt: string   // last pull/fetch
  commitsBehind: number // git rev-list HEAD...origin/main --count
  contentHash: string   // SKILL.md SHA256
}
```

### 4.4 覆盖的深水区
- **#5 无版本锁定**：`gitRef` 字段支持 `skill-deck.lock` 精确锁定
- **#6 Cache 无管理**：`fetch/refresh/invalidate/prune` 统一生命周期
- **#3 未 clone 验证**：`get` 返回 null → 触发 `fetch` → fetch 前 resolver 预检

---

## 5. Curator Index Layer（Metadata + Cache Index）

### 5.1 原则
- **不重建索引**：复用 curator 已有的 SQLite `catalog.db`
- **扩展而非替换**：在现有 `skills` 表上加 cache 字段

### 5.2 Schema 扩展

```sql
-- 现有字段（curator 已提供）
-- path, name, description, type, version, source, ...

-- 新增 cache 管理字段
ALTER TABLE skills ADD COLUMN git_ref TEXT;
ALTER TABLE skills ADD COLUMN git_remote TEXT;
ALTER TABLE skills ADD COLUMN cloned_at TEXT;
ALTER TABLE skills ADD COLUMN refreshed_at TEXT;
ALTER TABLE skills ADD COLUMN commits_behind INTEGER DEFAULT 0;

-- catalog_meta 新增
INSERT INTO catalog_meta (key, value) VALUES ('index_version', '2');
```

### 5.3 覆盖的深水区
- **#6 Cache 无管理**：SQLite 索引让 `ColdPoolManager` 无需遍历文件系统
- **#2 多包重复逻辑**：一个索引，deck/curator/arena 共用

---

## 6. Error / Plan Layer（Agent-friendly Diagnostics）

### 6.1 原则
- 错误不是字符串，是**纯数据结构**（Plan）
- Dry-run = 打印 Plan，不执行
- Agent 读取 Plan 后自主决策

### 6.2 ValidationReport 结构

```typescript
export interface ValidationReport {
  status: 'valid' | 'invalid' | 'ambiguous'
  locator: string
  phase: 'syntax' | 'repo-existence' | 'path-existence' | 'skill-md-existence'

  findings: {
    repoExists: boolean
    repoIsPrivate?: boolean
    similarRepos?: string[]
    detectedPaths?: string[]      // Tree API 扫描到的含 SKILL.md 的目录
    skillMdFound: boolean
  }

  suggestedFixes: Array<{
    action: 'update-locator' | 'web-search' | 'prompt-user'
    confidence: number            // 0-1
    message: string
    newLocator?: string
  }>
}
```

### 6.3 覆盖的深水区
- **#4 Agent CPTSD**：结构化诊断让 agent 知道"问题是什么、怎么修"
- **#1 Path 反直觉**：`detectedPaths` 列出实际结构，建议正确 locator
- **#7 预组卡组脆弱**：dry-run 在 CI 中对 example deck 做验证

---

## 7. E2E Validation Layer

### 7.1 真实 Repo 兼容性矩阵

定期扫描高星 skill repo，验证 locator 解析：

| Repo | 结构 | 验证状态 | 测试用例 |
|------|------|----------|----------|
| `anthropics/skills` | monorepo `skills/` | ✅ | `github.com/anthropics/skills/skills/pdf` |
| `mattpocock/skills` | nested `skills/category/` | ✅ | `github.com/mattpocock/skills/skills/engineering/tdd` |
| `daymade/claude-code-skills` | flat root | ✅ | `github.com/daymade/claude-code-skills/skill-creator` |
| `Cocoon-AI/architecture-diagram-generator` | arbitrary subdir | ✅ | `github.com/Cocoon-AI/.../architecture-diagram` |

### 7.2 Pre-built Deck 冒烟测试

每个 example deck 在 CI 中跑：
```bash
for deck in examples/decks/*.toml; do
  deck validate --deck "$deck"
done
```

### 7.3 覆盖的深水区
- **#7 预组卡组脆弱**：CI 自动验证所有 example deck
- **#1 Path 反直觉**：兼容性矩阵覆盖主流结构模式

---

## 8. 依赖关系

```
E2E Validation
      ↓ 使用
Error/Plan Layer
      ↓ 使用
Resolver Layer
      ↓ 使用
ColdPoolManager
      ↓ 读写
Curator Index (catalog.db)
      ↓ 管理
Git Storage (cold pool dirs)
```

---

## 9. 实施顺序（建议）

| 阶段 | 内容 | 覆盖深水区 |
|------|------|-----------|
| P0 | 去掉隐式 `skills/`（已完成 ✅） | #1 |
| P0 | `findSkillDir` 支持 flat（已完成 ✅） | #1 |
| P1 | 扩展 curator `catalog.db` schema（git_ref 等） | #5, #6 |
| P1 | `skill-deck.lock` 加入 `git_ref` 字段 | #5 |
| P2 | 提取共享 `parseLocator`（deck + curator 共用） | #2 |
| P2 | `validateRemote` 远程预检（GitHub API） | #3, #4 |
| P3 | `ColdPoolManager` 统一缓存生命周期 | #6 |
| P3 | Agent-friendly `ValidationReport` 结构化错误 | #4 |
| P4 | E2E 兼容性矩阵 CI 化 | #7 |
| P4 | Pre-built deck 冒烟测试 | #7 |

---

## 10. 与现有代码的对接点

| 现有代码 | 变更 |
|---------|------|
| `deck/src/link.ts` `findSource()` | 保留，但内部调用 `Resolver.parseLocator()` |
| `deck/src/add.ts` `findSkillDir()` | 保留 flat 支持，内部调用 `ColdPoolManager.get()` |
| `deck/src/refresh-plan.ts` | `buildRefreshPlan` 纯函数不变，`executeRefreshPlan` 改用 `ColdPoolManager.refresh()` |
| `curator/src/cli.ts` `writeCatalogDb()` | 扩展 schema，加 git/cache 字段 |
| `skill-deck.lock` | 加 `git_ref` 字段，向后兼容 |
| `examples/decks/*.toml` | CI 验证，broken path 自动拦截 |
