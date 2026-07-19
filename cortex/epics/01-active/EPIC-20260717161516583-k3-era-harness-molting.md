---
lane: main
checklist_completed: false
checklist_skipped_reason: direction set by user in session 2026-07-17; details in epic body
---
# EPIC-20260717161516583: k3 era harness molting

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> k3 era harness molting — 蜕皮:抛弃旧皮(弱模型补偿),确认新皮(机械执行 + 实验证明仍必要的文本)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-07-17 | Created |

## 背景故事
<!-- ⚠️ REQUIRED: 触发事件、问题描述、目标价值。不填会被 probe 拦截。 -->

Harness 在 DeepSeek 4 / Kimi K2.6–2.7 时代打磨成型;默认模型已切换到 K3(1M context)。用户给出的框架是**蜕皮**:旧皮 = 弱模型补偿(防御性重复文本、靠模型自觉的 routine);新皮 = 机械化的执行信号 + 经实验证明仍然必要的文本。

催化剂:2026-07-17 session 发现 cold pool 滞后 origin 整整一个月,boot 全流程无感知——onboarding 拿到的是 06-15 的旧 skill 文本("read the **last** one"),而修复("first")07-10 就已入库并 push。完整根因链见 ADR-20260717161516538。当日已手工修复(git checkout + pull + link)。

目标价值:harness 可靠性不再依赖模型记性;harness 文本量与模型实际需要匹配;自举仓库继续走与外部项目一致的 publish→pull 管道(dogfood)。

## 需求树

### 主题A 同步管道机械化 #backlog
- **触发**: 2026-07-17 cold pool 漂移事件(boot 无感知;refresh 自愈缺失;失败输出被 link 输出冲出 tail 视野)
- **需求**: boot 已经在跑的步骤(`deck link`)必须机械暴露 drift;`refresh --exec` 必须自愈脏缓存;失败必须不可错过(非零退出 + 末尾摘要)
- **实现**: packages/lythoskill-deck refresh/link 增强,Intent/Plan/Execute + IO 注入测试
- **产出**: drift 警告输出、自愈日志、失败摘要;AGENTS.md boot 段落从"条件式叮嘱"改为"引用机械信号"
- **验证**: 脏树/落后 fixture 负测试;手工重放:弄脏 cold pool → refresh --exec 自愈并 pull 成功

### 主题B 防御性文本验证与蜕皮 #in-progress
- **触发**: CPTSD 反激励文本(Internal Signals 表、intent-hijack tell-tales、Decision Hygiene、重复 compaction 警告)对强模型可能是死重;但未验证不能删
- **需求**: ZK subagent A/B 实验(当前 AGENTS.md vs 蜕皮变体),场景电池 + 量化指标,pass-by-reference 派发(控制面最小传递)
- **实现**: TASK-20260717161516693(task card 即实验方案)
- **产出**: 实验报告(wiki/03-lessons)+ per-section keep/shed 清单 + 未应用的 AGENTS.md diff
- **验证**: B 臂全部指标 ≈ A 臂 → shed;任一指标退化 → keep

### 主题C AGENTS.md 文本瘦身(依赖 B 结果) #backlog
- **触发**: 主题B 的 shed 清单
- **需求**: 按证据删减 AGENTS.md / skill 文本;模型无关纪律回路(provenance、reconciler 重跑、auth 禁区、probe 验证)不列入蜕皮候选
- **产出**: 用户批准的 diff
- **验证**: 删减后 ZK onboarding 复测不回退

## 技术决策
<!-- ⚠️ REQUIRED: 关联的 ADR 决策。不填会被 probe 拦截。 -->

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260717161516538 | mechanize boot routines and shed dead defensive text for k3 era | accepted |

## 关联任务
<!-- ⚠️ REQUIRED: 子任务列表。不填会被 probe 拦截。 -->

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260717161516624 | backlog | deck refresh 自愈 + boot drift 检测 + 失败不可错过 |
| TASK-20260717161516693 | in-progress | CPTSD 防御文本 ZK A/B 适应实验 |

## 经验沉淀
<!-- ⚠️ REQUIRED: 技术洞察、流程改进、避坑指南。不填会被 probe 拦截。 -->
- 派生状态(cold pool 克隆)被手改 → 对账器(rebase pull)卡死 → 一个月静默 drift。缓存副本永远不该手改;工具应自愈。
- "文档已写" ≠ "会被执行":AGENTS.md 写了修复方法,一个月没人跑。routine 必须挂在已经会被执行的步骤上(boot 的 `deck link`),而不是挂在需要自觉的条件上。
- `refresh --exec` 的失败报告其实响亮(Failed: 12),但报告在前、link 输出在后,tail 视野里失败被冲走——失败信号必须出现在输出的最后一屏。
- (主题A 已验证) TASK-20260717161516624 交付:`deck link` 机械暴露 drift/dirty/branch;`refresh --exec` 自愈脏缓存;失败非零退出 + 末尾 ⚠️ 摘要。现场重放中该警告还当场抓住了执行者自己误在 cold pool 里跑 link 造成的脏树——guard 在第一天就证明了自己。
- (主题B v1 实验 + ZK 复审) v1 实验(4 场景 × 2 臂):v3 草案(-48%)行为无退化成立;但 ZK review 证实方法缺陷(armB 刺激材料含实验前言 = 非盲、污染证实、N=1、未测焦虑螺旋场景),全部 shed 判定撤回为 UNTESTED——CPTSD 表实际被 S4A 逐字引用,是承重的。干净重跑: TASK-20260719015727556。报告 v2: `cortex/wiki/03-lessons/2026-07-17-agents-md-v3-ab-experiment-compression-safe-reframes-load-bearing.md`。教训:刺激材料永不含实验元数据;"conservative" 要按结论方向论证;实验 raw outputs 必须落盘。

## 归档条件
<!-- ⚠️ REQUIRED: 可观测的归档判据。不填会被 probe 拦截。 -->
- [ ] 所有任务完成
- [ ] 验证通过:boot 能机械暴露 drift(实际演示一次);实验报告落 wiki;AGENTS.md 任何删减经用户批准
