# Hermes Deck 未来能力提案

> 类型: 设计探索 | 状态: 提案阶段，未进入实现排期
>
> ⚠️ **本文档所有内容均为设计设想，不等同于 lythoskill 当前已发布能力。**
> 当前已发布能力见 [hermes-skill-governance-real-pain-points.md](./hermes-skill-governance-real-pain-points.md) 和 [hermes-governance-showcase-design.md](./hermes-governance-showcase-design.md)。

---

## 提案背景

在编写 Hermes 社区展示方案时，我们识别出两个当前 lythoskill-deck 尚未支持、但对完整治理故事有补充价值的能力：

1. **side deck 一键切换**：在单个 toml 内或 CLI 层面支持多 deck 快速切换
2. **transient 过期自动清理**：ADR-20260501160000000 Phase 3 已设计，当前代码只输出 warning

同时，我们排除了一个之前被误提的提案方向：

3. ~~**transient 支持 `skills` 数组引用 cold pool**~~ — **已否决**。这与 transient 作为"workaround，shrink until removable"的核心设计意图相矛盾。详情见下方"被否决的提案"。

---

## 提案一：side deck 一键切换（side-deck）

### 当前限制

v0.7.3 支持 `--deck` 参数指定不同 toml 文件，但没有"side deck"作为一等概念。用户需要：

```bash
bunx @lythos/skill-deck link --deck ./deck-daily.toml
bunx @lythos/skill-deck link --deck ./deck-release.toml
```

这本质上是"换文件再 link"，不是"切换"。

### 设计提案

**方案 A：多 deck 文件 + 激活标记**

在 `skill-deck.toml` 中内嵌多个 deck 定义：

```toml
[deck]
max_cards = 10

# 默认激活的 deck
[active.daily]
innate = ["lythoskill-deck"]
tool = ["userorbit", "slack-notify"]

[profile.release]
innate = ["lythoskill-deck"]
tool = ["userorbit", "github-release-notes"]

[profile.security-audit]
innate = ["lythoskill-deck"]
tool = ["owasp-top-10", "pentest-checklist"]
```

CLI：

```bash
# 切换到 release profile
bunx @lythos/skill-deck switch release
```

**方案 B：独立 side-deck 目录**

在 `decks/` 目录下放置多个 toml，`link` 默认使用 `skill-deck.toml`，`switch` 命令做符号链接或副本替换。

```bash
decks/
├── default.toml      # skill-deck.toml 的软链目标
├── daily.toml
├── release.toml
└── security.toml

bunx @lythos/skill-deck switch daily  # 切换软链指向
```

### 待决策

- 是否需要新增 `switch` 子命令？还是复用 `link --deck`？
- profile 切换时，是否需要保留上一个 profile 的 lock 文件用于回滚？
- 与 `skill-deck.lock` 的兼容性：切换后 lock 是否应该包含当前 active profile 的信息？

---

## 提案二：transient 过期自动清理（transient-auto-cleanup）

### 状态说明

这不是"未来设想"，而是 **ADR-20260501160000000 Phase 3 已确认的设计**，当前代码已实现警告逻辑，只差清理步骤。

### 当前限制

v0.7.3 的过期检查只是 warning：

```typescript
if (days <= 0) {
  console.warn(`⚠️  Expired: ${s.name}...`);
}
```

过期 transient 的 symlink 不会被删除，用户必须手动编辑 toml 并重新 link。

### ADR 已设计的方案

在 transient 过期检查（已有）后，加清理逻辑：

```typescript
for (const s of linkedSkills) {
  if (s.type !== "transient" || !s.expires) continue;
  const days = Math.ceil((new Date(s.expires).getTime() - Date.now()) / 86400000);
  if (days <= 0) {
    // 从 working set 移除 symlink
    const wsPath = join(WORKING_SET, s.name);
    rmSync(wsPath, { recursive: true, force: true });
    console.log(`  🗑️  Expired transient removed: ${s.name}`);
    // 注意：不从 skill-deck.toml 移除声明，保留审计轨迹
  }
}
```

**关键设计决策**（来自 ADR）：
- 自动清理的是 working set 中的 symlink，不是 toml 中的声明
- toml 中保留过期声明，作为审计轨迹
- 用户需要手动编辑 toml 移除声明，否则下次 link 会重新创建 symlink（如果 skill 还存在）

### 待决策

- 是否需要 `--prune-expired` 参数，让用户显式选择是否清理？（默认行为如何？）
- 过期移除的 skill 是否需要备份？
- 是否应该在 lock 中标记 `status: "expired_removed"`？

---

## 被否决的提案：transient `skills` 数组

### 之前被误提的方向

有文档曾提议让 transient 支持 `skills` 数组，直接引用 cold pool 中的 skill：

```toml
# ❌ 这个方向已被否决
[transient.gepa-v2-trial]
skills = ["deploy-v2"]
expires = "2026-05-15"
```

### 否决原因

这与 transient 的核心设计意图直接矛盾：

1. **transient 是 workaround，不是候选 skill 试用槽**（`toml-format.md`）
   > "Must declare `expires`. Design goal: shrink until removable."

2. **harness 应该越来越薄**（`daily/2026-05-02.md` `project_transient_skill_thins_over_time`）
   - 如果 transient 可以引用 cold pool 中的复杂 skill，harness 会变厚
   - transient 的内容应该是极薄的本地 patch，而不是完整的 skill

3. **如果反复需要，extract into a package**（`toml-format.md`）
   - 这意味着 transient 的存在本身就是"需要被消除的信号"
   - 用 transient 管理"候选变体"会让这个信号消失——候选变体不是 workaround，而是可能需要长期存在的 skill

4. **deck_skill_type: transient 的信号含义**（`skills/lythoskill-deck/SKILL.md`）
   > "Signals 'this skill expects to disappear as the ecosystem evolves'"
   - GEPA 候选变体不一定"期望消失"，它们可能期望"被选中并长期使用"
   - 这类 candidates 更适合用 `tool` 管理，通过正常的 deck 评估流程晋升

### 正确用法

如果确实有"试用候选 skill"的需求，当前版本的做法是：

```toml
# 候选 skill 作为 tool 加载，正常评估
[tool]
skills = ["deploy-v2-candidate"]

# 如果候选有 regression，写一个极薄的 transient patch 临时绕过
[transient.deploy-v2-patch]
path = "./patches/deploy-v2-patch"
expires = "2026-05-15"
```

候选 skill 本身走 `tool` 的正常生命周期，只有 workaround patch 走 `transient`。

---

## 与展示方案的关系

这些提案不应混入当前展示方案，但可以作为"下一步"提及：

```markdown
当前版本：多个 deck 文件 + `link --deck` 手动切换
下一步：side deck 一键切换（提案阶段，见 hermes-deck-future-proposals.md §side-deck）
```

对于 transient：

```markdown
当前版本：transient 过期输出 warning，用户手动编辑 toml 移除
下一步：ADR-20260501160000000 Phase 3 自动清理（已设计，待实现）
```

这样展示方案保持诚实（只承诺已发布能力），同时给社区一个清晰的发展预期。

---

## 推进建议

1. **短期（保持现状）**：展示方案使用当前 `path` 模式的 transient 和 `--deck` 切换，诚实标注限制。
2. **中期（按 ADR 实现）**：`link.ts` 中增加 transient 过期自动清理（ADR Phase 3），这是最小的实现增量。
3. **长期（评估 side deck）**：将 side deck 提案转化为正式 ADR，评估 schema 变更对现有 lock 文件的兼容性影响。
4. **明确排除**：不在任何文档中暗示 transient 会支持 `skills` 数组或 cold pool 引用，防止设计意图漂移。
