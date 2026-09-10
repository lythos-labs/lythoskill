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

## 两段闸门：先审计划，再审实现（以终为始）

ZK Review 不是一个时点，也不只一个对象。可复用的形态是**两段闸门**，中间隔着执行：

```
写计划(task card + ADR 规格表) ─► 【计划闸】零上下文 agent：WHAT/WHY/HOW + 拿真实输入去打规格的洞
                                      │ 收敛(<2 HIGH)才允许执行
                                      ▼
                                  执行(IO：改代码 / 改数据 / 不可逆动作)
                                      │
                                      ▼
                                  【实现闸】另一个零上下文 agent：逐条对照**规格**、跑变异、报查不到的
                                      │
                                      ▼ 收敛才允许 ship
```

**为什么闸门加在计划这一侧（plan/IO 分离在治理层的应用）**：计划是**纯的** —— 改一句话成本是零，
被推翻也只是重写一段；执行是 **IO** —— 代价是一张卡重做、一份数据被写坏、一个已推送的 commit。
把门禁放在纯的那一侧，是这套分离在**治理层**的同一招：**能在纸上打掉的洞，不要在磁盘上打一遍再发现。**

「**以终为始**」在这里是具体机制而非态度：先写下来的**规格表 / judge 判据**，就是实现闸的对照物。
所以写计划时要把"做完怎么算对"先钉成可数的条目（每条带判据与验证方式），而不是留一句意图 ——
一句意图给评审者**无从反对**：没有选项可推、没有被拒方案可质疑。

### 载体分层（谁承载什么，别互相顶替）

| 载体 | 承载 | 不该承载 |
|---|---|---|
| **ADR** | 决策：选项、被拒方案、规格表 | 计划步骤、进度 |
| **task card** | 计划：需求、验收、取证、进度 | 决策（只引用 ADR —— `AGENTS.md § Decision Records`） |
| **review log** | 门禁证据：第几轮、gap 清单、作者的处置 | 结论摘要（它要被下一轮**继承**，不是被总结） |
| **产出目录 / `showcase/`** | 可复跑的产物与外部证据 | 只在 `/tmp` 活着的唯一副本 |

### 从实战里长出来的六条（每条都有代价作证）

1. **审规格，不审代码注释。** 实现闸的对照物是**写代码之前**定下的规格表，不是代码里的自述。
   两者不一致时先判断**哪个是 normative** 再动手 —— 否则会照着 bug 的注释把 bug 修成"符合注释"。
2. **每条修复必须被变异钉住。** 判据只有一条：**把修复改回去，要有某个具体测试变红。**
   没有红的 = 没修（或没测）。有代价作证：一轮里三条"修复"是摆设 —— 一条是**死代码**（条件永不成立）、
   一条把判据**换了个方向错**、一条**根本没有判别性测试**。三条都通过了人眼审读。
3. **枚举形状 ≠ 关闭类别。** 形态会一层层长：数组 → 内联表 → 点号键 → 家族**内部**的形状。
   靠"把形状列全"永远差一层；真正的收口是**结构性护栏**（例：写之前把结果重新解析一遍，不 parse 就不写），
   把判断交给机器，而不是交给枚举者的想象力。
4. **护栏有自己的边界，必须写出来。** 同一件事的另一面：结果护栏拦的是"**非法**"，不是"**合法但错**"——
   越界剪出来的文件往往仍能解析，所以它救不了越界。**不写边界的护栏会被当成万能的。**
5. **查不到就说查不到。** 沉默在读者眼里等于"查过且没问题"。没验的、验不了的、被工具限制验不了的，
   逐条写出来 —— 这与"落盘"是同一立场：让下一位知道**确切的空白**在哪。
6. **评审者报自己的副作用；作者不要信它报的数 —— 反之亦然。** 评审会碰真实环境（实测中它留下过一个
   空目录，自己交代了）；它的计数若没有随提交落盘的载体，**自己跑一遍**再采信。反过来，作者的计数
   （变异次数、通过数）若无可复现载体，评审者也应自己跑 —— 实测里作者的**变异 harness 自己说谎过**
   （报"没有任何测试抓得住"，手动重跑同一变异是 5 红）。

### 第三段：测试闸（**原则已立，机制待试**）

计划闸与实现闸之外，**测试用例本身是第三个评审对象** —— 它最容易被漏掉，因为"测试都绿了"看起来
就是做完了。原则（owner 2026-09-10）：

> 「测试用例本身可以用**有专家知识/角色的 side deck** 审核也是。**有项目知识也行，但是不认为代码是
> 自己写的**」

- **允许**：项目知识（熟悉本仓约定能让评审更准）。
- **禁止**：作者身份 —— 评审者不能把被测代码当"自己写的"。这条不是礼貌问题：本仓已记录过的形态是
  *「测试与实现出自同一处理解时，测试不是独立的第二意见，是同一处理理解的第二份抄写」*。
- **本轮实证**：作者给自己的每条修复写的测试，在"把修复改回去"的变异下一片绿（三条修复实为摆设）；
  而**没写这段代码的**评审者用同一批变异，一轮就点出三条。**作者身份是判别力的敌人，不是能力的敌人。**

**机制形态（未验证，勿当既有做法照搬）**：把评审者做成一个 **side deck**（deck 本来就是本项目的
"角色 + 知识"载体）—— 例如以 `lythoskill-sober`（质询）/ `lythoskill-coach`（规则）/ `tdd` +
`lythoskill-red-green-release`（红绿）组合出一个"测试评审者"角色;进一步可以走 **inbox/outbox 的
实时 PK**：一方写红、一方让它绿，逐轮对打（这类"不断追问"的驱动可以借 matt 的 `grill-me` 一类 skill）。
**它是否取代还是补充上面按轮收敛的形态、以及哪套 side deck 组合有效，都还没有实测** ——
所以本节只立原则，机制登记为待试（见 `TASK` 卡，不要在本节里当成已验证的流程）。

### 收敛与折入

- **收敛判据**：新 gap < 2 且全部低优先级（本文档既有标准）。计划闸与实现闸**各自**收敛。
- **跨轮继承**：第二轮起 **fork 同一个 agent**（或把上一轮 gap 清单 + 我的处置贴进 prompt）——
  它记得上轮指出的问题，才能判断"修复是真解决了还是绕过去了"。这就是 review log 必须**逐字留档**的原因：
  它承载"第几轮、前面发现了什么"，不是给人看的总结。**不要润色、不要合并、不要删掉后来被证伪的条目**。
- **折入纪律**：收敛之后又改的每一笔都是**非空 diff** —— 要么对 delta 再送一次审，要么在卡面显式标注
  「折后未评」并写明 delta 范围与旧结论覆盖到哪个 commit（`ADR-20260910113730375`）。

**实盘案例（学这套模式最快的入口）**：`showcase/2026-09-10-zk-reviews/` —— 一轮计划闸
（3 HIGH → 1 → 0）＋ 一轮实现闸（4 → 4 → 1 → 1 → 1 → 0）的**全部 review log 逐字留档**，
含作者对每条 gap 的处置（接受 / 质疑 / 记边界）。读它比读本节有用：**你能看到 HIGH 长什么样、
修复是怎么被证伪的、以及哪些"修复"其实是摆设。** 本文档只描述意图与判据，不提供 prompt 模板 ——
照着抄的模板会绕过判断，而这一整套的价值恰恰在判断上（见 §边界判定）。

## 评审对象必须 commit-pinned（折入 ≠ 已评）

**规则（ADR-20260910113730375）**：评审结论**绑定它被评的那个 commit**。
折入 commit ≠ 被评状态。评分后被修改的对象，若折叠进来的 diff **非空**，必须**二选一**：

1. 对 delta 做**第二轮独立评审**；或
2. 在折入 commit message **与**卡面**显式标注「折后未评」**，并写明 **delta 范围**
   与**旧结论覆盖到哪个 commit**。

只写「折后未评」四个字**不算标注**——必须写清 delta 范围，否则读者无法判断差异大小。

### 为什么要写下来：「只覆盖到哪个 commit」不写就会被默认

事故（`TASK-20260909155425926`，2026-09-09）：ZK 打了 `8.5/10`，对象是 `c8ebcc76`；
**同一 session** 随后折入 5 条 findings（`2686e0d4`，6 文件 / +56 / −8）。
卡面引用 `8.5 PASS` 作为凭证——而折后状态**从未被任何第三方看过**，
直到次日的辩论才首次外部审视。折入的 delta 里带进了一条后来被证伪的 claim。

**关键不是"谁折的"。** 同 session 折入是默认路径，禁止它只会让人干脆不开评审。
缺陷在于**折后没有人看，而记录里也没写"没人看"**——于是 `8.5` 被读成
"当前状态 8.5"。**一句话的覆盖范围声明，决定了整条证据链是否还有指称。**

### claims-not-scores：报断言，不报分数

| 不要 | 要 |
|---|---|
| `ZK 8.5/10 PASS` | `ZK 8.5 @ c8ebcc76`；折入 `2686e0d4` 后**未复评** |
| `5 findings 全折` | `4/5 实折且可查；1 条反噬 —— 软化后的 claim 仍不可考，65b02db7 删除` |
| `213 pass / 0 fail` | `213 pass / 1 skip / 544 expect @ Bun 1.3.11/macOS` |

**分数不可被反对，断言可以。** 分数只提供信心；断言提供一个**可执行的核对动作**。
凡引用分数**必须带对象 sha**，禁止裸报分数。

### 证据卫生

- `decision-log` 的**时间戳不得单独作为时序依据**（实测：文件 mtime 与内部时间戳自相矛盾）。
- 时序断言只接受两类锚：①**逻辑约束**（"折入 commit 引用了评审结论 ⇒ 折入在评审之后"）；
  ②**文件系统锚**（commit 时间戳、文件 mtime）。**多锚冲突时以逻辑约束为准。**
- **自报的测试数不构成复核。** 折入 message 自报 `213 pass / 0 fail`，
  同机独立复跑 = `213 pass / 1 skip / 544 expect`——差异不大，
  但差异的存在本身就说明自报不是复核。

### 适用范围（刻意收窄）

- **适用**：结论为 gate 或评分的场合（ZK Review / ZK audit / ZK validation）。
- **不适用**：同一 session 内的普通编辑、typo、格式化——没有评分对象漂移。
- **折入 diff 为空**（纯 message、纯注释）不触发——规则绑定的是
  "**被评内容变了**"，不是"commit 数变了"。

> ⚠️ **测试全绿 ≠ 折后已评。** 这两件事之间没有任何蕴含关系。

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

### 实现闸的评审者：额外四项要求

审实现的 prompt 里要**明确写死**这四件，否则评审会退化成"读一遍代码说还行"：

1. **逐条对照规格**（把规格表的路径给它，并说明"规格是 normative、代码注释不是"）；
2. **对每条修复跑变异**：改回去 → 报哪个测试变红；没有红的，直接算 finding；
3. **列出查不到的**，以及为什么查不到（工具边界、环境、时间）；
4. **报自己的副作用**：它碰过真实环境的话，把留下的痕迹写出来。

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
