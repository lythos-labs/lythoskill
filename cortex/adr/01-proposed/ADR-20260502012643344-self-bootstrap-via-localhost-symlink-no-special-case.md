# ADR-20260502012643344: 项目自身 skill 通过 `localhost/me/<name>` symlink 自举，删除 `cold_pool="."` 特例

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-02 | 与 ADR-20260502012643244 (FQ-only) 联动 |
| amended | 2026-05-07 | localhost 形态从 `localhost/<name>` 改为 `localhost/<owner>/<repo>[/skill]`,与远程 host uniform。详见下文 §2026-05-07 update |

## Context

lythoskill 仓库自身 ship 多个 skill（lythoskill-deck/curator/cortex 等）。当前同时存在两种自举方式：

1. **`cold_pool="."` 模式**：deck.toml 设置 library 为项目根，skill 用 bare name `lythoskill-deck`，触发 `findSource` 策略 3（项目本地）
2. **标准 library 模式**：library 指向 `~/.agents/skill-repos`，外部用户的 deck.toml 用 FQ 字符串 `github.com/lythos-labs/lythoskill/skills/lythoskill-deck`

ADR-20260502012643244 (FQ-only) 决定删除策略 1/2/3/4，bare name 不再可解析。`cold_pool="."` 模式将随之失效——除非保留为「ADR A 的例外」。

外部用户（非 lythoskill 主仓库的 contributor）从未需要过 `cold_pool="."`：他们 git clone lythoskill 到 library，然后在自己项目的 deck.toml 中用 FQ 字符串引用。

## 决策驱动

- **一致性**：ADR-20260502012643244 之后，所有 deck.toml locator 必须 FQ；项目自身的 skill 不应有 lythoskill-only 特例。
- **测试公平性**：lythoskill 自身 skill 的发现路径必须与外部 skill 完全相同，否则一类 bug（FQ 解析路径）只能由外部用户首次触发。
- **特例 = 永久迁移负债**：保留 `cold_pool="."` 后，ADR A 的 deprecation shim 永远无法收紧。

## Options Considered

### Option A: 保留 `cold_pool="."` 作为 ADR A 的例外 — Rejected
deck.toml 的 `[deck]` 段允许 `cold_pool = "."`，并在该模式下保留策略 3（项目本地）解析。

- **Pros**: lythoskill 主仓库的 contributor 不需要任何 setup
- **Cons**: 永久存在的特例；外部 skill 开发者首次贡献时必须先理解「为什么这种写法只在 lythoskill 仓内 work」；妨碍 ADR A 完全闭合

### Option B: 在 cold_pool 字段中嵌入特殊语法（如 `cold_pool = ["~/.agents/skill-repos", "."]`）— Rejected
允许多 library，按顺序解析。

- **Pros**: 在统一字段下表达多源
- **Cons**: 比 Option A 更复杂；引入解析顺序敏感性；不解决 ADR A 的核心目标（路径精确）

### Option C: 项目自身 skill 通过 `localhost/me/<name>` symlink 出现在 library 中 — Selected
lythoskill 主仓库的 contributor 在 setup 时执行：

```bash
# scripts/dev-bootstrap.sh
LIBRARY="${LYTHOS_LIBRARY:-$HOME/.agents/skill-repos}"
mkdir -p "$LIBRARY/localhost/me"
for skill in skills/*/; do
  name=$(basename "$skill")
  ln -sfn "$PWD/$skill" "$LIBRARY/localhost/me/$name"
done
```

deck.toml 中所有引用改为 `localhost/me/<name>` 形态：

```toml
[innate.skills.lythoskill-deck]
path = "localhost/me/lythoskill-deck"
```

> **2026-05-07 amendment (final)**: 原 ADR 例子用 `$LIBRARY/localhost/$name`(深 2 层、缺 owner/repo 段)。该形态后被识别为 post-compaction 失忆 agent 的产物——FQ-only locator 要求**所有 host(含 localhost)用 uniform `<host>/<owner>/<repo>[/skill]` 形态**,无 special-case。`me/<name>` 是推荐的本地 skill 默认命名:`me` = 用户自己作 owner,`<name>` 直接作 repo——standalone 形态(SKILL.md 在 `<pool>/localhost/me/<name>/SKILL.md` repo 根)。3 段最简,不引入额外 `skills/` 中间层。非强制——任意 `localhost/<owner>/<repo>` 都合法,若想本地走 monorepo 风格可用 `localhost/me/skills/<name>`(4 段)。修正 per user 2026-05-07: "localhost 也要 owner 和 repo 的" + "/me/skill-a 大概是这种"。

外部用户的体验完全不变（git clone 到 library 后写 FQ 字符串）。lythoskill contributor 多一次 bootstrap 脚本执行——这个脚本本身已经存在或应该存在（用于 dev 环境初始化）。

## Decision

采用 Option C。

具体变更：

1. 新增 `scripts/dev-bootstrap.sh`（或扩展现有），实现项目内 skill → `$LIBRARY/localhost/me/<name>` 的 symlink 创建
2. 项目自身 deck.toml 改写所有引用为 `localhost/me/<name>`
3. README / CONTRIBUTING 增加一句「First-time contributors: run `./scripts/dev-bootstrap.sh`」
4. 删除 link.ts 中策略 3（项目本地）相关代码——与 ADR A 同期落地

## Consequences

### Positive
- ADR A 完全闭合，无特例
- lythoskill contributor 与外部 skill 用户的发现路径完全一致——任何 FQ 解析 bug 都对等暴露
- `cold_pool="."` 模式带来的概念混淆（library 是绝对路径仓库 vs library 是当前项目）消失

### Negative
- 首次 setup 多一步 `./scripts/dev-bootstrap.sh`
- symlink 绑定 `$PWD`，项目搬迁后失效；bootstrap 脚本需幂等并支持「重新指向当前路径」
- 多机器 dev 时每台都要跑一次（与 git clone 的多机体验一致）

### 后续
- 在 deprecation shim 期（ADR A v0.7.0）：`cold_pool="."` 仍能解析但打印 warning + 指向本 ADR
- v1.0.0 删除策略 3 + `cold_pool="."` 支持
- bootstrap 脚本作为 lythoskill 模板的一部分，供其他「ship 自己的 skill」的项目复用

## Related
- ADR-20260502012643244（FQ-only locator）— 必要前置
- ADR-20260501091724816（cold_pool → library 提议）— **已 rejected**：cold pool 术语保留
- ADR-20260502012643544（Skills as Flat Controllers）— 心智层支持「项目自身 skill 与外部 skill 同等公民」
