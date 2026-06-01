---
created: 2026-05-08
updated: 2026-05-08
category: faq
---

# lythoskill in Action — 6-Level Guided Tour

> 上手门槛像游戏关卡一样设计 — 每一关解锁一个新能力，前一关产出是后一关的装备。

## Level 0: Zero-Knowledge Taste (5 min)

**概念**: `deck` 就是给 Agent 配"装备栏"。装备不同，输出完全不同。

```bash
# Quick install (or use bunx for individual steps)
curl -fsSL https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/install-deck.sh | bash
```

同一个 prompt，三个 deck（scout / documents / visual-explainer），三种输出（纯文本 / .docx / Mermaid 图）。

**产出**: 三个输出目录，直观感受 deck 的作用。如果只有 ≤3 个技能且无冲突，停在这里即可。

---

## Level 1: First Deck (15 min)

**三个名词**: Cold Pool（技能仓库 `~/.agents/skill-repos/`）、skill-deck.toml（项目技能清单）、Working Set（agent 实际读的目录）。

```bash
bunx @lythos/skill-deck@latest add github.com/anthropics/skills/skills/pdf
bunx @lythos/skill-deck@latest link
```

**产出**: `skill-deck.toml` + `skill-deck.lock` + 受控的 `.claude/skills/`。

---

## Level 2: Conflict Governance (30 min)

**三个角色**: `innate`（强制加载）、`tool`（按需调用）、`combo`（组合声明，不计入 max_cards）。

```toml
[deck]
max_cards = 6
[innate.skills.project-cortex]
path = "github.com/lythos-labs/lythoskill/skills/lythoskill-project-cortex"
[tool.skills.tdd]
path = "github.com/mattpocock/skills/skills/engineering/tdd"
[combo.fullstack]
cards = ["tdd", "react"]
prompt = "TDD first, then components"
```

**产出**: 无静默冲突的项目 deck。

---

## Level 3: Skill Author (1-2h)

**Thin Skill Pattern**: Starter（npm 包）→ Skill（SKILL.md）→ Output（build artifact）。

```bash
bunx @lythos/skill-creator@latest init my-skill
bunx @lythos/skill-creator@latest build my-skill
```

**产出**: 符合标准的可安装技能包。

---

## Level 4: Scientific Evaluation (2h)

**Arena = Agent 技能的 A/B 测试**。Stop arguing, start testing。

```bash
# A/B comparison: which deck performs better on the same task?
bunx @lythos/skill-arena@latest vs \
  --config arena-vs.toml
# Single-deck validation:
bunx @lythos/skill-arena@latest single \
  --deck baseline.toml \
  --brief "Write a login page"
```

**产出**: Pareto 前沿对比报告 + L3 信任数据。

---

## Level 5: Team-Scale Governance (half day)

**完整工具链**: curator（发现）→ arena（验证）→ deck（声明）→ cortex（治理）→ scribe（记忆）→ onboarding（接续）。

```bash
curator scan → arena compare → deck add winner → cortex task/adr → scribe handoff
```

**产出**: 可自我维护的团队技能治理基础设施。lythoskill 自己就是用这套工具链构建的。

---

## Related

- [Deck README](../../packages/lythoskill-deck/README.md)
- [Arena README](../../packages/lythoskill-arena/README.md)
- [Curator README](../../packages/lythoskill-curator/README.md)
- [Player-Deck Separation](../../wiki/01-patterns/2026-05-02-player-deck-separation-and-tcg-player-analogy.md)
