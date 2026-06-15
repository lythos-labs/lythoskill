---
category: methodology
domain: task-design
since: 2026-06-06
status: accepted
supersedes: ~
related:
  - AGENTS.md § ZK Review Gate
  - AGENTS.md § ZK Validation Pattern (first-class)
  - SKILL.md (lythoskill-project-cortex)
  - cortex/wiki/04-ssot/external-validation-meta-observation.md (external inference — highest validation tier)
summary: |
  Task cards must pass zero-knowledge review (WHAT/WHY/HOW) before
  assignment. Iterative convergence — not one-shot. ZK agents expose
  gaps, not provide truth. The SSOT memory pipeline (externalization /
  compression / zeroing) is the broader framework this fits into.
---

# Zero Knowledge Review (ZK Review)

> 在将任务分配给执行者之前，对 task 描述做零知识 review——假设读者从未接触过本项目。

## WHAT：什么是 ZK Review

ZK Review 是任务设计的强制性前置检查：用一个 **零上下文 agent**（没读过项目、不知道术语、没见过源码）阅读 task card，检查它是否足够自包含让 subagent 独立执行。

**与 ZK Validation 的区别**：
| | ZK Validation | ZK Review |
|---|---|---|
| **对象** | 文档（wiki、ADR、guide） | 任务卡片（task card） |
| **验证什么** | 可读性——读者能否理解 | 可执行性——执行者能否独立完成 |
| **深度** | Level 1 (self-report) / Level 2 (cross-model) | WHAT / WHY / HOW 三维检查 |
| **文档位置** | AGENTS.md "ZK Validation Pattern" | 本文档 + AGENTS.md "ZK Review Gate" |

## WHY：为什么需要 ZK Review

### 自审的盲区

写 task 的人知道 "心里打算做什么"，但 task 描述不一定写出来了。自审无法捕捉：

1. **隐性知识**：你知道 `lpc_excit` 在哪里，但 task 没写——reader 翻代码找定义
2. **默认参数**：你知道 λ 权重该取多少，但 task 没给——executor 不知道从哪开始
3. **范围模糊**：你知道 "多帧联合退火" 的边界，但 task 没说——scope creep
4. **依赖遗漏**：你知道 `pyworld` 是外部依赖，但 task 没注明——集成时踩坑

### 最意外的发现：功能重叠

ZK agent 指出了一个自审无法发现的问题：

> "The old encoder already does some temporal smoothing in `_encode_pcm_tts()`. The task doesn't say whether V2 replaces, extends, or duplicates that logic."

**TASK-5 的「时域平滑」步骤与旧 encoder 的 `_encode_pcm_tts()` 里的 pitch 中值滤波、K 滑动平均功能重叠。我没说明 V2 是复用旧逻辑还是重写。**

这个反馈的价值在于：ZK Review 不仅能发现「缺了什么」，还能发现「哪里可能重复/冲突」——这是自审很难捕捉的，因为自审者知道「我心里打算复用」，但任务描述里没写。

## HOW：操作步骤

```
1. 写 task → 2. 自审 → 3. ZK Review（WHAT/WHY/HOW）→ 4. 补缺口 + 回应 challenge
                                                              ↓
                                          收敛标准: 新 gap < 2 且全部低优
                                                              ↓ 未收敛
                                          fork 同一 agent → 回到 3
```
三轮是合理收敛深度。未收敛 → task 本身设计有问题，回退设计阶段。

### Step 1: 写 task

按 cortex 模板填充：背景与目标、需求详情、技术方案、验收标准。

### Step 2: 自审

自己读一遍，检查：
- [ ] 每个文件路径都给出了绝对或相对路径
- [ ] 每个外部函数调用都标注了签名或来源
- [ ] 每个参数都有建议值或取值范围
- [ ] 范围声明清楚（必达 vs 可选 vs 不做）

### Step 3: ZK Review（迭代收敛，非一次性）

ZK Review 不是一次性活动，而是**收敛过程**。每轮修复后应继续质询，直到满足收敛标准。

找一个未接触过本项目的 agent（或同事），给 ta 只看 task card + AGENTS.md，问三个问题：

| 维度 | 检查问题 | 通过标准 |
|------|---------|---------|
| **WHAT** | 知道要做什么吗？ | 能用自己的话复述任务目标，不产生幻觉 |
| **WHY** | 知道为什么做吗？ | 能说出这个任务解决什么问题、为什么现在做 |
| **HOW** | 知道怎么做吗？ | 能说出要修改哪些文件、怎么改、怎么验证 |

**Fork 语义（关键）**：第二轮开始的 review 应**复用上一轮的 agent context**——fork 同一个 agent session，让它看到上一轮的反馈 + 你的修复 + 你的 challenge 回应。这模拟的是真实答辩：评审者记得之前指出的问题，能判断你的修复是否真正解决了 gap 还是打补丁绕过了。

**Agent 自行判断实现方式**——这里描述的是意图，不是 API 规范：

```
你能 fork 一个之前的 session 继续对话吗？
  ├── 能 → 直接 fork，上下文完整保留，最佳
  ├── 不能但可以 SendMessage 到已有的 agent → 用 SendMessage 追加 review log
  ├── 不能但可以创建 agent + 附加上下文 → 在 prompt 里贴上一轮的全部 review log
  └── 纯无状态 → 创建新 agent，prompt 里贴完整 review log + "你上一轮说了 X，我改了 Y"
```

降级路径都 work——代价是 token 开销递增（每次重新传 review log）。但收敛速度不变：只要 agent 能看到前一轮的 gap list + 你的修复，它就能判断收敛。关键不是 "fork" 这个 API，而是 **agent 必须知道自己审的是第几轮、前面发现了什么**。

**收敛标准**：

> 新 gap 数量 < 2 且全部为低优先级

低优先级 = executor 可以用常识补齐、不阻塞开始工作。高优先级 = executor 会卡住或走错方向。

**收敛深度**：三轮是合理默认值：
- Round 1：暴露大纲层面的缺失（功能、文件、依赖）
- Round 2：暴露细节歧义（参数值、边界条件、重叠检测）
- Round 3：确认收敛——"No significant issues. Tests are adequate."

三轮后如果仍未收敛（连续两轮都有 ≥2 个高优 gap），说明 task 本身的设计有问题——不是描述不清楚，是范围或方案需要重新讨论。此时应该回退到 task 设计阶段，而不是继续追加描述。

### Step 4: 补缺口 + 回应 challenge

根据 ZK Review 反馈，逐条处理：

1. **接受并修复**：gap 确实存在 → 补充到 task card → 进入下一轮 review
2. **challenge 回应**：ZK agent 的建议方向不对（不了解架构约束）→ 在 task 备注中记录为什么不做，下一轮 fork 时附上这段解释
3. **拒绝**：超出 task 范围的请求 → 记录边界判断，不阻塞

关键是 **challenge 回应要显式写入 task card 或 review log**——下一轮 fork 的 agent 读到 "这个 gap 已讨论过，因为 X 原因不做" 就不会重复提。否则每轮都出现相同的 false positive，浪费收敛轮次。

## 四类必补内容

ZK Review 最常暴露的四类缺口：

### 1. 前置知识

```markdown
## 前置知识
- **源码文件**: `packages/voice-engine/src/encoder.ts:142` — `_encode_pcm_tts()` 定义位置
- **关键数据结构**: `PitchFrame { pitch: number[], timestamp: number }` — 输入格式
- **相关 ADR**: ADR-20260601001 — 时域平滑策略选择记录
```

### 2. 接口契约

```markdown
## 接口契约
- **上游输入**: `encode_pcm_tts(frames: PitchFrame[]): SmoothedPitch[]`
- **下游消费者**: `synthesize_pcm()` 直接消费 `SmoothedPitch[]`
- **不修改**: `_encode_pcm_tts()` 的现有行为——V2 是替代品，不是补丁
```

### 3. 基线数据

```markdown
## 基线数据
- **当前平滑参数**: K=5（滑动平均窗口）, 中值滤波窗口=3
- **V2 目标**: K=3~7（可配置）, 退火初始温度=1.0
- **对比基准**: 旧 encoder 在 test_fixture_01.wav 上的 pitch MSE = 0.032
```

### 4. 范围声明

```markdown
## 范围声明
- **必达**: V2 时域平滑函数 + 单元测试（3 个 test fixture）
- **可选**: 自适应 K 值选择（先做固定窗口，效果不够再加）
- **不做**: 频域平滑——那是另一个 task 的范围（TASK-xxx）
- **不做**: 替换旧 encoder——V2 作为独立模块，通过 feature flag 切换
```

## 反馈模板

ZK Review 的产出格式：

| 反馈 | 价值 | 修复 |
|------|------|------|
| `lpc_excit` 在哪里 | 避免翻代码找定义 | 前置知识里加了行号 |
| λ 权重未给 | 退火任务无法开始 | 给了初始建议值 |
| 多帧联合退火范围模糊 | 防止 scope creep | 加了「范围声明」章节 |
| `pyworld` 不在依赖里 | 集成时会踩坑 | TASK-5 里注明需添加 |

## 边界判定：ZK 暴露 gap，不提供真理

ZK agent 的反馈不等于正确——它可能因为缺少上下文而误判。对每条反馈做判断：

```
是否导致 executor 无法独立执行？
  ├── 是 → 补充到 task card
  └── 否 → 记录到备注，不阻塞
       原因: ZK agent 的知识盲区 ≠ task 的缺失
```

- **接受**：executor 确实需要这个信息才能开始工作（文件路径、函数签名、参数默认值）
- **质疑**：ZK agent 建议的方向可能不对（它不了解架构约束）——记录但不直接接受
- **拒绝**：ZK agent 的要求超出 task 范围（要求补充整个系统的文档）——这不是 task 的职责

ZK Review 的目标不是让 task card 完美（对所有人都自明），而是让 task card **对目标 executor agent 足够**（结合 AGENTS.md + 项目知识可执行）。

## ZK Review 的陷阱：Not Even Wrong

> 最危险的 ZK 反馈不是错误的，而是 **"not even wrong"** — ZK agent 完全不理解领域，凭直觉提建议。

### 案例：probe UX task（TASK-20260614125634946）

ZK agent 连续 6 轮 trial 给出 5/10，每次理由不同：
- Round 1: "`--active-only` 缺少 summary line" → 合理，修复了
- Round 2: "`--include-completed-empty-shells` 不可见" → 合理，修复了
- Round 3: "`--active-only` 仍然太空" → 合理，加了 checks list + skipped notice
- Round 4: "mode label 不一致" → 合理，修复了
- Round 5: "中文提示" → 合理，修复了
- Round 6: "`--active-only` 名称 misleading" → **Not even wrong**

**问题**：ZK agent 不知道 `--active-only` 是 ADR-20260519165746212 决策的正式名称，不知道它从 `--suspicious` rename 的历史。它凭直觉说"这个名字不好"，但没有任何文档证据支持。

**更深层问题**：ZK agent 不理解 probe 是 cortex 的 drift detection 工具，不理解 `--active-only` 是"quick scan"而 default 是"full check"。它同时抱怨"default 太长"和"`--active-only` 太短"——这是矛盾的期望，说明它没理解设计意图。

### 如何避免 Not Even Wrong

**Task card 设计者必须**：
1. **在 ZK prompt 中明确要求 agent 先读 glossary / 设计意图**
2. **定义评分维度**，防止 agent 凭直觉打分
3. **要求 agent 引用文档证据**，不接受"我觉得"式的反馈
4. **识别矛盾反馈**（同时说 A 和 非 A）→ 说明 agent 没理解领域

**ZK agent 的合格标准**：
- 能复述工具的设计意图（不是背文档，是用自己的话解释）
- 能区分"文档描述的意图" vs "个人偏好"
- 能识别自己不理解的部分（"我不确定这里的设计意图"）而不是瞎猜

## ZK Review 在 Lythoskill 中的位置

```
Task 设计流程:
  cortex task "title"
    → 填模板（背景/需求/方案/验收）
    → 自审（4 类必补内容）
    → ZK Review（子 agent 读 task + AGENTS.md）
    → 补缺口
    → cortex start TASK-xxx（分配执行）
```

**关键改进**：ZK Review 的 prompt 必须包含：
1. 评分维度（不是"rate 1-10"，而是"按 X/Y/Z 维度打分"）
2. 领域上下文（"这个工具是为了解决什么问题"）
3. 证据要求（"引用文档中矛盾的地方作为证据"）
4. 矛盾检测（"如果你同时建议 A 和非 A，说明你没理解"）

- **AGENTS.md "ZK Review Gate"**：操作框架 + 边界的入口
- **本文档（references/zk-review.md）**：完整方法论 + 案例 + 模板
- **cortex SKILL.md**：trigger keywords（"ZK review" / "零知识审查" 等）

---

# SSOT 记忆管线：三轴模型

> Agent 没有跨 session 记忆。项目的记忆基础设施是三条互补轴线，不是一条。

```
                         ┌─────────────────────────────────┐
                         │      AGENT 每次 SESSION 启动      │
                         │      零上下文，只有 system prompt  │
                         └──────────────┬──────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
    ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
    │   记忆外化        │      │   记忆压缩        │      │   记忆清零        │
    │   写下来           │      │   蒸馏到刚好够     │      │   利用空白状态     │
    ├─────────────────┤      ├─────────────────┤      ├─────────────────┤
    │                 │      │                 │      │                 │
    │ cortex task/adr │      │ daily ground    │      │ ZK Review       │
    │   (结构化决策)    │      │   truth         │      │   (任务可执行性)  │
    │                 │      │   (覆盖,不追加)   │      │                 │
    │ plan-extract    │      │                 │      │ ZK audit        │
    │   test          │      │ weekly          │      │   (测试充分性)    │
    │   (可验证记忆)    │      │   core_thread    │      │                 │
    │                 │      │   (模式提取)      │      │ ZK validation   │
    │ wiki/ssot docs  │      │                 │      │   (文档可读性)    │
    │   (元认知/框架)   │      │ reference doc   │      │                 │
    │                 │      │   (按需加载)      │      │                 │
    │                 │      │                 │      │                 │
    └────────┬────────┘      └────────┬────────┘      └────────┬────────┘
             │                        │                        │
             ▼                        ▼                        ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                     SSOT（不是数据库，是导航系统）                    │
    │                                                                 │
    │   git + filesystem = territory（地盘，总能查到）                    │
    │   SSOT = compass（指南针，告诉你什么重要、为什么、下一步去哪）         │
    │                                                                 │
    │   永远不写入 SSOT 的内容：                                          │
    │   ❌ git log 能恢复的 → 让 git 管                                  │
    │   ❌ ls/cat 能看到的 → 文件系统是地盘                                │
    │   ❌ diff 能发现的 → git diff 是实时索引                             │
    │   ❌ grep 能搜到的 → 代码即真相                                     │
    └─────────────────────────────────────────────────────────────────┘
```

## 各层职责边界

```
Session 对话（原始流，结束后消失）
  │
  ├── 有 task/adr/epic 载体 → 写入对应 carrier（任务描述、ADR body、epic 需求）
  │
  └── 无载体,但下一个 agent 需要 → daily scribe（session context dump）
        │                         • 坑（pitfall）
        │                         • 决策（为什么选 A 不选 B，但不够格做 ADR）
        │                         • 工作树异常（改了但没提交的文件及意图）
        │                         • 下一步（不是 "test it"，是 "先改 path-guard.ts:45"）
        │                         • 临时产物（位置 + 用途 + 是否可删）
        │
        ▼
  daily/YYYY-MM-DD.md ←── onboarding 的 Layer 2
        │
        │ 每周提取模式（不重复 git log,不重复 cortex INDEX）
        ▼
  weekly/YYYY-WXX.md   ←── core_thread + quest DAG + anomalies
        │
        │ 不定期: 模式稳定后固化到 SSOT
        ▼
  cortex/wiki/04-ssot/ ←── 元认知 / 框架 / 惯例 / 关键决策
```

## 判断标准：这东西该写在哪？

| 问自己 | 如果 Yes | 如果 No |
|--------|---------|---------|
| 能不能 `git log` 查到？ | ❌ 不写 | ↓ |
| 能不能 `ls`/`cat` 看到？ | ❌ 不写 | ↓ |
| 有没有 task/adr/epic 做载体？ | → 写到那个 carrier | ↓ |
| 下一个 agent 会不会踩同一个坑？ | → daily scribe | ❌ 不写 |
| 是不是跨 session 的重复模式？ | → weekly | → daily scribe |
| 是不是框架/元认知/方法论层？ | → SSOT wiki | → daily scribe |
