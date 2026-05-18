---
created: 2026-05-18
updated: 2026-05-18
category: pattern
---

# Skill Incubator SOP — curator-driven skill creation pipeline

> Curator identifies gap → Journalist researches → Architect composes → Coach validates → Curator stores. Not designed upfront — emerged from hands-on practice.

## Context

During EPIC-20260518125955940, a repeatable SOP emerged for skill creation. The trigger: curator identified a "journalist" niche gap (no existing skill for multi-source fact-checking with structured confidence). Rather than waiting for the ecosystem to fill the gap, the SOP produced `lythoskill-journalist` in one session.

The key insight: **card game DIY principle** — if no card fits your deck, print your own.

## Details

```
curator → gap 识别           "系统里没有记者技能" (bloom filter: confirmed absent)
    ↓
journalist → 提取核心要点    论文/资料 → 规则提炼 (阅读理解 meta skill)
    ↓                         不是搬运论文，是提炼自己的实战积累
architect → 结构化、提炼规则  7 条核心规则，arena 是 multi-agent infra
    ↓                         组卡审美：识别 gap → 组合现有 infra → 产生新技能
coach → 验证、优化           264 行, 1151 chars desc, type: standard, body <500
    ↓
curator → 收录、tag          curator tag --niche "meta.investigation"
```

**孵化器本身的组卡审美**: 不是凭空造技能。识别 gap → 找到合适模式（记者/架构师）→ 组合现有 infra（arena + curator）→ 产生新技能。用的是已有的牌，组出新的 combo。

**Infra 复用**: curator 用了 `@lythos/infra` 的 `SqliteDb` 基类（write-through cache 直接复用现有 insertSkill）。Journalist 技能声明 arena 为验证 infra，curator 为记忆层——不重复造轮子。

**教练把关**: 有 coach 在，文档技能化不难。阅读理解提取核心 → coach 校验格式 → 自然孵化。coach 的 12 维度评分提供了结构化的质量门槛。

## When to Apply

- Curator 发现生态 gap（某个 niche 没有现成技能）
- 需要将已知方法论（论文、最佳实践、团队经验）技能化
- 现有技能不能直接满足需求，但可以组合现有 infra 产生新能力

## When Not to Apply

- 已有现成技能可直接收录 — 直接用 `curator add`
- 纯粹的技术选型或配置 — 那是 ADR 或 deck.toml
- 方法论还没有经过 practice 验证 — 先做 reproduce.sh，再做技能

## Related

- ADR-20260518123403810: Curator role re-derivation
- EPIC-20260518125955940: Curator MVP — mindset refactor
- 卡牌游戏/YGOPro metaphor: DIY 卡牌，没有就自己印
- `showcase/architect-deck/` — 架构师维度 example deck
- `packages/lythoskill-journalist/` — 孵化器产出的第一个技能
- `@lythos/infra` SqliteDb — curator write-through cache 的 infra 基础
