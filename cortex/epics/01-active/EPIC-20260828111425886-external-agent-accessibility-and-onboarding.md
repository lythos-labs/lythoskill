---
lane: main
checklist_completed: false
checklist_skipped_reason: epic created from user directive aggregating external-feedback tasks; checklist N/A at creation
---
# EPIC-20260828111425886: external agent accessibility and onboarding

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> external agent accessibility and onboarding

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-08-28 | Created |

## 背景故事
<!-- ⚠️ REQUIRED: 触发事件、问题描述、目标价值。不填会被 probe 拦截。 -->

触发：2026-08-28 用户转来一份外部 Kimi K3 agent（网络受限沙箱，经 ghfast.top 镜像）提交的 probe 误报报告（mirror probe HEAD 语义 ≠ clone 能力，已本机复现确认）。连同 08-27 的 ZK 外部入驻试验（Level 0 通过、Level 2 命令全灭）和站点命令修复，同一主题反复出现：**不在这个项目内部的 agent（任何宿主、任何网络环境）接触到的信息和上手路径，质量决定项目的外部信用**。

目标价值：外部 agent 的首次接触（读站点 → 装 deck → 跑命令）全链路可用、可验证、报错可行动；外部反馈（issue/试验/报告）有固定的登记-聚合-修复管道。外部 agent 即是用户（见 wiki/03-lessons/2026-08-28-agent-ux-feedback），其反馈是一手 UX 证据。

输入源：
- 外部 K3 agent probe 误报报告（2026-08-27，mirror/HEAD 语义）→ TASK-20260828111354804
- ZK 入驻试验（2026-08-27 上轮 session，curator 假命令等）→ TASK-20260827131734103 / …34189 / …34254
- 本站 UX 对齐（本 session 完成）→ TASK-20260828002450069 (completed)
- 站点命令守卫机械化（防止同类再生）→ TASK-20260828003758156
- 外部 agent 执行环境参考：https://lythoskill-showcase-twy.ok.kimi.link/

## 需求树

### 主题A 外部反馈管道：登记→聚合→修复 #in-progress
- **触发**: 外部 K3 agent 报告 + ZK 入驻试验的发现散落各处，过去按发现时点零散登记，没有主题归属
- **需求**: 外部反馈类任务统一挂到本 epic；新外部反馈（用户转述、showcase、issue）先登记再修
- **实现**: 本 epic + 关联任务表；严重度排序（功能性阻断 > 文档错误 > UX 摩擦）
- **产出**: 每个外部反馈都有任务卡 + 修复 + 验证闭环
- **验证**: probe 无未完成的外部反馈遗留任务

### 主题B 网络受限环境可用性 #backlog
- **触发**: K3 报告——镜像完全可用但 probe 硬门禁 exit(1)，功能性阻断
- **需求**: 探测与执行同一网络栈（git ls-remote 优先）或探测降级为 advisory；4xx ≠ 不可达
- **实现**: TASK-20260828111354804（cold-pool mirror.ts + deck add.ts）
- **产出**: ghfast.top 类镜像环境下 `deck add` 全流程可用
- **验证**: 报告的 head-blocker.py 本地复现脚本作为负测试 fixture；探测假阴性场景下 clone 仍能自证

### 主题C 外部可接触信息的正确性 #backlog
- **触发**: 站点假命令（curator、arena）两次抓到；文档评审抓不出，只有实操能抓
- **需求**: 站点上所有可执行命令与真实 CLI 对齐，且机械化防止再生
- **实现**: TASK-20260828003758156（命令/数字守卫进 CI）
- **产出**: 外部 agent 照站点操作不再踩不存在的命令
- **验证**: 守卫对两个历史 bug（arena --deck-a、curator scan）负测试通过

## 技术决策
<!-- ⚠️ REQUIRED: 关联的 ADR 决策。不填会被 probe 拦截。 -->

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260828004129143 | host-agent handoff as default execution mode | proposed（相关：外部 agent 即 player） |
| ADR-20260828004129233 | player adapter lifecycle policy | proposed（相关：adapter 版本脆弱性同属外部环境问题） |

## 关联任务
<!-- ⚠️ REQUIRED: 子任务列表。不填会被 probe 拦截。 -->

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260828111354804 | backlog | mirror probe 假阴性修复（K3 外部报告，已复现确认） |
| TASK-20260827131734103 | backlog | curator CLI fail-open（ZK 入驻试验发现） |
| TASK-20260827131734189 | backlog | working_set 切换语义（ZK 入驻试验发现） |
| TASK-20260827131734254 | backlog | deck link 重复输出（ZK 入驻试验发现） |
| TASK-20260828003758156 | backlog | 站点命令/数字守卫机械化（防再生） |
| TASK-20260828002450069 | completed | 站点 UX/叙事对齐（arena 假命令修复 + 导航） |

## 经验沉淀
<!-- ⚠️ REQUIRED: 技术洞察、流程改进、避坑指南。不填会被 probe 拦截。 -->

- **"对 HEAD 答 403" ≠ "不能 clone"**：git smart-HTTP 端点不是静态文件托管，探测谓词必须匹配执行路径实际发送的请求（GET info/refs?service=git-upload-pack），更根本的是探测与执行同一网络栈（git ls-remote 即 clone 的第一次握手）。
- **探测没有预测力却有否决权是最差失败模式**：Bun fetch 不认 git 配置（proxy/insteadOf/sslVerify），探测通过不代表能 clone、探测失败不代表不能 clone。硬门禁需要两层独立证据。
- **外部 agent 报告的质量可以很高**：K3 报告含四路对照表、本地复现脚本、根因定位、修复建议——直接可评审。外部反馈管道应视为一级输入源。
- （实施中补充）

## 归档条件
<!-- ⚠️ REQUIRED: 可观测的归档判据。不填会被 probe 拦截。 -->
- [ ] 所有任务完成
- [ ] 验证通过：受限网络 fixture 下 `deck add` 成功；站点守卫在 CI 生效；外部 ZK 复测一轮（照站点 quick-start 全流程）
