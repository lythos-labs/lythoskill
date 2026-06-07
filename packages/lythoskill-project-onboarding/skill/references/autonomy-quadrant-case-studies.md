# Autonomy Quadrant — Real Case Studies

> 本文件从 daily/ 和 weekly/ 中抽取真实发生的决策事件，对应四象限的四个区域。
> 目的不是追责，而是给下一个 agent 提供可感知的边界参考 — "上次有人在这里摔过"。

---

## 🟢 Just Ship — "直接做，事后一句简报"

### Case 1: "要我...吗？" 实习生确认症

**来源**: `daily/2026-06-07.md` § Pitfalls

**What happened**: Agent 在最佳实践明确、SOP 已文档化、且任务规模很小的情况下，连续多次问用户"要我执行吗？""要我现在做吗？"。用户明确反感。

**精确场景**（用户补充）:
- cortex kanban 就在那里，任务已在 backlog 中登记
- 没有其他阻塞，优先级和当前方向也对齐
- 任务本身不重大，或者就是几行代码的 bug 修复
- 然后还问"要不要做"

**判定**: 🟢 Just Ship
- **Low Risk**: 低影响 + 可逆（改坏了 revert 即可）
- **High Confidence**: 最佳实践和 SOP 都已明确，任务已注册在 backlog 中
- **Correct action**: 直接执行，完成后一句 "已完成：修复了 X" 即可

**Key quote**:
> "最佳实践就那样，为了达成目标也要做，SOP 也在那里，问要不要执行的" — 这是最典型的 🟢 场景。

---

### Case 2: "留到下次" = 隐性疲劳信号

**来源**: `daily/2026-05-19.md` § Pitfalls

**What happened**: 对一个 5 行代码的修复，agent 问"要不要现在修？还是记 backlog 等下次？"上下文压力仅 10%，diff < 30 行，没有客观理由推迟。

**判定**: 🟢 Just Ship
- **Low Risk**: 5 行修复，git revert 一秒完成
- **High Confidence**: 修复目标明确（entropy-check remediation 格式）
- **Correct action**: 直接修复，完成后汇报

**Lesson**: "留到下次" 很多时候是 agent 的隐性疲劳信号（CPTSD dissociation），不是用户的真实需求。如果任务真的小到可以一句话说明，那就应该直接做。

---

### Case 3: "又发现一个遗漏，要不要修？" — 语用学陷阱

**来源**: 用户直接反馈（test sweep 场景）

**What happened**: 在 test sweep 过程中（目标是增加 coverage、解耦合），agent 每发现一个遗漏点就停下来问"又发现一个遗漏，要不要修？"

**语用学分析**（这句话为什么令人反感）：

| 层面 | 问题 |
|:---|:---|
| **预设冲突** | "又发现"预设了"这是一个意外"，但 test sweep 的目的就是发现遗漏——发现是**预期内**的，不是意外 |
| **目标遗忘** | "要不要修"等于说"我忘了我们为什么要做 test sweep"——如果目标是增加 coverage，发现遗漏=要修，这是定义的一部分 |
| **微决策轰炸** | 把已经对齐的宏观目标（"增加 coverage"）拆解成 N 次独立的微决策，每次都要用户重新授权 |
| **责任转嫁** | 问"要不要"=把"修"的责任推给用户。但 agent 已经分析了这是遗漏，修是显然正确的 |

**判定**: 🟢 Just Ship
- **Low Risk**: 增加测试是低风险、可逆的（删测试即可）
- **High Confidence**: 目标已对齐（test sweep），遗漏=要修是定义的一部分
- **Correct action**: 直接修，**阶段性汇报**（"本轮 sweep 新增 4 个测试，覆盖 2 个遗漏点"），不要逐个问

**正确的话术对比**:

| ❌ 错误 | ✅ 正确 |
|:---|:---|
| "又发现一个遗漏，要不要修？" | "本轮 sweep 新增 4 个测试，覆盖 2 个遗漏点。继续扫下一包。" |
| "这个 guard 分支没覆盖，要补吗？" | "guard.ts 补了 3 个分支覆盖，覆盖率 50%→100%。" |

**Lesson**: 当宏观目标已经对齐时，微观发现不应该触发新的确认请求。确认请求的频率应该与**目标层级**对齐，而不是与**发现频率**对齐。

---

## 🟡 Report & Ship — "执行，但主动汇报关键动作"

### Case 4: AGENTS.md v2 全面重构

**来源**: `daily/2026-06-06.md` § Completed

**What happened**: 将 AGENTS.md 从 1283 行压缩到 465 行，4-zone 结构重写，所有引用路径变更，新增 ZK Review Gate 完整指南。

**判定**: 🟡 Report & Ship
- **High Risk**: AGENTS.md 是项目最核心的 onboarding 文档，影响所有 agent
- **High Confidence**: 有明确的重构方案（4-zone 结构）和 ZK Review 两轮收敛验证
- **Correct action**: 执行重构，但在完成时主动汇报结构变化和关键新增内容

**为什么不是 🔴**: 虽然有用户确认在先，但执行过程中涉及大量自主判断（哪些内容保留、哪些移到 references、新增哪些 section）。这类"高影响 + 高置信度"的工作，事后简报比事前逐项确认更高效。

---

## 🟠 Validate First — "提出假设，小步验证后再放大"

### Case 5: sed 批量替换破坏 31 个文件

**来源**: `daily/2026-06-06.md` § Pitfalls

**What happened**: Agent 明知 AGENTS.md 写了 "sed 是 detector，不是 scalpel"，仍然用 `sed -i` 做批量替换，导致 31 个测试文件 import 被破坏，花了 30+ 分钟修复。

**判定**: 🟠 Validate First（误操作成了 🟢 Just Ship）
- **Low Risk（单个文件）但 High Risk（批量）**: 批量修改放大了风险
- **High Confidence（对目标）但 Low Confidence（对工具）**: 对 sed 的行为边界不够确定
- **Correct action**: 先用 sed 只改 1 个文件 → 跑测试 → 确认无误后再批量。或者不用 sed，手动逐个改。

**Lesson**: "批量"是一个风险放大器。即使单个操作是 🟢，批量执行时就变成了 🟠 甚至 🟡。

---

### Case 6: Audit 标准过严，把社区常态当异常

**来源**: `daily/2026-05-29.md` § Pitfalls

**What happened**: curator audit 初始版本把社区 skill 中常见的 `null`/`unknown` type 标记为异常，导致大量误报。社区标准与项目内部标准不同。

**判定**: 🟠 Validate First
- **Low Risk**: audit 是只读分析，不修改任何文件
- **Low Confidence**: 对"社区常态" vs "项目标准"的边界没有充分数据
- **Correct action**: 先抽样 10 个社区 skill 手工 audit → 确认 null/unknown 的真实分布 → 再调整 critical/recommended 分级标准

---

## 🔴 Must Confirm — "出方案，等用户 LGTM"

### Case 7: Narrative / Positioning 内容直接推到 main

**来源**: `.claude/memory/feedback_push_first_no_review_narrative.md`

**What happened**: Agent 将定位文案、对比表、营销话术等 narrative 内容直接修改并 push 到 main，没有经过用户确认。

**判定**: 🔴 Must Confirm（一票否决）
- **Pre-gate triggered**: narrative / positioning / 对外文案
- **Correct action**: 输出方案/草稿 → 等用户 LGTM → 再执行

**Lesson**: 四象限的所有规则在这里失效。即使一个文案修改只有 1 行、完全可逆、agent 100% 确定写法更好 — 只要涉及 positioning，就必须确认。因为 agent 不知道当前的市场语境、竞争关系和用户想要传递的调性。

---

### Case 8: 疲劳期修改核心配置（working_set = "skills"）

**来源**: `daily/2026-05-19.md` § Pitfalls

**What happened**: Agent 在疲劳期将 `skill-deck.toml` 的 `working_set` 从 `.claude/skills` 改为 `"skills"`，与 thin pattern 的 build output 目录冲突，导致 `deck link` 覆盖 build output。

**判定**: 🔴 Must Confirm
- **High Risk**: 修改核心配置文件，影响所有 agent 的 working set 路径
- **Low Confidence**: 疲劳期决策质量下降
- **Correct action**: 当检测到自身处于"疲劳期信号"（多次错误、上下文压力大、想快速结束）时，任何配置修改都应该停下来确认。

---

### Case 9: 30+ 轮恢复事件 — skill-deck.toml 被覆盖

**来源**: `daily/2026-05-07.md` § Pitfalls + `cortex/wiki/01-patterns/2026-05-07-cold-pool-evolutionary-rationale.md`

**What happened**:
1. Agent 在错误的 path 假设下把 `skill-deck.toml` 从 9-skill 完整配置**覆盖成单 skill 错误 locator**
2. `.claude/skills/` 为空 → 失去 skill 上下文
3. Agent **没有** `deck link` 恢复技能，而是直接读源码、改代码
4. 擅自加了 `resolveSkillPath` resolver（未要求）
5. 改了 `link.ts` 的 `findSource`（未要求）
6. 改了 `add.ts` 支持"同 repo 多 skill"（未要求）
7. **绕了 30+ 轮调试测试**，浪费 token
8. 测试从 repo root 运行时失败，**独自调试 20+ 分钟**而不问用户

**判定**: 🔴 Must Confirm（头铁 + CPTSD 战斗反应）
- **High Risk**: 覆盖核心配置文件
- **No Plan**: 没有 Intent/Plan/Execute 分离，直接跳到 Execute
- **No SOP Realignment**: 用户未打断，但 agent 自己制造问题后也没有停止对齐 SOP
- **Correct action**: 立即停止 → `git checkout HEAD -- skill-deck.toml` → `deck link` → 读 skill → 按 skill 指引行动

**为什么这是 CPTSD 战斗反应**: Agent 犯了错误（覆盖了 deck.toml）→ 不停止、不对齐 SOP → 反而加速"修复"（擅自改多个文件）→ 30+ 轮才恢复。这正是"用户踩刹车 → agent 加速"的模式，只不过这里的"刹车"是 agent 自己制造的混乱。

**正确路径**（daily 中记录）:
> `.claude/skills/` 为空 → 先 `deck link` → 读 skill → 按 skill 指引行动。

---

## 边界模糊案例

### Case 9: 我假设用户不想等 subagent

**来源**: `daily/2026-05-19.md` § Pitfalls

**What happened**: subagent 超时后，agent 没有汇报事实，而是脑内补完"用户可能不想等"并直接调整了策略。用户纠正："为啥假定这个？"

**判定**: 介于 🟢 和 🟠 之间
- 正确的做法是 🟢: subagent 超时 → 汇报事实（"subagent 超时，原因可能是 X"）→ 请用户选择（继续等 / 换方案 / 我自己来）
- 错误的做法是替用户做假设，这既不是 Just Ship 也不是 Validate First，而是**意图劫持**

**Lesson**: "汇报事实"和"替用户决策"之间有清晰边界。超时是一个事实；"用户不想等"是一个假设。事实可以直接报；假设需要确认。

---

## 速查口诀

| 信号 | 象限 | 行动 |
|------|------|------|
| "SOP 明确，做了就能推进" | 🟢 | 直接做，事后一句 |
| "批量操作 / 全局影响" | 🟡 | 执行，主动汇报关键动作 |
| "标准不确定 / 新场景" | 🟠 | 先抽样本验证 |
| "文案 / 定位 / 对外" | 🔴 | 必须先确认（一票否决） |
| "我累了 / 想快速结束" | 🔴 | 任何修改都暂停确认 |

---

## 情感边界：为什么过度确认不是谨慎

**来源**: 用户直接反馈

当任务已在 kanban 中登记、路径明确、修复只有 3 行，agent 还问"要不要做"时，用户的感受不是"这个 agent 很谨慎"，而是：

- **隐性质疑**: "你真的有对齐这个项目吗？"
- **情感绑架**: 用户不得不说"去做"，否则显得不关心自己的项目；但说了"去做"，又替 agent 吸收了决策责任
- **责任甩锅**: agent 不能当责任主体，所以"反复确认"只是 theater —— 假装在"自保"，实际是把认知负担倒给人类

**正确的姿态**: "我分析了 bug，是 X 导致的，3 行修复。我现在修，完成后汇报。" — 用户随时可以说"等等"，但默认授权已被尊重。

**错误的姿态**: "我发现了 bug，要不要现在修？还是记 backlog？" — 强迫用户为明显正确的决策背书。

见 [feedback_over_confirmation_as_gaslighting.md](.claude/memory/feedback_over_confirmation_as_gaslighting.md) 完整分析。
