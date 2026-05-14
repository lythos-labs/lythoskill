---
created: 2026-05-11
status: proposed
---

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-11 | Created — normalizeSkillsSh() implemented in deck add.ts, 17 top skills.sh skills parse correctly |

# ADR-20260511093900000: skills.sh syntax sugar in deck add — boundary normalization, not protocol integration

## 背景

skills.sh (Vercel) 已成为 agent skill 生态的事实标准发现层。其安装命令格式
(`npx skills add owner/repo[@skill]`) 被广泛使用。

用户旅程应该是丝滑的：
```
skills.sh find "react performance" → 找到 vercel-labs/agent-skills
npx skills add vercel-labs/agent-skills   ← 复制这个命令
deck add vercel-labs/agent-skills         ← 原样粘贴，直接工作
```

但如果 deck 只接受 FQ locator，用户需要手动转换：
```
deck add github.com/vercel-labs/agent-skills  ← 多一步，断流
```

问题是：deck 使用 FQ locator (`host.tld/owner/repo[/skill]`)，skills.sh 使用
shorthand (`owner/repo` 或 `owner/repo@skill`)。两者在语义上等价（都解析到
`github.com/owner/repo.git`），但语法不同。语法糖就是为了消除这一步转换 —
让 find-skills 的产出直接喂给 deck add。

## 选项

### Option A: 不接受 shorthand（现状）

只接受 FQ locator。用户需要手动转换 `owner/repo` → `github.com/owner/repo`。

| Pros | Cons |
|---|---|
| 零额外复杂度 | 用户从 skills.sh 复制命令后要手动改写 |
| 无 bug 面 | 增加 adoption friction |

### Option B: 语法糖 + 边界归一化

在 `deck add` 入口处接受 skills.sh shorthand，内部归一化为 FQ locator 后走同样管线。

| Pros | Cons |
|---|---|
| 生态兼容 — skills.sh 用户无缝迁移 | 增加 normalize 函数的复杂度 |
| 不改内部表示 — FQ locator 仍是唯一真值 | 正则匹配有边界 case 风险 |
| deck.toml 仍存 FQ 格式 — 不引入新格式到存储层 | |

### Option C: 全协议适配

支持 skills.sh 的 `.skill-lock.json`、`npx skills` CLI 等完整协议。

| Pros | Cons |
|---|---|
| 最大兼容 | 重复实现 Vercel 的安装层 — 违背 thin pattern |
| | 冷池失去 git 同构性 |

## 决策

**Option B — 语法糖 + 边界归一化。**

理由：

1. **边界归一化，内部不变。** Hono adapter 模式：多样输入在入口处收敛到单一内部表示。
   `owner/repo@skill` → `normalizeSkillsSh()` → FQ locator → `parseLocator` → 后续管线。
   deck.toml 存的一直是 FQ locator，不受影响。

2. **生态复用，不重复发明。** skills.sh 已解决发现层（排行榜、安全审计、`npx skills find`）。
   我们不需要再做一套搜索。只需让用户从 skills.sh 找到技能后能直接 `deck add`。

3. **粒度对齐已验证。** `parseSource` (Vercel) 和 `parseLocator` (lythoskill) 都解析到
   `github.com/owner/repo.git` + 可选 subpath。17 个 top skills.sh 技能全部解析通过。

4. **不多协议适配。** 这延续了 ADR-20260508230803515 (curator no feed adapters) 和
   ADR-20260511000000000 (deck git-only FQ locators) — agent 做发现，CLI 做治理。
   skills.sh 的 `npx skills` 功能（find、check、update）不在 deck 范围内。

## 实现

- `normalizeSkillsSh()` 在 `packages/lythoskill-deck/src/add.ts`
- 支持格式: `owner/repo`、`owner/repo/subpath`、`owner/repo@skill`、`github:owner/repo`
- FQ locator 和 localhost 直通（不经过 normalize）
- `@skill` 归一化到 repo 级别 — 技能路径在 clone 后由 `findSkillDirectories` 动态发现
- 17 个 skills.sh top skill 全部解析正确 (add.test.ts)

## 风险和缓解

| 风险 | 缓解 |
|---|---|
| 正则匹配边界 case | 17 个 top skill + FQ/localhost/github: 前缀全部有测试 |
| `@skill` 假设 `skills/` 路径 | 已修正：`@skill` 只归一化到 repo 级别，路径在 runtime 发现 |
| 增加 add.ts 复杂度 | normalize 函数 30 行，单一职责，独立测试 |

## 影响

- `deck add` 接受 skills.sh 格式 — 降低 adoption friction
- deck.toml 存储格式不变 — 一直是 FQ locator
- 不需要对接 skills.sh API 或 `.skill-lock.json`
- 和 skills.sh 的关系：skills.sh = 发现层，lythoskill = 治理层

## 相关

- ADR-20260511000000000: deck git-only FQ locators vs hub/marketplace
- ADR-20260508230803515: curator no feed adapters
- [skills.sh ↔ lythoskill interop research](../wiki/02-research/2026-05-11-skills-sh-interop-syntax-sugar.md)
- [skills discovery vs governance](../wiki/01-patterns/2026-05-11-skills-discovery-vs-governance-complementary-architecture.md)
