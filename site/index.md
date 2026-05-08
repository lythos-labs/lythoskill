---
layout: home

hero:
  name: "lythoskill"
  text: "Skill governance, not a skill collection"
  tagline: Declarative deck management · Arena validation · Curator discovery · K8s-style reconciliation
  actions:
    - theme: brand
      text: Start at Level 0
      link: /in-action/level-0
    - theme: alt
      text: View on GitHub
      link: https://github.com/lythos-labs/lythoskill

features:
  - icon: 🃏
    title: Deck Governance
    details: Declare which skills your project uses. Undeclared skills are physically absent — deny-by-default.
    link: /guide/deck
  - icon: ⚔️
    title: Arena Validation
    details: A/B test skills with controlled variables. Same task, different decks, judge scores outputs.
    link: /guide/arena
  - icon: 📚
    title: Curator Discovery
    details: Scan cold pools, index metadata, query with SQL. Three-layer trust model.
    link: /guide/curator
  - icon: 🤖
    title: Built by AI Agents
    details: Zero human-written code. 12 packages, 487+ tests, built by AI agents under human direction. We dogfood our own governance.

---

# lythoskill in Action

> **上手门槛像游戏关卡一样设计** — 每一关解锁一个新能力，前一关的产出是后一关的装备。

| Level | 关卡 | 时间 | 产出 |
|-------|------|------|------|
| **0** | [零认知尝鲜](/in-action/level-0) | 5 分钟 | 三个不同 deck 的输出对比 |
| **1** | [单项目上牌](/in-action/level-1) | 15 分钟 | 第一个 `skill-deck.toml` + 受控的 working set |
| **2** | [冲突治理与配额](/in-action/level-2) | 30 分钟 | deny-by-default + max_cards + combo |
| **3** | [技能作者](/in-action/level-3) | 1-2 小时 | 发布 Thin Skill 包 |
| **4** | [科学评估](/in-action/level-4) | 2 小时 | arena 对比报告 |
| **5** | [组织级技能治理](/in-action/level-5) | 半天 | curator + cortex + scribe 完整工作流 |

::: tip Built by AI Agents
**Zero human-written code.** Every line — 12 packages, 487+ tests, 27 ADRs, 41 wiki entries — was produced by Claude Code, DeepSeek, and Kimi under human direction.
:::
