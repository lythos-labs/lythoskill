# ADR-20260503152000411: deck 3-axis CRUD model with as-alias schema for working-set collisions

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-03 | 在 working-set vendor-tree bug 调查 + 命令直觉撞车 + alias collision 缺口暴露之后提出 |
| proposed (revised Decision A) | 2026-05-03 | 用户反馈:alias 风格更像 dict;改选方案 D(alias-as-key)而非方案 B(array-of-tables);利用 dict object body 写 summary / why_in_deck 元信息 |
| accepted | 2026-05-03 | 6 关联 task 全部完成 + 20 BDD scenarios 全绿 + README/CI sweep 完成 + install-deck.sh 交付 |

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

### 方案B: array-of-tables `[[<type>.skills]]` (considered, superseded by Decision D)

每条统一对象。

**优点**:
- uniform CRUD,`add` / `remove` / `update` 都是块级操作
- future 字段(`expires`、`pin`、`hash_lock`、`as`)直接加 key,正交
- `@iarna/toml` stringify 出来是干净的 section 块
- TS 类型一目了然,`SkillEntrySchema` 一份就够

**缺点**:
- 单条 skill 比 string 多 1 行
- 现有 deck.toml 需迁移(但可工具化)
- alias collision 检测要 deck CLI 自己实现(扫 array 找重复 basename / `as`),不能下放给 TOML parser
- alias 不是 first-class identity:看 entry 要先看 `path = ?`,再看 `as = ?`,二级关注

**为什么被替换**:用户 2026-05-03 反馈 "alias 风格,JSON key:value 也有优点" → 把 alias 提到 TOML key 位置(方案 D)更直接,collision 检测下放给 TOML parser 本身,符合"thin layer / 成熟基建"原则。

### 方案D: alias-as-key dict `[<type>.skills.<alias>]` (selected)

alias 是 first-class TOML key,object body 装 path + 元信息。

```toml
[tool.skills.tdd]
path = "github.com/mattpocock/skills/tdd"
summary = "Vertical-slice red-green-refactor discipline"
why_in_deck = "Drives the deck 3-axis refactor itself"

[tool.skills.tdd-foo]
path = "github.com/foo/bar/skills/tdd"
```

**优点**:
- alias collision = TOML key 重复 → @iarna/toml parser 直接抛错,**不需 deck CLI 自己写校验**(thin layer + 成熟基建)
- alias 是 first-class identity,`deck.toml` 顶视图 = 工作集名字一目了然
- `deck remove tdd-foo` = 删一个 section,极简
- object body 天然装 `summary` / `why_in_deck` / `expires` / `pin` / `hash_lock` 字段,**充分利用 TOML 表达力**(用户原话:"各种 summary 和'为啥加入卡组'可以好好写")
- 与 Maven `dependencyManagement`(alias→coords map)、npm `package.json` `dependencies`(name→version map)同构

**缺点**:
- default alias = `basename(path)` 时,CLI 仍要写 key(用户 `deck add <fq>` 操作不变,工具自动写 key)
- section 头数量 = skill 数量,visually heavier 一点
- 旧 string-array 迁移工具仍需要(同 B)

### 方案C: 不动 schema,纯靠命名约定避免冲突

要求所有作者前缀化 skill 名字。

**优点**:
- 零代码改动

**缺点**:
- 完全把责任推给上游;deck 不真正解决问题
- 三方 skill 名字不可控
- 与 FQ-only ADR 立场矛盾——FQ 是 deck 的契约,name collision 是 deck 必须管的问题

## 决策

**选择**: 方案D(schema)+ 三轴 CLI 重组(命令模型)

### Decision A — Schema: alias-as-key dict

**心智**:`alias = role / job description`,`path = implementation`。两者解耦。`deck.toml` 不再读作"我装了哪些 skill",而是"卡组需要哪些角色,目前由谁实现"。这个解耦自然引出 arena 对接路径(同一 alias 下多个候选 path 跑实证)、role-driven swap、JD 风格 audit。

```toml
[innate.skills.lythoskill-deck]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-deck"
role = "Deck reconciler — symlink working set against cold pool"
why_in_deck = "Self-bootstrap baseline; every project gets it"

[tool.skills.tdd]
path = "github.com/mattpocock/skills/tdd"
role = "TDD discipline driver — vertical-slice red-green-refactor"
why_in_deck = "Entry fee for any large refactor; currently driving deck 3-axis CRUD"
# contenders = ["github.com/anthropic/skills/tdd"]   # future: arena 候选池

[tool.skills.tdd-foo]
path = "github.com/foo/bar/skills/tdd"
# 同 alias 在 TOML 层就报重复 key 错误,不需 deck CLI 自己实现 collision 检测
```

- **alias**(TOML key,必填):working-set flat symlink 名字 + 卡组角色定位。CLI `deck add <fq>` 默认推断为 `basename(path)`,可用 `--as <alias>` 指定
- **path**(必填):当前选定的 implementation,FQ form `<host>/<owner>/<repo>[/<skill>]` 或 `localhost/<name>`
- **role**(可选,string):一句话 role / JD 描述,**面向 arena 对接** — 描述这个 alias 在卡组里"做什么",与具体 implementation 解耦
- **why_in_deck**(可选,string):为什么本卡组需要这个 role(项目层 rationale,implementation 选择动机)
- **forward-compat**:zod schema 用 `passthrough()` 模式,允许未知字段存在但不验证。后续 ADR 加 `why_in_template` / `contenders` / `expires` / `pin` / `hash_lock` 时**不必改本 schema** —— 各自 ADR 在自己 scope 里加严
- **alias 唯一性**:同 type 内由 TOML parser 重复 key 兜底;跨 type 同 alias 由 deck CLI 合并校验
- **v0.8.x 兼容期**:string-array 仍可解析,emit deprecation warning;`deck migrate-schema` 一键转 dict 形态(string → `[<type>.skills.<basename>]` + `path = <string>`,role/why_in_deck 留空)。v1.0.0 硬切

> **注**:`role` 字段不是冗余的"description",而是 alias 自身的扩展释义 —— alias 是 short name,role 是 long form。两者一起描述"角色 = X,叫 alias-Y"。后续 audit / arena CLI 直接读 role 字段,不读 path 或 file 内容。

### Decision B — CLI 三轴

| 轴 | 命令 | 副作用层 | 行为(精确) |
|----|------|----------|--------------|
| 声明 | `deck add <fq> [--as <alias>] [--type <innate\|tool\|combo\|transient>] [--role "..."] [--why "..."]` | deck.toml + cold pool + working set | 写 `[<type>.skills.<alias>]` section;cold pool 缺则 fetch;尾随 `link` |
| 声明 | `deck remove <alias>` | deck.toml + working set | 删 deck.toml section + 删 working set symlink;**不动 cold pool** |
| 物料 | `deck refresh [<alias>]` | cold pool + working set | 对 cold pool 条目执行 `git pull`(无参 = 所有 declared);完成后 `link`;**不动 deck.toml** |
| 物料 | `deck prune` | cold pool | 删除 cold pool 中已无任何 deck 引用的条目;交互确认 + 列表展示;**不动 deck.toml / working set** |
| 工作集 | `deck link` | working set | 纯 idempotent reconciler:flat symlink `<alias>/ → <cold-pool 路径>`;非 symlink 实体备份+移除;collision 在解析阶段就被 TOML parser 拦截 |
| ~~弃用~~ | ~~`deck update`~~ | -- | v0.8.x alias 到 `refresh` + warning;v1.0.0 删除 |

每条命令的副作用列闭合在表里,**严禁跨轴**——例如 `remove` 不允许删 cold pool,`refresh` 不允许改 deck.toml。

> **注**:`deck remove <alias>` 用 alias 而非 FQ path 作主参数,因为 dict 形态下 alias 是 first-class identity;FQ 仍可作为可选辅参用于歧义场景(同 alias 跨多 type 时)。

## 影响

- 正面:
  - deck.toml 条目 = 路径精确契约;同 alias 冲突由 TOML parser 兜底,actionable
  - **alias = role / path = implementation 解耦** —— `deck.toml` 读作 role-driven 卡组而非 implementation 清单;arena / swap / audit 等 verb 自然浮现
  - `role` + `why_in_deck` 字段把"卡组治理"做成显式写作面,不靠 README 外挂
  - CLI 命令副作用按层划分,新人 onboarding 看一张表懂 99%
  - `remove` / `prune` 补齐生命周期闭环
  - future 字段(`expires`、`pin`、`hash_lock`、`contenders`)在 dict object body 下零摩擦
  - 与 FQ-only locator 决策形成自洽的"路径精确"立场
- 负面:
  - 现有 deck.toml(string-array)需迁移 → 提供 `deck migrate-schema` 工具 + deprecation warning
  - `update` → `refresh` 改名,有 muscle memory 成本 → deprecation shim 一个 minor 版本
  - CLI 表面变大(增 `remove`、`prune`,共 5 个常规 + 1 deprecated)
  - section 头数量 = skill 数量(visually heavier),但收益压过开销
- 后续(本 ADR scope 内):
  1. 落地 6 个关联 task(见下方 关联)
  2. v0.8.x 发布 deprecation warning(string-array + `deck update`)
  3. v0.9.0 默认新 schema + 新命令
  4. v1.0.0 删除 deprecation shim
  5. README / SKILL.md 同步更新命令表
- **未来扩展线**(超出本 ADR scope,各自起独立 ADR / task):
  1. **Template 系统**:`*.deck-template.toml` 预定义结构 + `why_in_template` 注释。`deck init --template <name>` 从 template 起步,role 结构和 `why_in_template` 复制到项目 deck.toml;项目 author 填 `path` + `why_in_deck`。两层 why **双向奔赴**,role-driven 卡组完整闭环。类比:`mvn archetype:generate` / React boilerplate / HR JD template
  2. **Arena 对接**:`contenders` 字段保存同 role 的候选 path 池;`deck arena <alias>` 把候选放进 arena 跑实证,winner 自动写回 `path`;`deck swap <alias> <new-path>` 手动替换 implementation
  3. **Role audit**:`deck audit` 列出每个 alias 的 `role` vs 实际 implementation 行为,检测"卡组里声明的 role 与 SKILL.md 实际功能"是否对得上(L3 layer)
  4. **Curator L3 metadata 联动**:role/why 字段进入 curator L3 私有索引,作为 agent 决策"是否激活"的 final 证据
  5. **Cross-deck role canonicalization**:多个项目的同 role 是否标准化命名(类比 npm package name 唯一性?或允许 vendor prefix?)— 待社区讨论

## 相关
- 关联 ADR:
  - **ADR-20260502012643244**(FQ-only locator)— 本 ADR 在它基础上补 collision 缺口和 CRUD 操作模型
  - **ADR-20260423130348396**(port skill-manager into lythoskill ecosystem)— deck governance 的起源
  - **ADR-20260502012643344**(self-bootstrap via `localhost/<name>` symlink)— `localhost/<name>` 也走 flat alias 落位,本 ADR 与之兼容
  - **ADR-20260501091724816**(cold_pool → library 重命名)— 同一 path-precise 立场
  - **ADR-20260502012643544**(skills as flat controllers)— flat namespace 的心智基础
- 关联 Task: TASK-20260503152001333 / -152002342 / -152003393 / -152004433 / -152005415 / -152006435
- 关联 Epic: TBD(看是否合并到现有 deck-governance epic 或新开)
