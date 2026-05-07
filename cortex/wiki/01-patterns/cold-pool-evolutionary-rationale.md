---
created: 2026-05-07
updated: 2026-05-07
category: pattern
author: research skill (dogfood session)
---

# Cold Pool 演进 rationale — 从 bare-name 到 URI 身份到 metadata 层

> 回答两个问题: (1) 为什么 cold pool 是 URI-based、human-readable locator? (2) Go module checksum / Maven SHA1 哪些机制适合我们、哪些不适合?
>
> 来源: ADR-20260502012643244、ADR-20260507021957847、`cold-pool-unified-facility-design.md`、`project_cold_pool_metadata_layer_research.md`、real-world repo structure survey。

---

## 1. 起点: bare-name + 隐式解析

早期 `skill-deck.toml` 允许 bare name:

```toml
[tool.skills]
my-skill = ""
```

`findSource()` 用 5 层策略尝试命中:

| 策略 | 描述 |
|------|------|
| 0 FQ | `host/owner/repo/skill` → 精确路径 |
| 1 直接 | `<pool>/<name>/SKILL.md` |
| 2 Monorepo | `<pool>/<repo>/skills/<name>/SKILL.md` |
| 3 项目本地 | `<project>/skills/<name>/SKILL.md` |
| 4 扁平扫描 | `<pool>/<any>/<name>/SKILL.md` 或 `<pool>/<any>/skills/<name>/SKILL.md` |

**问题**:
- 同一字符串在不同 library 状态下解析到不同位置 → deck.toml 不是精确契约
- 测试 fixture 必须铺特定目录结构才能触发对应策略
- Bug 调查必须心算 5 层命中顺序
- 2026-05-07 早晨事件: agent 在错误的 path 假设下把 `skill-deck.toml` 从 9-skill 覆盖成单 skill 错误 locator,30+ 轮才恢复

---

## 2. 触发: 真实世界 repo 结构多样性

`cortex/wiki/03-lessons/2026-05-07-real-world-skill-repo-structure-survey.md` 调研了 9 个流行 skill repo,发现 **5 种 layout 并存**:

| 模式 | 例子 |
|------|------|
| Standalone | `garrytan/gstack` — SKILL.md 在 repo 根 |
| Flat(root-level) | `daymade/claude-code-skills` — `skill-creator/SKILL.md` |
| Monorepo (`skills/`) | `anthropics/skills` — `skills/pdf/SKILL.md` |
| Nested monorepo | `mattpocock/skills` — `skills/engineering/tdd/SKILL.md` |
| Arbitrary subdir | `Cocoon-AI/architecture-diagram-generator` — `architecture-diagram/SKILL.md` |

**结论**: 没有任何隐式插入启发式能覆盖全部。`path` 必须是 **repo root 到 SKILL.md 目录的精确相对路径**。

---

## 3. 决策: FQ-only locator

ADR-20260502012643244 选择 **Option C: FQ-only**:

- 只接受 `host.tld/owner/repo[/skill]` 形态
- bare name / 项目本地 fallback / 扁平扫描全部删除
- `deck add` 自动写入 FQ 字符串,抵消用户输入成本

**核心原则**:

> **FQ locator 其实是 path,一层层进入就是 FQ locator 展开。就没有各种特殊情况了。**

locator = URI/URL 去掉 scheme。human-readable, web-native, git-backed。

---

## 4. 决策: Cold Pool 作为 dedicated resource holder

FQ-only 解决了"identity 是什么",但没解决"谁管理资源"。

**问题**: deck/curator/arena 各自直接 `execFileSync('git clone')` — controller 绕过 service 操作 DAO。

ADR-20260507021957847 选择 **独立 `@lythos/cold-pool` 包 + ColdPool manager**:

- `ColdPool` 类: 唯一持有者(path 配置、未来 metadata 索引、reconcile 入口)
- 操作层: `buildFetchPlan` / `buildValidationPlan` 纯函数 + IO 注入
- 不变量: **任何对 cold pool 的修改必须经过 ColdPool 类或 cold-pool 的导出 IO**

**心智模型**: K8s reconciliation — declarative desired state ↔ filesystem actual state ↔ reconciler 收敛。

---

## 5. 布局: localhost 不是特例

所有 host(含 localhost)用 uniform `<host>/<owner>/<repo>[/skill]`:

```
~/.agents/skill-repos/
├─ github.com/anthropics/skills/skills/pdf/SKILL.md
├─ github.com/daymade/claude-code-skills/skill-creator/SKILL.md
├─ localhost/me/my-skill/SKILL.md
└─ ...
```

- `localhost` 仅是 `host` 段为字面 `localhost` → **无远程**(无 clone / 无 pull / 无 fetch)
- `isLocalhost: true` 唯一作用:让 fetch / refresh / validate 跳过网络步骤
- 代码路径 `ColdPool.resolveDir` / `ColdPool.list` **没有 localhost 分支判断**

推荐快速本地 convention(非强制): `localhost/me/<skill-name>` — 3 段 standalone。

---

## 6. Checksum 机制调研: Go sumdb vs Maven SHA1

### 6.1 Go Module SumDB

| 维度 | 设计 |
|------|------|
| Hash | SHA-256 over deterministic dirhash → `h1:<base64>` in `go.sum` |
| Storage | Content-addressed zip cache + signed tree-head cache |
| Verification | `go.sum` 本地校验 → cache miss 时查询 `GOSUMDB` → 写入 `go.sum` |
| Trust | Merkle tree(Trillian-backed transparent log), tamper-evident |
| Config | `GOSUMDB=<verifier-key>`, `GONOSUMDB=prefix1,prefix2` 豁免私有模块 |

**可取之处**:
- `go.sum` 作为本地缓存的校验文件 → 后续运行无需网络
- `GONOSUMDB` 豁免机制 → 私有模块不强制走公共 log
- dirhash 是对目录内容的确定性哈希(非简单文件拼接)

**不适合我们的地方**:
- Merkle tree / transparent log → 生态系统规模才有意义(Google 运营 + 第三方审计)。lythoskill 是 per-user,用户自己就是信任根。
- 复杂度过高: 我们不需要跨用户的 tamper-evidence。

### 6.2 Maven SHA1

| 维度 | 设计 |
|------|------|
| Hash | SHA-1 over jar bytes → `<artifact>.jar.sha1` companion file |
| Storage | `~/.m2/repository/<group>/<artifact>/<version>/` |
| Trust | 纯仓库信任,无 central log |

**可取之处**:
- **cold pool 对工作空间不可见** — `~/.agents/skill-repos/` 类比 `~/.m2/repository`
- 简单 companion file 机制易于理解

**不适合我们的地方**:
- SHA-1 已弱,不应新建系统使用
- 无透明审计,retroactive corruption 不可检测

### 6.3 我们的选择: 本地信任 + 分层粒度

| 层级 | 机制 | 类比 |
|------|------|------|
| **Repo 级** | per-repo HEAD ref tracking(git commit SHA) | Go module version |
| **Skill 级** | per-skill content hash(SHA-256 of SKILL.md) | Go dirhash / Maven sha1 |
| **Deck 级** | cross-deck reference index | `apt-mark auto` reverse deps |

**信任模型**: local-only。用户是信任根。不引入 Merkle tree,不引入 coordinate 系统。

**存储**: SQLite(`~/.agents/skill-repos/.cold-pool-meta.db`),复用 curator 的 `catalog.db` 模式。

Schema sketch:

```sql
CREATE TABLE repos (host, owner, repo, head_ref, last_pulled_at);
CREATE TABLE skills (host, owner, repo, skill_subpath, skill_md_hash, last_seen_at);
CREATE TABLE references (skill_locator, deck_path, declared_alias);
```

---

## 7. 为什么 URI 身份是正确起点

内容寻址(CAS)是强大的,但它替代的是"如何验证内容",不是"如何命名内容"。

| 问题 | URI 身份 | Content Hash |
|------|----------|--------------|
| 人类可读 | ✅ `github.com/anthropics/skills/skills/pdf` | ❌ `bafybeic3...` |
| Web 原生 | ✅ URL 去掉 scheme | ❌ 需 gateway |
| Git 集成 | ✅ `git clone <url>` | ❌ 需额外映射 |
| 版本语义 | ✅ `main` branch / tag / commit | ❌ 纯内容,无时间线 |
| 内容验证 | ❌ 需额外 layer | ✅ 内建 |

**URI 身份 + metadata layer = 两者兼得**:
- URI 回答"这是什么"(人类可读、web-native)
- metadata 回答"这是哪个版本"、"内容是否被篡改"(checksum、HEAD ref)
- 不互相替代,分层协作

---

## 8. 已落地 vs 待 epic

### ✅ 已落地(cold-pool foundation week, 2026-05-07)

| 项 | 落位 |
|----|------|
| FQ-only locator | `parseLocator` + ADR-20260502012643244 |
| URI = path 统一布局 | `ColdPool.resolveDir`,无 localhost 分支 |
| `@lythos/cold-pool` 包 | `packages/lythoskill-cold-pool/` |
| intent/plan/execute pattern | `buildFetchPlan` / `executeFetchPlan` |
| ValidationReport | `ADR-20260507014124191` |
| GitHub Tree API 预检 | `fetchRepoTree`,无 fs 副作用 |

### 📋 待 epic(0.10.0 窗口)

| 项 | 依赖 |
|----|------|
| per-repo HEAD ref tracking | metadata DB schema |
| per-skill content hash(dirhash) | `skill-deck.lock` 已有 `content_hash`,可扩展为全目录 hash |
| cross-deck reference index | metadata DB + `deck add/remove`  hooks |
| prune audit heredoc with ref annotations | ADR-20260507110332770 + references 表 |
| refresh discover-then-apply | ADR-20260507110332805 + HEAD ref comparison |
| cold-pool reconcile | `buildReconcilePlan` 已 scaffold,执行未实现 |

---

## 9. 关键设计共识(沉淀)

1. **URI/URL 是人类可读定位符的好起点**。不是临时方案,是 permanent identity。
2. **localhost 完全 uniform**。无 special-case 分支。`isLocalhost` 仅是 no-remote-ops flag。
3. **checksum 是 metadata 扩展,不是 identity 替代**。Go sumdb 的 Merkle tree 对我们过重,Maven 的 companion file 概念可借鉴。
4. **local-only trust**。用户是信任根。不追求跨用户 tamper-evidence。
5. **SQLite 优于 JSON sidecar**。 curator 已验证 `catalog.db` 模式。原子事务 + JOIN 查询。
6. **两层粒度不混淆**。`skill-deck.lock` = working-set per-skill。cold-pool metadata = repo+ref 粒度。
