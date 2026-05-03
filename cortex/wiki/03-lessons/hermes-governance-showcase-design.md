# Hermes + lythoskill 治理展示设计：全真技能 + 真实场景

> 类型: 展示设计方案 | 目标: 社区投稿 / awesome-hermes-agent / Hermes Atlas
>
> 原则: 所有 skill 为真实存在项目，场景来自社区真实 workflow，不 mock、不抽象示例
>
> ⚠️ **本文档所有命令基于 lythoskill v0.7.3 已发布能力。** 标注 🚧 的步骤需要未来功能支持，当前版本需要替代方案。未来设计见 [hermes-deck-future-proposals](./hermes-deck-future-proposals.md)。

---

## 一、展示核心：不是"lythoskill 能做什么"，是"你的 Hermes 实例已经需要这个"

Hermes 用户真实在做的三件事（来自社区一线报告）：

1. **PM 自动化**（Userorbit skill）：daily feedback triage + weekly roadmap review + release changelog
2. **SRE 监控**（hermes-incident-commander + cron）：每 5 分钟检查生产服务
3. **Self-evolution**（hermes-skill-factory + self-evolution）：自动生成、优化 skills

这三个场景的共同点：**skill 数量随时间线性增长，但 context window 固定**。

展示的核心是：用 lythoskill 已有的真实机制，让一个"已经装了 15+ skills 的 Hermes 实例"恢复可控。

---

## 二、全真技能清单

### lythoskill 自有技能（9个，全部真实存在于 skills/ 目录）

| Skill | 在本次展示中的角色 |
|-------|-------------------|
| `lythoskill-deck` | 治理核心 —— deny-by-default、max_cards、transient |
| `lythoskill-arena` | 对比评测 —— 有治理 vs 无治理的 Pareto 对比 |
| `lythoskill-creator` | 脚手架 —— 如果现场需要新增 skill，用 creator 生成 thin-skill 模板 |
| `lythoskill-curator` | 索引 —— 扫描 cold pool，生成 REGISTRY.json |
| `lythoskill-coach` | 质量审查 —— 检查 Hermes 自动生成的 skill 是否符合 agentskills.io |
| `lythoskill-project-cortex` | 治理文档 —— 用 ADR 记录"为什么这个 deck 这样配置" |
| `lythoskill-project-scribe` | Session 记录 —— 展示结束后 dump 关键决策到 daily journal |
| `lythoskill-red-green-release` | 发布工作流 —— 展示 skill 变体的 approve/reject/rollback |
| `lythoskill-hello-world` | 最小示例 —— 验证"零脚本 skill 也能被 deck 正确管理" |

### Hermes 生态真实技能（社区项目，全部可 clone）

| Skill | 来源 | Stars | 在展示中的角色 |
|-------|------|-------|---------------|
| `userorbit` | Userorbit 官方 | 未公开 | PM workflow 核心 |
| `hermes-skill-factory` | Romanescu11 | 178 | 模拟"自动生成了 3 个新 skills" |
| `hermes-incident-commander` | Lethe044 | 未公开 | SRE cron 场景 |
| `wondelai/skills` | wondelai | 752 | 跨平台 skills 库，代表"从 Hub 批量安装" |

---

## 三、真实场景设计（三个 treatment）

### Treatment A：PM 团队的 Daily/Weekly/Release 节奏切换

**用户画像**：产品经理，Hermes 实例装有 Userorbit + Slack + GitHub + 3 个内部 skills + skill-factory 上周自动生成了 2 个 skills = **8 个 skills**

**真实痛点**：
- 早上做 feedback triage 时，GitHub skill 的 trigger 被误激活（因为 description 里有 "review" 关键词，和 feedback review 重叠）
- 下午做 release changelog 时，Slack skill 被误激活（因为 "send to channel" 的 trigger 太宽泛）
- 晚上 Hermes 变慢，因为 8 个 skills 的 frontmatter 全部在 context 里

**展示步骤**：

```bash
# Step 1: 展示"当前状态"—— 8 个 skills 全部在 ~/.hermes/skills/，全部运行时可见
hermes skills list --all
# 输出: 8 个 skills，包括 2 个 factory-generated 的未命名变体

# Step 2: 用 lythoskill-deck 接管
# skill-deck.toml —— 不是"推荐配置"，是针对这个 PM 的真实分割
cat skill-deck.toml
```

```toml
[deck]
max_cards = 6
cold_pool = "~/.hermes/skills"
working_set = ".claude/skills"

# Daily triage 模式
[innate]
skills = [
  "github.com/lythos-labs/lythoskill/lythoskill-deck"
]

[tool]
skills = [
  "userorbit",
  "slack-notify",
]
```

```bash
# Step 3: deck link 执行
bunx @lythos/skill-deck link

# Step 4: 验证 —— 只有 3 个 skill 在 working set
ls -la .claude/skills/
# 输出: lythoskill-deck -> ~/.hermes/skills/lythoskill-deck
#       userorbit -> ~/.hermes/skills/userorbit
#       slack-notify -> ~/.hermes/skills/slack-notify
#       GitHub skill 不在（没有被声明）

# Step 5: 验证 lock 文件
cat skill-deck.lock | jq '.constraints'
# 输出: { total_cards: 3, max_cards: 6, within_budget: true }
```

**切换 Release 模式**：

> 🚧 **设计提案**：未来支持 side deck 一键切换（见 [未来提案 §side-deck](./hermes-deck-future-proposals.md)）。
> **当前替代方案**：维护多个 deck 文件，用 `--deck` 参数切换。

```bash
# 当前版本：维护独立的 deck-release.toml
cat deck-release.toml
```

```toml
[deck]
max_cards = 6
cold_pool = "~/.hermes/skills"
working_set = ".claude/skills"

[innate]
skills = [
  "github.com/lythos-labs/lythoskill/lythoskill-deck"
]

[tool]
skills = [
  "userorbit",
  "github-release-notes",
]
```

```bash
bunx @lythos/skill-deck link --deck ./deck-release.toml
```

**Checkpoint（可观测）**：
- `.claude/skills/` 只包含声明的 skills，且全是 symlink
- `skill-deck.lock` 记录 hash 和类型
- `hermes skills list --all`（在 Hermes 视角）只看到 3 个 skills，context 开销从 ~2.4k tokens 降到 ~900 tokens

---

### Treatment B：SRE Fleet 的实例间 skill 复现

**用户画像**：运维团队，3 台 Hermes 实例分别负责监控、告警响应、事后复盘

**真实痛点**：
- 实例 A 装了 incident-commander + monitoring + alerting skills
- 实例 B 需要装一样的，但团队成员手动装时漏了一个 skill
- 实例 C 多装了一个实验性 skill，导致告警时 behavior 不一致

**展示步骤**：

```bash
# Step 1: 实例 A 的 deck.toml 就是"基础设施的声明式清单"
cat sre-monitoring-deck.toml
```

```toml
[deck]
max_cards = 8

[innate]
skills = [
  "github.com/lythos-labs/lythoskill/lythoskill-deck",
  "github.com/lythos-labs/lythoskill/lythoskill-arena",
]

[tool]
skills = [
  "hermes-incident-commander",
  "monitoring-dashboard",
  "alert-routing",
  "runbook-executor",
]
```

```bash
# Step 2: 团队复现——复制 deck.toml + lock 到实例 B
cp sre-monitoring-deck.toml instance-b/
cd instance-b && bunx @lythos/skill-deck link

# Step 3: 验证 —— 实例 B 的 working set 与实例 A 完全一致
# 注意：lock 文件中的 generated_at 和 linked_at 包含时间戳，对比时需过滤
diff <(cat instance-a/skill-deck.lock | jq 'del(.generated_at, .skills[].linked_at)') \
     <(cat instance-b/skill-deck.lock | jq 'del(.generated_at, .skills[].linked_at)')
# 输出: 无差异（cold pool 内容相同时）
```

**Checkpoint（可观测）**：
- `skill-deck.lock` 的 `content_hash` 跨实例一致（过滤时间戳后）
- `deck link` 后 `.claude/skills/` 的 symlink 集合一致
- 不需要手动 `hermes skills install` 一个个装，不需要记忆"这个实例装了哪些"

---

### Treatment C：Regression Patch 的自动退役

**用户画像**：装了 hermes-skill-factory 的高级用户，GEPA 自动优化了现有 skills

**真实痛点**：
- factory 生成了 `deploy-v2`，优化了部署流程
- 但 v2 在特定场景下有个 regression：执行后遗留临时文件在 `/tmp/hermes-build/`
- 用户以往的做法：要么 disable 整个 deploy-v2 回退到 v1，要么手动修改 deploy-v2 的内容
- 前者损失 v2 的优化收益，后者破坏可复现性且会被 GEPA 下一轮覆盖

**展示步骤**：

```bash
# Step 1: 展示"当前状态"—— deploy-v2 在 tool 中正常工作，但已知有 regression
ls ~/.hermes/skills/ | grep deploy
# 输出: deploy-v1, deploy-v2

cat skill-deck.toml
```

```toml
[deck]
max_cards = 10

[tool]
skills = [
  "github.com/lythos-labs/lythoskill/lythoskill-deck",
  "deploy-v2",
]
```

```bash
# Step 2: 写一个极薄的 transient patch，只覆盖 regression 场景
# patch 不是"候选 skill 试用"，而是"已知 bug 的临时 workaround"
mkdir -p ./patches/deploy-v2-cleanup
cat > ./patches/deploy-v2-cleanup/SKILL.md << 'SKILL'
---
name: deploy-v2-cleanup-patch
type: standard
description: |
  After deploy-v2 completes, check for leftover temp files in
  /tmp/hermes-build/ and remove them. Temporary workaround for
  deploy-v2 regression #42. Do NOT use after 2026-05-15 —
  the fix will be in deploy-v3.
---
# Deploy v2 Cleanup Patch

Always run this immediately after any `deploy-v2` invocation:

```bash
rm -f /tmp/hermes-build/*
```
SKILL

# Step 3: 把 patch 加入 deck 作为 transient
cat >> skill-deck.toml << 'TOML'

[transient.deploy-v2-cleanup-patch]
path = "./patches/deploy-v2-cleanup"
expires = "2026-05-15"
TOML
```

```bash
# Step 4: link 生效
bunx @lythos/skill-deck link

# Step 5: 验证 working set
cat skill-deck.lock | jq '.skills[] | {name, type, expires}'
# 输出:
# { "name": "lythoskill-deck", "type": "tool", "expires": null }
# { "name": "deploy-v2", "type": "tool", "expires": null }
# { "name": "deploy-v2-cleanup-patch", "type": "transient", "expires": "2026-05-15" }
```

**过期处理**：

> **当前版本**：transient 过期时 `deck link` 输出警告（⚠️ Expired / ⏰ Expiring soon），用户手动编辑 toml 移除后重新 link。
>
> 🚧 **ADR-20260501160000000 Phase 3 已设计**：过期 transient 自动从 working set 移除（不修改 toml，只移除 symlink）。尚未实现。

```bash
# 假设 2026-05-15 已过，运行 link
bunx @lythos/skill-deck link
# 当前输出:
# ⚠️  Expired: deploy-v2-cleanup-patch (expires 2026-05-15) — evaluate if still needed

# 用户确认 factory 已发布 v3 修复后，手动移除 transient 条目
# 编辑 skill-deck.toml，删除 [transient.deploy-v2-cleanup-patch] 节
bunx @lythos/skill-deck link
# deploy-v2-cleanup-patch 的 symlink 被移除（deny-by-default）
```

**如果 patch 反复被需要**：

这是关键信号——deploy skill 本身需要更根本的修复。此时不应延长 transient 的过期时间，而应该：
1. 把 cleanup 逻辑 hardened 到 deploy skill 的 package 中（更新上游 skill）
2. 或者把 patch 提取为独立的 thin skill package，从 `path` 转为 cold pool 中的正式 skill

**Checkpoint（可观测）**：
- `./patches/deploy-v2-cleanup/SKILL.md` < 50 行，极薄
- `skill-deck.lock` 记录 transient 的 `expires` 和 `linked_at`
- 过期 warning 提供审计轨迹："这个 workaround 存在多久了？"
- 无需 `hermes skills delete`，因为 deny-by-default 已经保证未声明 skill 不在 working set

---

## 四、展示的输出物

### 4.1 可运行脚本

```bash
# 一键运行全部三个 treatment（仅包含当前已发布能力）
bun scripts/hermes-governance-showcase/run-all.ts
```

输出目录：
```
tmp/hermes-showcase/
├── treatment-a-pm-rhythm/
│   ├── skill-deck.toml
│   ├── skill-deck.lock
│   ├── deck-release.toml      # Release 模式独立 deck
│   ├── .claude/skills/         # 治理后的 working set
│   └── report.md              # 治理前后对比
├── treatment-b-sre-fleet/
│   ├── instance-a/
│   ├── instance-b/
│   └── diff-report.md         # 跨实例一致性验证（过滤时间戳）
└── treatment-c-evolution-gate/
    ├── skill-deck.toml
    ├── patches/               # 本地 transient workaround 目录
    │   └── deploy-v2-cleanup/
    │       └── SKILL.md
    ├── arena.json             # deploy-v2 vs v1 Pareto 评分（可选）
    └── report.md              # patch 生命周期记录
```

### 4.2 社区投稿材料

**awesome-hermes-agent PR**：
```markdown
- **[lythoskill](https://github.com/Caltara/lythoskill)** — Declarative skill deck governance for Hermes Agent.
  Manages real-world skill stacks like PM automation (Userorbit + Slack + GitHub),
  SRE fleet replication, and self-evolution regression patches via `transient` TTL.
  Showcases: [tmp/hermes-showcase/](./tmp/hermes-showcase/)
```

**Hermes Atlas Issue**：
引用 Treatment C 的 `skill-deck.lock` 中的 transient 过期记录，证明"GEPA 产生的 skill regression 可以通过 lythoskill-deck 的 transient workaround 机制被追踪和退役"。

---

## 五、关键原则回顾

| 原则 | 本次设计的执行 |
|------|--------------|
| 全真技能 | lythoskill 9 个自有 skills + Hermes 社区 4 个真实项目 |
| 真实场景 | Userorbit PM workflow、SRE Fleet、GEPA regression patch 管理 |
| 不复现抽象示例 | 没有 Flask API，没有 "写一个函数"，全部是运营代理的真实工作 |
| 可观测 | 每个 treatment 有明确的 filesystem checkpoint + lock 文件 + arena report |
| 可复现 | `run-all.ts` 一键执行，输出标准化目录结构 |
| **诚实标注** | 🚧 标注未来能力，当前版本给出替代方案，不虚构已实现功能 |
| **设计意图对齐** | transient 严格作为 workaround（shrink until removable），不作为候选 skill 试用槽 |
