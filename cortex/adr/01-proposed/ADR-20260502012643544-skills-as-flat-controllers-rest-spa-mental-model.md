# ADR-20260502012643544: Skills as Flat Controllers — 多作者共存约束下的去中心化 skill mesh

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-02 | Follow-up to ADR-20260423101938000 (Thin Skill Pattern, accepted) |

## Context

ADR-20260423101938000 (Thin Skill Pattern, accepted) 用 Spring 类比建立了「skill = 控制器，npm/pip = 服务，starter = Spring Boot Starter」三层结构。半年使用下来反复观察到两类 failure mode：

### Failure Mode 1: 0-deps-0-install 误读
> Agent（包括 Claude/Kimi 多次实测）把「lythoskill 0 依赖 0 安装」误读成「需要本地 npm install lythoskill 包」。原因是 SKILL.md 写明了 `bunx @lythos/skill-deck`（agent 调用模式，bunx 自动下载），但 agent 仍倾向于从 npm 包管理的常规心智推理，从而拟出一个不存在的「skill 依赖管理器」需求。

### Failure Mode 2: 反复提出 hub / 中心化 registry / skill 包管理器
> 不写下来时，agent 容易"自己觉得其他更好"——反复提出「为什么不做 hub + 中心化 registry + skill 依赖管理器」类提案。User 已明确表态："我是考虑过的，所以选 Go module 这样靠 github/gitlab/甚至自建域名的更去中心化思维。"

两个 failure mode 共同暴露：**只用 Spring Controller 工程类比不够，需要把心智模型显式写下来**——既是给人类读者，也是给会反复重读 cortex/adr 的 LLM/agent。

### 系统的同构观察

从第一性原理观察，分布式/生成式系统的演化路径有清晰的 pattern：

| 系统 | 原语 | 编排者 | 协作模式 | 多作者性 |
|------|------|--------|---------|---------|
| 企业级微服务 | stateless service | service mesh / orchestrator | API Gateway / BFF | 同公司，弱 |
| 前后端分离 | REST API | SPA | BFF | 同团队，弱 |
| 生成式 UI/UX | 无状态组件（shadcn-style） | LLM 编排器 | 复合组件 | 跨团队，中 |
| **Agent + Skills** | 无状态 skill | Agent | combo | **天然异作者，强** |

四者是同一抽象的不同实例：**编排者在扁平、无状态原语上做一次性组合，状态外置**。前后端分离是这条路径上最早最显眼的分割（把状态/编排上提到 SPA，原语下沉为 REST），Agent + Skills 是同一刀在 LLM 时代的复现。

但 skill 生态有一项**比前三者都强的硬约束——多作者天然共存**：每个 skill 是独立 GitHub repo，作者各异，没有同公司/同团队的内存模型可以共享。在这个约束下：

- 扁平 + 状态外置不是工程优化"选择"，而是**系统能成立的必要条件**
- 企业级微服务可以选择"不那么微"（modulith 风格也合理），skill 没这个奢侈
- 比起企业 service mesh，**skill mesh 更"软"**——没有 sidecar、没有协议绑定、没有强制部署，只是"agent 读 SKILL.md 时激活的心智集合"

因此 TCG（player / deck / combo）反而是**比微服务更精确**的类比：它内置了「卡来自不同卡包/不同作者」的约束，combo 提供的是这个约束下唯一能跑通的灵活性结构。

### 声明即 prompt

进一步观察：**SKILL.md 是 markdown，markdown 是 prompt**。Agent 读 mermaid 不会执行 mermaid，但会按 mermaid workflow 推理；读 schema 不会跑 validator，但会按 schema 约束行为；读 Spring/REST 术语不会启动 Spring，但会激活分布式系统心智。LLM 已经把 Vue3 / REST / Spring / Go module 等 paradigm 内化了，**选择 SKILL.md 的写法 = 选择激活的心智 = 选择 agent 的行为**。

我们不需要实现 Vue3/REST/Spring，我们只需要让 SKILL.md 的语言风格激活 agent 内化的对应 paradigm。

## 决策驱动

1. 阻止 agent 反复推理出「需要重新发明 skill 包管理器」的伪需求（Failure Mode 1+2）
2. 防止重蹈 Maven 早期前端 wrapper（如 frontend-maven-plugin、bower-maven 等）的覆辙——在已有工具上套一层更重的外壳
3. 把 ADR-20260423101938000 的 Spring 类比补全为系统性心智锚点
4. **元层动机**：把已经做出的克制决策**显式记录下来**。如果不写，agent 会复发性提议——这条 ADR 的存在本身就是其论证的一部分

## Options Considered

### Option A: 中心化 hub + registry + skill dep manager — Rejected

引入中心化 skill registry（类似 npm registry），SKILL.md 增加 `dependencies:` 字段，由 deck/curator 自动 resolve 跨 skill 依赖。

- **Pros**: 表面上看更「工程化」；与 npm/pypi 的开发者直觉对齐
- **Cons**:
  - 重新发明 npm/pip：diamond dependency 地狱、版本治理负担、context 膨胀（与 ADR-20260423101938000 Option B 拒绝理由完全相同）
  - **天然不适用于多作者生态**：npm registry 假设上传者愿意接受单一治理；skill 作者分散于 github/gitlab/self-hosted，没有人愿意"上传中心"
  - 与「Go module 式去中心化」立场冲突：Go 选择 `host.tld/owner/repo` 路径作为 module 标识符，正是为了避免中心化 registry——lythoskill 故意复制这个设计
  - 早期 Maven 前端 wrapper（frontend-maven-plugin 等）尝试在已有工具上套一层更重的外壳，被生态淘汰，是直接历史教训

### Option B: 维持 Spring Controller 类比但不补充心智模型 — Rejected
继续依赖 ADR-20260423101938000 的 Spring 类比，让读者自行类推。

- **Pros**: 文档负担最小
- **Cons**: Failure Mode 1+2 实测中反复发生；新加入的贡献者/agent 无法快速定位心智锚点；不写下来的克制决策最终会被复发性提议侵蚀

### Option C: 显式声明 Skills as Flat Controllers，激活 agent 的多 paradigm 心智 — Selected

把心智模型写明，且不止一个类比，让 agent 从多个角度同时锁定行为：

1. **Skill = 扁平 REST 控制器**（工程实现层）
   - 无状态、无 skill-to-skill 依赖、最小契约
   - SKILL.md 只描述「能做什么 + 怎么调用」，不内嵌业务状态

2. **Agent = SPA**（编排层）
   - 任务级状态、激活策略、调用顺序全部在 agent 的 conversation context
   - 不在 skill 层重建状态

3. **Combo = BFF**（协作层）
   - 跨 skill 协作通过 combo skill 显式编排
   - combo 是唯一允许的「超 skill 抽象」

4. **重资产下放到 npm/pip**（依赖治理层）
   - skill 永远不实现自己的包管理器
   - 重 logic / 二进制 / 复杂依赖通过 `bunx`/`npx`/`pipx` 调用——与 Thin Skill Pattern 的 starter 概念完全一致（reaffirm，非创新）

5. **Locator = Go module 风格**（命名层）
   - `host.tld/owner/repo/skill` 作为唯一标识符
   - 没有中心化 registry，github / gitlab / self-hosted 同等公民
   - 见 ADR-20260502012643244 (FQ-only locator)

6. **声明即 prompt**（元规则）
   - SKILL.md 用什么语言/结构 = agent 激活什么心智
   - 鼓励：用 mermaid 描述 workflow、用 schema 描述配置、用 REST 术语描述协作

## Decision

采用 Option C。

声明 lythoskill 的 skill 生态遵循以下五条规则（按优先级）：

1. **多作者天然共存优先**：skill 设计的所有取舍以「不同作者的 skill 必须能共存于同一 deck」为最高约束。这条约束自动 ban 任何中心化 registry / 全局 dep manager / 共享内存模型方案。
2. **扁平 REST 控制器**：skill 无状态、无 skill-to-skill 依赖、SKILL.md 是 prompt 不是 runtime。
3. **状态外置到 agent**：所有任务级 state 由 agent 持有；skill 不维护 session。
4. **协作走 combo（BFF）**：高频组合预编译为 combo skill，不引入隐式跨 skill 依赖。
5. **重资产走 npm/pip**：复杂逻辑下沉到 `bunx`/`npx`/`pipx` 可调用的发布包，skill 层保持轻薄。

并明确**反对**：

- 中心化 skill registry / hub
- SKILL.md 中的 `dependencies:` 字段（暗示 skill 间依赖）
- 在 npm/pip 之上套一层 skill 包管理器（Maven 前端 wrapper 反模式）
- 任何只在 lythoskill 内部 work 的特殊解析路径（参见 ADR-20260502012643344）

## Consequences

### Positive
- 阻断 Failure Mode 1+2 类提案的反复发起
- 将 ADR-20260423101938000 的 Spring 类比补全为系统性心智锚点（六条规则 + 五个类比层）
- 「声明即 prompt」给 SKILL.md 写作者一个明确的 lever：风格选择 = 行为选择
- 与 ADR-20260502012643244 / 344 / 444 在工程层互相印证（FQ-only locator / no-special-case / no-wrapper backend）

### Negative
- ADR D 的论证比常规工程 ADR 更哲学；架构感兴趣的读者欢迎，使用者可能跳过——这是有意为之，配套以 wiki 文章承载深度比对
- 类比/术语成本：读者需要同时理解 REST/SPA/BFF/Go module/TCG 五种范式——通过文档站点 + SEO + LLM 友好的 markdown 结构降低门槛

### Notes

**Skill / combo 存在的根本理由 = 沉淀，不是技术依赖**：技术上 agent 是通用能力，没有任何 skill 也能「当场给你搓」出工作流。skill / combo 的存在仅仅是为了把反复用到的工作流**沉淀**下来——避免每次重写、避免细节不一致、避免每次都可能引入 bug。本质是 DRY / consistency / bug-resistance，**不是** import-time dep。所有从「我们需要 skill 依赖管理」出发的提案都暗含一个错误前提：以为 skill 之间存在技术耦合。本条是 ADR D 其余 Notes 的根：理解了这条，下面所有限定（modulith / soft mesh / player facade / designer deck）都是其推论。

**Modulith 克制原则**：本 ADR 不鼓吹"无脑微服务化"。skill 内部允许有 modulith 风格的内聚结构（一个 skill 内部可以分多个 internal module），克制原则在于"不把内部 module 上升为独立 skill"。决策点：当一段逻辑能被多个 skill 复用时才提取为独立 skill；否则保持内聚。

**Skill mesh 比 service mesh 更"软"**：传统 service mesh 假设服务同公司、同部署目标、协议绑定（gRPC/HTTP）。skill mesh 没有 sidecar、没有协议绑定、没有强制部署——本质上是"agent 阅读 SKILL.md 时激活的心智集合"。运行时的 mesh = agent 的 conversation context。

**Player 在 lythoskill 中是 facade，不是 identity 层**：TCG 类比中的 player 概念，**真正的承担者是 Hermes / OpenClaw 等系统的 memory / soul / identity 模块**——agent 的自我评估、风格、长期偏好属于身份层，与 lythoskill 的 deck 治理职责正交。lythoskill 不重建 identity，只暴露 player interface 作为 facade（让 hermes/openclaw 之类下游消费 deck 状态 + arena 实战 log），与 Thin Skill Pattern「重资产下放到现成系统」立场完全一致。本 ADR 的边界因此停在 player facade 之下：deck/working-set/arena 是工程范围，identity 是 facade 之外另立。**去中心化生态中不同 player 习惯不同，combo 链各异，这正是 player facade 必须个性化（而非中心化定义）的根本理由**——TCG 类比中"玩家魔改 designer preset"的现象在 skill 生态完全对应。

**Agent-social 潜在层（future placeholder）**：去中心化 player + 个性化 combo 链 → 自然产生社交层需求。TCG 已有具体先例可参考：YGOPro / EDOPro 的 `.ydk` 文件作为 deck exchange 标准格式，对应未来的 `skill-deck.toml` 互换协议；玩家"看视频学打牌 / 看教程"对应 wiki 文章 + blog 中的 combo walkthrough（包括 LLM 抓取后能直接给 agent 提供的"打法"）。本 ADR 不开工此层，仅占位标记——player facade 设计时应预留 export/import 接口（支持 deck.toml 完整性校验、可移植签名等），为后续 deck-exchange protocol 留路。

**所谓「skill 依赖链」= 设计师推荐卡组**：用户对 "skill dependency" 的需求，实质上是"如果你要做 X，建议同时带这几张卡"——这是 designer-curated 的 recipe / bundle（参考 TCG 中设计师发布的 preconstructed deck / starter deck），不是 import-time 机器执行的 dep graph。lythoskill 不引入 dep resolver，但保留空间承载 designer decks——由 skill 作者发布"建议卡组"，用户 import 作为 deck 起点。这种功能属于 deck 治理 / curator 层（参见 lythoskill-curator），不是 link 时的依赖解析。换言之：当有人提议"给 skill 加 dependencies 字段"时，正确的回应是「你要的是 designer deck 模板，不是 dep manager」。固定 SOP 跨 skill 协作模式同理——它是"设计师固定 combo"，应该被沉淀为 combo skill，而不是建模为 skill dependency。

**Combo 多为本地设计 + Kimi flow 印证「声明即 prompt」**：`skill-deck.toml` 预留 `[combo]` section 的原因，是 combo skill 大概率是**项目本地**设计的——它沉淀的是"本项目特定的协作模式 / 团队 SOP"，与从 github 拉的通用 skill 性质不同。**Kimi CLI 的 `flow` type 是直接印证**：它选择用 markdown 的 mermaid code block 描述工作流，不需要 mermaid runtime——agent 读 SKILL.md + 内置 mermaid 心智 = 按流程图行动。生态已经自发演化出「声明即 prompt」模式，本 ADR 不发明新模式，只是把已经在发生的事情显式写下来。**风格上这类 skill 大概率呈 markdown 或 Jupyter notebook 形态**（半文档半工具），契合 agent 阅读 + 选择性执行的混合工作模式。

**方法论：结论先行，实现跟进**：本 ADR 集合（A/B/C/D）记录的是 user 反复测试 + 长期使用浮现的结论，不是事后总结。这种方法论的代价是 ADR 在实现前就已 proposed；红利是后续实现工作可以稳定地以这些结论为锚点，避免设计漂移。Agent 在阅读本 ADR 时应理解：proposed 状态不代表"未决定"，而是"已结论但等待实现"。

**这条 ADR 的存在本身就是其论证的一部分**：User 明确指出"如果不写下来 agent 会自己觉得其他更好来提"。本 ADR 通过显式记录已考虑过的拒绝选项（hub/registry/dep manager）+ 已选择路径（去中心化 FQ locator）+ 元层动机（防止 agent 回归），把克制决策永久锚定。后续阅读本 ADR 的 agent 在 propose 替代方案前应先证伪本 ADR 的假设。

### 后续

- wiki 文章 `wiki/02-architecture/skills-as-flat-controllers-evolution.md`（占位，待写）：
  - 微服务 → 前后端分离 → 生成式 UI → Agent+Skills 的演化论证
  - 与 Hermes / OpenClaw / Anthropic Skills 标准的对照
  - 反例 wall：Maven 前端 wrapper、自造 skill registry、skill-level dep manager 的失败先例
  - TCG vs service mesh 类比的精度对比
- 文档站点（计划中）：cortex/adr + wiki 输出为可被 SEO 索引、对 LLM 友好的 markdown 结构，让 agent 抓取本仓库时能直接获得这些心智模型
- ADR E（deferred）：Vue3 SFC 反应式心智作为「在扁平控制器之上加一层 reactive 声明」的独立研究方向——独立 ADR，不与本 ADR 混写

## Related

- 扩展自：ADR-20260423101938000-thin-skill-pattern (accepted)
- 术语层：cold pool 术语保留（ADR-20260501091724816 rejected，cold pool ≠ skill library）
- 工程层互相印证：ADR-20260502012643244 (FQ-only locator) / 344 (self-bootstrap via localhost) / 444 (deck add 写 FQ + 删 skills.sh backend)
- 反例参考：早期 Maven 前端 wrapper（frontend-maven-plugin 等）—— 在已有工具上套外壳的失败模式

## Further Reading

- `wiki/02-architecture/skills-as-flat-controllers-evolution.md`（TBD，承载本 ADR 的深度论证 + 同生态对照）
- ADR-20260423130348396（port skill manager into lythoskill ecosystem as deck governance）—— 选择 deck 治理而非 manager 重建的早期决策
