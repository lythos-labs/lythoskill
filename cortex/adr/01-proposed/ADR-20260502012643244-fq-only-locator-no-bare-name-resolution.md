# ADR-20260502012643244: FQ-only locator — 删除 bare-name 与隐式策略 fallback

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-02 | 在 deck-add bug 调查后提出，当时参考了 ADR-20260501091724816 (cold_pool→library 提议，后被 rejected) 的精确路径思路 |

## Context

`skill-deck.toml` 中 `[innate|tool|combo].skills` 的字符串当前由 `findSource()` 解析（`packages/lythoskill-deck/src/link.ts:60-126`），按 5 种策略尝试命中：

| # | 策略 | Library 下的形态 | deck.toml 中 skill 名 |
|---|------|------------------|------------------------|
| 0 | Fully-Qualified | `host.tld/owner/repo/skills/<skill>/SKILL.md`（或 `host.tld/owner/repo/SKILL.md` for standalone） | `github.com/owner/repo/skill` |
| 1 | 直接路径 | `<library>/<name>/SKILL.md` | bare `<name>` |
| 2 | Monorepo | `<library>/<repo>/skills/<skill>/SKILL.md` | `repo/skill` |
| 3 | 项目本地 | `<project>/skills/<name>/SKILL.md`（独立于 library） | bare `<name>`，配合 `cold_pool="."` |
| 4 | 扁平扫描 | `<library>/<any-entry>/<name>/SKILL.md` 或 `<library>/<any-entry>/skills/<name>/SKILL.md` | bare `<name>` |

Bare name 可被策略 1/3/4 中任一命中。多源命中时 `findSource` 返回 Ambiguous 错误（link.ts:117-122），但单源命中会因为「找到了就用」隐式落到不同物理路径。这导致：

1. **deck.toml 不是路径精确的契约**：同一行字符串在不同 library 状态下解析到不同位置。
2. **测试 fixture 必须铺特定目录结构才能触发对应策略**——见 `playground/agent-bdd/scenarios` 的 README「Match the cold-pool layout to the resolution strategy」一节。
3. **bug 调查路径长**：定位 deck-add 异常时必须心算 5 个策略的命中顺序。
4. **路径精确性要求**：bare-name fallback 允许同一字符串在不同 library 状态下解析到不同位置，违背了 deck 作为精确契约的设计。

## 决策驱动

- 与 cold pool 的物理隔离设计一致：locator 应精确指向唯一物理位置，拒绝隐式解析。
- 删除「方便但脆弱」的入口，强迫 deck.toml 写明出处。
- 简化 `findSource()`，降低后续维护成本。
- 由 `deck add` 自动写入 FQ 字符串抵消用户首次输入成本。

## Options Considered

### Option A: 现状（5 策略 + bare-name fallback）— Rejected
保留多义性，依靠 Ambiguous 错误兜底。

- **Pros**: 现有 deck.toml 不需要迁移
- **Cons**: 上文 4 点；与 library 概念矛盾；持续承担多义性的认知税

### Option B: 减少策略到 0+3（FQ + 项目本地）— Rejected
保留项目本地 fallback 以便 lythoskill 自举。

- **Pros**: 项目自举体验不变
- **Cons**: 仍需 bare name；项目本地是 lythoskill-only 特例（外部用户无此需求）；与 ADR B（自举 via `localhost/<name>` symlink）冲突

### Option C: FQ-only — Selected
只接受三种 Fully-Qualified 形态：
- `host.tld/owner/repo/<skill>` — monorepo 中的 skill
- `host.tld/owner/repo` — standalone skill（repo 根即 skill）
- `localhost/<name>` — 无远程 origin 的本地 skill

bare name / 项目本地 fallback / 扁平扫描全部删除。bare-name 输入时报错并提示「FQ 修正建议」。

- **Pros**: deck.toml 字符串 = 唯一物理路径；`findSource` 简化为线性匹配；library 不再需要扫描
- **Cons**: 现有 deck.toml 需迁移（提供 `deck migrate-locators` 工具或在 link 输出 diff 建议）

## Decision

采用 Option C：FQ-only locator。

具体变更：

1. `findSource()` 删除策略 1/2/3/4，仅保留策略 0
2. 解析失败时，错误信息包含 FQ 建议：例如 bare `my-skill` 输入 → 提示「Try `localhost/my-skill` or `<host>/<owner>/<repo>/<skill>`」
3. `deck add` 始终向 deck.toml 写 FQ 字符串（见 ADR C）
4. v0.7.0 引入 deprecation shim：bare name 仍可解析但打印 warning + 建议；v1.0.0 硬切断

## Consequences

### Positive
- deck.toml 字符串成为路径精确的契约
- `findSource` 从 67 行简化为 ~15 行
- library 不再需要扁平扫描，性能略好
- 与 cold pool 作为路径精确存储层的设计自洽（locator 精确指向物理位置）

### Negative
- 现有 deck.toml 需迁移（自动化工具可解决 90%）
- 用户首次手写 deck.toml 字符更长——通过 `deck add` 自动写入抵消

### 后续
1. 实现 `findSource` 简化（与 ADR B/C 同期落地）
2. v0.7.0 deprecation warning
3. `deck migrate-locators` 工具：扫描 deck.toml + library，把 bare name 替换为 FQ
4. v1.0.0 删除 deprecation shim

## Related
- ADR-20260501091724816（cold_pool → library 提议）— **已 rejected**，但"locator 应路径精确"的设计原则仍成立
- ADR-20260502012643344（自举 via `localhost/<name>` symlink）— 删除 `cold_pool="."` 模式后 FQ-only 才闭合
- ADR-20260502012643444（deck add 写 FQ + 删 skills.sh backend）— 抵消用户输入成本
- ADR-20260502012643544（Skills as Flat Controllers）— 心智层为本决策提供理由
