# ADR-20260503152000411: deck 3-axis CRUD model with as-alias schema for working-set collisions

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-03 | 在 working-set vendor-tree bug 调查 + 命令直觉撞车 + alias collision 缺口暴露之后提出 |

## 背景

调查 `.claude/skills/` 工作集 scan 不到 declared skill 时(deck 声明 9 条,harness 只见 2 条),发现三个互锁问题:

1. **flat-namespace 没有 alias 机制**:`skill-deck.toml` 的 skill 条目用 `skills = [<string>, ...]`,两条 FQ locator 末段同名(例如多个 repo 都有 `tdd`)就装不下,schema 没有显式收口。
2. **add/update 跨层命名冲突**:`deck add` 同时改 `deck.toml` + cold pool + working set;`deck update` 只动 cold pool。两条命令在 CLI 当 peer 摆,但操作目标完全不同形,新人(以及压缩后的 agent)第一感觉就是错位。`remove`、`prune` 缺位让生命周期不闭环。
3. **deck.toml 字符串契约不友好程序化 CRUD**:`add`/`update`/`remove` 都需要改写同一个 string 数组,新加字段(`expires`、`hash_lock`、`as`)只能塞到注释或外挂 lock 文件,反复打补丁。

承接 ADR-20260502012643244(FQ-only locator)的"路径精确 library"立场——cold pool 路径必须保持 `<host>/<owner>/<repo>/skills/<name>` 的 go-module 形作为稳定锚点,alias 只在工作集落位时生效,不污染 cold pool。

## 决策驱动

- 承接 ADR-20260502012643244:cold pool 路径稳定不变(go-module 形),alias 只影响 working set symlink 名字。
- 同 alias 冲突必须显式可见、actionable。
- CLI 命令副作用按操作层划分,避免跨层魔法。
- schema 必须程序化 CRUD 友好,future 字段加 key 即可。
- 用户为零 → 重大变更允许 deprecation shim 一个 minor 版本然后硬切。

## 选项

### 方案A: inline 表 `{ path, as }` 与 string 混在数组里

保留向后兼容,简洁。

**优点**:
- 旧 deck.toml 字符串不需要立即迁移
- 单条写起来短

**缺点**:
- string/object 混型 → parser 分支多、TS 类型 narrowing 烦
- future 字段加进 inline 表会让单行变得很长
- `@iarna/toml` stringify 对 inline 表的格式控制不一致

### 方案B: array-of-tables `[[<type>.skills]]` (selected)

每条统一对象。

**优点**:
- uniform CRUD,`add` / `remove` / `update` 都是块级操作
- future 字段(`expires`、`pin`、`hash_lock`、`as`)直接加 key,正交
- `@iarna/toml` stringify 出来是干净的 section 块
- TS 类型一目了然,`SkillEntrySchema` 一份就够

**缺点**:
- 单条 skill 比 string 多 1 行
- 现有 deck.toml 需迁移(但可工具化)

### 方案C: 不动 schema,纯靠命名约定避免冲突

要求所有作者前缀化 skill 名字。

**优点**:
- 零代码改动

**缺点**:
- 完全把责任推给上游;deck 不真正解决问题
- 三方 skill 名字不可控
- 与 FQ-only ADR 立场矛盾——FQ 是 deck 的契约,name collision 是 deck 必须管的问题

## 决策

**选择**: 方案B(schema)+ 三轴 CLI 重组(命令模型)

### Decision A — Schema: array-of-tables

```toml
[[innate.skills]]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"

[[tool.skills]]
path = "github.com/mattpocock/skills/tdd"

[[tool.skills]]
path = "github.com/foo/bar/skills/tdd"
as = "tdd-foo"
```

- `path`(必填):FQ 形 `<host>/<owner>/<repo>[/<skill>]` 或 `localhost/<name>`
- `as`(可选):working-set flat symlink 名字。默认 = `basename(path)`
- alias 唯一性跨所有 type(innate/tool/combo/transient)合并校验;同 alias = 错误,要求其中一条加 `as`
- v0.8.x 期间 string-array 仍可解析但打 deprecation warning;`deck migrate-schema` 一键转。v1.0.0 硬切

### Decision B — CLI 三轴

| 轴 | 命令 | 副作用层 | 行为(精确) |
|----|------|----------|--------------|
| 声明 | `deck add <fq> [--as <alias>] [--type <innate\|tool\|combo\|transient>]` | deck.toml + cold pool + working set | 写 `[[<type>.skills]]` 条目;cold pool 缺则 fetch;尾随 `link` |
| 声明 | `deck remove <fq\|alias>` | deck.toml + working set | 删 deck.toml 条目 + 删 working set symlink;**不动 cold pool** |
| 物料 | `deck refresh [<fq\|alias>]` | cold pool + working set | 对 cold pool 条目执行 `git pull`(无参 = 所有 declared);完成后 `link`;**不动 deck.toml** |
| 物料 | `deck prune` | cold pool | 删除 cold pool 中已无任何 deck 引用的条目;交互确认 + 列表展示;**不动 deck.toml / working set** |
| 工作集 | `deck link` | working set | 纯 idempotent reconciler:flat symlink `<alias>/ → <cold-pool 路径>`;非 symlink 实体备份+移除;collision 报错 |
| ~~弃用~~ | ~~`deck update`~~ | -- | v0.8.x alias 到 `refresh` + warning;v1.0.0 删除 |

每条命令的副作用列闭合在表里,**严禁跨轴**——例如 `remove` 不允许删 cold pool,`refresh` 不允许改 deck.toml。

## 影响

- 正面:
  - deck.toml 条目 = 路径精确契约;同 alias 冲突显式 + actionable
  - CLI 命令副作用按层划分,新人 onboarding 看一张表懂 99%
  - `remove` / `prune` 补齐生命周期闭环
  - future 字段(`expires`、`pin`、`hash_lock`)在 array-of-tables 下零摩擦
  - 与 FQ-only locator 决策形成自洽的"路径精确"立场
- 负面:
  - 现有 deck.toml(string-array)需迁移 → 提供 `deck migrate-schema` 工具 + deprecation warning
  - `update` → `refresh` 改名,有 muscle memory 成本 → deprecation shim 一个 minor 版本
  - CLI 表面变大(增 `remove`、`prune`,共 5 个常规 + 1 deprecated)
- 后续:
  1. 落地 6 个关联 task(见下方 关联)
  2. v0.8.x 发布 deprecation warning(string-array + `deck update`)
  3. v0.9.0 默认新 schema + 新命令
  4. v1.0.0 删除 deprecation shim
  5. README / SKILL.md 同步更新命令表

## 相关
- 关联 ADR:
  - **ADR-20260502012643244**(FQ-only locator)— 本 ADR 在它基础上补 collision 缺口和 CRUD 操作模型
  - **ADR-20260423130348396**(port skill-manager into lythoskill ecosystem)— deck governance 的起源
  - **ADR-20260502012643344**(self-bootstrap via `localhost/<name>` symlink)— `localhost/<name>` 也走 flat alias 落位,本 ADR 与之兼容
  - **ADR-20260501091724816**(cold_pool → library 重命名)— 同一 path-precise 立场
  - **ADR-20260502012643544**(skills as flat controllers)— flat namespace 的心智基础
- 关联 Task: TASK-20260503152001333 / -152002342 / -152003393 / -152004433 / -152005415 / -152006435
- 关联 Epic: TBD(看是否合并到现有 deck-governance epic 或新开)
