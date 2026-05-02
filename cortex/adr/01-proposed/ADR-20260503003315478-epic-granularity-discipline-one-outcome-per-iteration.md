# ADR-20260503003315478: epic granularity discipline — one outcome per iteration

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-03 | Created — couples with ADR-20260503003314901 to make epics actually closable |

## 背景

Cortex 把治理工作分了三层粒度:**ADR**(决策记录,长期不变)、**Epic**(一段迭代的产出单位)、**Task**(具体可完成的工作单元)。其中 epic 的角色是把"几张相关的 task"在一段时间内绑成一个共同 outcome,既不像 ADR 那么静止,也不像 task 那么琐碎。

### 原本的心智:epic = workflowy 节点 + 会话影子 + plan 持久化

epic 的设计原型是几条心智模型的合流,而不是单一来源。理解这个合流是粒度纪律的根本前提。

**(1) Workflowy 风格的 focus mode**:用户在 outliner 里一次 zoom 进一个节点深耕,把里面的事做完,再 zoom out,选下一个节点 zoom 进去。**核心是"同时只有一个聚焦点"**。同时 epic 内部不是 task 平铺,而是**树状展开** —— 一个 epic 里再分子节点,每个子节点细化为 task,这才是 workflowy 的层级本意。

**(2) 会话的影子 / 重要任务链**:用户原话:"epic 其实是我们会话的影子 — 重要的任务链"。会话(我和用户的对话)是任务发现和依赖推理的实时场域,但会话本身**不持久**(压缩/换 CLI/换 agent 就丢)。epic 是**会话推演成果的持久化形态**:把"我们这次想清楚的依赖图、拆解、推理路径"凝固下来,让下一个 agent / subagent / 未来的我能从这条链上接续。

**(3) Plan 对齐**:用户原话:"epic 是和 plan 对齐的东西"。Claude Code 的 plan mode / plan 工具是会话内的临时计划;epic 就是**项目级的、跨会话存活的 plan**。一个 epic 就是一份"已经完成依赖推理、可被 sub-agent 接走"的 plan。

**(4) 游戏任务链 + Kanbanize 双轨**:用户原话:"借鉴游戏任务链机制和 kanbanize 双轨"。
- **游戏任务链**:任务有前置条件、解锁后续、形成 main quest line + side quest 树状链。这给 epic 内**节点间依赖关系**提供了原型 —— epic 不是 task 的扁平 bag,是有向图。
- **Kanbanize 双轨**:Kanbanize 看板上有 standard lane(常规计划)和 expedite lane(紧急插队)两条独立泳道。这给本 ADR 的 lane 设计直接提供了原型,不是临时拍脑袋。

放到 cortex 上:active epic ≈ 当前 zoom in 的节点(workflowy)+ 偶发的紧急逃生(Kanbanize expedite)+ 内部任务链(游戏 quest)+ 跨会话 plan 凝固(plan 对齐)。同时 active 的 epic 不该爆发,因为四个心智参照都指向**串行 focus + 例外通道**。

### 为什么 epic 这一层必要 —— 不是直接 task

用户原话:"为啥不是直接 task?因为没想清楚之前 task 不 smart,不适合给 subagent 或者你自己接手"。

这一句确立了 epic 的不可替代性。三层分工:

- **ADR 层**:决策 / 选型 / why。是 / 不是这么做、为什么这样选 —— 不可执行、长期不变。
- **Epic 层**:拆解 / 依赖推理 / how。**任务还没 smart 之前,先在这一层把"想不清楚"变"想清楚"**;输出是结构化的、依赖标注好的子节点树。
- **Task 层**:执行 / smart 单元。每张 task 应该具备"扔给 subagent 也能跑"的清晰度 —— 输入明确、输出可验证、依赖已解决。

**关键洞察**:不存在"task 之前先有 epic"的强制顺序,但存在"task 必须 smart 才能 commit"的质量门槛。**Epic 是想清楚的工具空间**:在 epic 内做依赖推理 / 拆解,产物是一组 smart task。如果某个工作单元一次就能想清楚,直接立 task 完全合法 —— epic 只在"需要先想清楚"的场景出现。

这反过来解释为什么 epic 不该爆发:大部分时刻你只在想清楚一件事(main lane),偶尔来一件不能拖的事(emergency lane)。同时想清楚 5 件事 = 没在想清楚任何一件。

### 为什么 ADR 多、epic 少 —— 漏斗式 capture-many / focus-few

cortex 的四层(daily / ADR / epic / task)实际上是一个**漏斗**,数量级随漏斗向下递减:

```
点子(发散,无压捕获)
   ↓
daily/YYYY-MM-DD.md  (便宜的流水捕获,会话 by 会话)
   ↓
ADR (选型 / 决策,允许多 — 想到值得固化的判断就立)
   ↓
epic (执行聚焦,严格少 ≤ 2 — 串行 zoom)
   ↓
task (smart 叶子,subagent-ready — 由 epic 拆出 + 偶发独立 smart task)
```

**关键原则:不同层的数量管控逻辑相反**

- **daily / ADR 鼓励多**:思维发散时,无压捕获;一个想法值得固化判断就立 ADR,不要犹豫"够不够格"。漏斗上游就是要广。
- **epic 强制少**:执行聚焦时,串行 zoom;同时只 1 主 + 1 紧急,逼迫"先做完再开新"。漏斗下游就是要窄。

**用户原话**(2026-05-03 session):
> "我接受 ADR 很多,epic 聚焦"
> "为了我的心流我的确想到点子会无压要你记录。这个进入 daily 和 adr 比较好"

所以本 ADR 的 lane 上限只针对 epic,**不**针对 ADR / daily / task。它们在漏斗的不同位置,职能本来就是数量不对称的。试图给 ADR 也限量是误用 —— ADR 是漏斗上游,限量等于关掉思考通道。

这也回头解释了 ADR-A(git-coupling)的 trailer 为什么三类文档都覆盖却没有数量约束:**自动化补的是流转(verb),不是数量(cardinality)**。流转自动化让多 ADR 不会卡住;粒度纪律让少 epic 真的能完成。两个 ADR 处理的是漏斗不同位置的不同问题。

### Team-lead 角色:main agent 在 epic 层,subagent 在 task 层

用户原话:"其实作为 team leader 工作的话你应该关注 epic 然后把 task 给 subagent 做的"。

这一条把"smart task"为什么必要从抽象升到具体 —— **smart 的标准就是 subagent-ready**:

| 角色 | 工作层 | 职能 |
|------|--------|------|
| 用户 | ADR / daily | 思考方向、决策选型、点子捕获 |
| Main agent (me) | epic | 依赖推理、拆解、整合 subagent 结果、推进焦点 |
| Subagent | task | 接 smart task → 无上下文执行 → 返回结果 |

"task 没想清楚"在这个分工下就是**具体的失败模式**:subagent 拿到一张含糊 task,要么瞎跑、要么反复问 main agent、要么直接卡住。所以 epic 层做透"想清楚"的工作,产物是一组 subagent 能独立跑的 task,这是整套机制的实操闭环。

这进一步加固"为什么 epic 必要"的论据:**epic 不只是 plan 的持久化,还是 main-agent 工作场所的标识**。Main agent 在 epic 层做拆解 + dispatch + 整合;一旦 epic 列表爆发,main-agent 自己也守不住焦点,更不可能给 subagent 派出干净的 task。lane 上限保护的不只是规划纪律,还是 main-agent 自身的执行带宽。

#### Task 的结构沿用 skill 的 progressive disclosure

用户原话:"task 和 skill 的技巧类似的,从 front matter 开始按需,引用外部资源"。

这给 task 的具体落地形态定了型,与 SKILL.md 的设计模式同构:

| 层 | 内容 | 用途 |
|----|------|------|
| Frontmatter | id / status / depends_on / inputs / outputs / owner / parent_epic | subagent 调度需要的元数据 |
| Body | actionable 描述,只写"做什么 + 怎么验证" | subagent 真正读的执行指引 |
| 外部引用 | 链到 ADR / 代码位置 / 上游 task / 相关 epic 节点 | 按需深读,不在 task 里复述 |

收益:
- subagent 拿到 task 时,frontmatter 一眼看完调度信息;body 短小直接;深背景按引用按需点开
- task 不会膨胀成"小型 epic"(避免内嵌大量上下文导致粒度漂移)
- 与 cortex 现有 task 模板兼容(只是把"按需 + 外部引用"这条规则显式化)

这也让 ADR-A 的 trailer 简写(`Closes: TASK-XXX`)真正可用 —— commit 触发 task done 时,task 文件本身够轻,移动 / 流转 / INDEX 重生成都不需要重读大量内联内容。

#### Task = subagent 的 bootloader

用户原话:"所以理论上=subagent 的 bootloader" + "subagent 的 context 被 agents md/skills 还有 task card 填充是最正常的"。

这是对 task 角色的精准定位 —— **task 不是工作描述,是 boot 序列的入口点**。Subagent 冷启动到执行就绪的标准流程:

```
Subagent 冷启动
   ↓
Load AGENTS.md     (项目 SSOT、约定、auth/release/handoff guardrails)
   ↓
Load 相关 skill    (capability 文档、progressive disclosure)
   ↓
Read task card     (bootloader: frontmatter + 行动指引 + 外部引用)
   ↓
按需点开 task 引用  (ADR / 代码 / sibling task)
   ↓
执行 → 返回结果
```

**为什么这是"最正常的"而不是"重负担"**:
- AGENTS.md / skills 是项目固有文档,所有 agent 都要 load,不是 task 引入的额外成本
- task card 本身轻量(frontmatter + 短 body + 引用),boot 开销小
- 引用按需展开,subagent 只读它真的会用到的那部分
- 与 SKILL.md 的 progressive disclosure 同构,LLM 已经训练得"读 frontmatter → 决定深读哪段"

**反面教材**:把 task 写成长篇上下文叙述,等于把"载入 OS"塞进 bootloader,违反层级分工。Task 该有的是"指针 + 行动",不是"教程 + 背景"。

这一条让"smart task"的具体实现门槛清晰:**task = bootloader,不是文档**。Main agent 写 task 时的自检问题就是"一个零上下文的 subagent 读完 AGENTS.md + skills + 这张 task 卡,能不能 boot 到执行就绪"。回答 yes 就是 smart,回答 no 还需要在 epic 层多想一轮。

### 收束:Cortex 是 agent OS 雏形

用户原话(本次 + 之前):"cortex 实际是一种 agent os 雏形 —— task card id 是 handler —— context window 只需传引用"。

这是上面所有局部隐喻(workflowy / 会话影子 / plan / quest chain / Kanbanize / team-lead / bootloader)的统一视角。把它们放到 OS 抽象上对照,机制立刻自洽:

| OS 概念 | Cortex 对应 |
|---------|-------------|
| handler / fd / pid | task card id(`TASK-YYYYMMDDHHMMSSnnn`)|
| handler 指向的结构 | task card 文件本身 |
| 进程间传递引用而不是拷贝 | context window 只传 task id,不内联内容 |
| process | subagent 实例 |
| process group / job | epic(一组相关 handler 的 coherent 集合) |
| kernel scheduler | main agent(派发 handler 到 subagent process) |
| bootloader | task body + frontmatter(把 subagent boot 到执行就绪) |
| system config / policy | ADR(决策记录,长期不变) |
| syslog / journal | daily/YYYY-MM-DD.md |
| RAM(易失) | 会话上下文(压缩即丢) |
| persistent storage | cortex/ 目录树(跨会话存活) |

这个 frame 解释了**为什么本 ADR 的所有约束是必要的**,而不是项目管理风格偏好:

1. **Lane 上限 = 进程调度纪律**:OS 不会同时跑 100 个 active process group 还指望系统响应,jobs 必须有可控并发。Epic lane 上限是 main-agent 这个 kernel 的执行带宽保护。

2. **Task 必须 smart = handler 协议契约**:OS 里 fd 的语义必须自洽(stat / read / write 都有规约),subagent 拿到 task id 也必须能按统一协议解析、执行、回写。含糊 task = 坏 fd,subagent 无法用。

3. **Frontmatter + 外部引用 = handler 设计原则**:OS handler 是不透明小标识,真正的内容按 syscall 按需读。Task 同形 —— frontmatter 是 handler metadata,body 是 syscall response,引用是按需深读。

4. **Context window 只传引用 = 内存效率**:如果 context window 内联整张 task 内容,等于把磁盘读进 RAM 再传给 child process —— 浪费。传 task id,subagent 自己 read,这是 OS-level 内存管理。

5. **Trailer + post-commit hook(ADR-A)= kernel-level 状态同步**:用户态(commit)发出 syscall(trailer),内核(hook)把状态机推进到一致。失败时 `cortex probe` 是 fsck,把磁盘状态修回一致。

6. **lane / checklist 拒绝 = 资源分配 admission control**:OS 里新进程 fork 时 kernel 检查 ulimit / cgroup;cortex 里 epic create 时检查 lane 占用 / checklist 通过 —— 同种 admission control 模式。

**所以本 ADR 不是"epic 多管管"**,是**给 cortex 这个 agent OS 雏形装 admission control + scheduling discipline,保证 agent OS 能稳定调度多 subagent process**。这才是双轨上限和创建期 checklist 真正的位置。

#### Context window 是 6502,文件系统是 disk

用户原话:"context window 比起文件系统相当于 6502 寻址空间那样受限" + "理论上哪怕 task card 里面引用到了超过 100MB 的资源,索引好也不会炸 context window,因为只需要工具去读,不用通过 context window"。

6502 CPU(NES / Apple II / Commodore 64)的寻址空间 16-bit = 64KB,但磁盘 / 磁带容量远超于此。早期程序员靠 bank switching + 流式读取从大存储里**按地址按需调入**到 RAM,而不是把整个游戏 ROM load 进 64KB。这正是 agent CW 与 cortex 文件系统的对偶:

| 6502 时代 | Agent 时代 |
|-----------|------------|
| 64KB RAM(寻址空间)| Context window(几十~几百 K tokens)|
| 软盘 / 磁带 / ROM(可达 MB ~ GB)| 文件系统 / cortex/ 目录树(可达 GB ~ TB)|
| Bank switching / paged memory | task card id 作为引用,工具按需读入 |
| Disk I/O 是 syscall | Read / Bash / Grep 等工具调用 |
| 程序员手工管理 working set | Main agent 选择"传 id 还是传内容" |

**关键解锁**:在引用模式下,**task card 引用一个 100MB 的资源也不会炸 CW**,因为:

- task card 内只放路径 / id,不内联内容
- subagent 拿到 task card → 通过工具(Read with offset / limit、grep、targeted extraction)读取必要切片
- 100MB 文件留在文件系统,CW 只承载工具返回的小结果
- 索引(`cortex/INDEX.md`、frontmatter、引用链)保证"路径找得到",定位成本低、读取成本按需

这是 agent OS 雏形最具体的工程意义:**CW 受限 ≠ agent 受限**,只要架构上把所有"大状态"放在文件系统里,通过 id / 路径 / 引用寻址,工具按需读入,agent 就能在 64KB 等价的 working set 里调度任意大的项目状态。

这反过来给本 ADR 的设计加上一条硬约束:**所有可能膨胀的内容都必须放在引用后,不在 CW 直接流动**。具体到 task / epic / ADR 结构:

- task body 只写"做什么 + 怎么验证 + 引用"(不复述 ADR 决策、不内联代码、不嵌入大量背景)
- epic 不内联子 task 全文,只列 task id + 依赖关系
- ADR 引用其他 ADR 用 ID,不复述
- INDEX.md 是地图,不是数据

违反这条 = 把磁盘内容拉进 6502 的 64KB,工程上必然崩。这条约束既支持了 lane 上限的有效性(不会有"巨型 epic"内容塞爆 CW),也让 task = bootloader 的角色真正轻量。

#### Forward-looking:CW snapshot 作为 onboarding tar

用户原话:"其实我是很想实现一种类似 context window snapshot 机制的" + "非常好用的 onboarding tar 一样的感觉"。

这是 OS 隐喻最自然的延伸方向。OS 世界里早有等价物:

| OS 世界 | Agent 等价物 |
|---------|--------------|
| VM snapshot / VMware suspend | 把 agent 当前 CW + 工具状态打包 |
| CRIU(Checkpoint/Restore in Userspace) | 跨会话 / 跨 CLI 恢复进行中工作 |
| `docker save` / `docker load` | "onboarding tar" — 一个 tarball 直接 resume |
| `fork()` + COW | 派 subagent 时复用父 agent 的 working set |

当前的 daily/YYYY-MM-DD.md 已经是这一机制的**手工原始版** —— agent 用人话写下"我在哪里、下一步做什么",新 agent 读完手工 resume。但它有两个根本限制:
- **人话不是机器状态**:新 agent 还得重新加载 AGENTS.md / skills / 当前 epic / 引用 ADR,等于冷启动后人为缩短了路径,没真的 snapshot
- **粒度只到 session 级**:不能在 task 中途 snapshot/resume

真正的 CW snapshot 机制是把 OS-level checkpoint/restore 概念引入 agent 工作流,让"换个 CLI / 跨压缩 / 派 subagent 接手"从"重新 onboarding"降到"load tar 解压"。这与本 ADR 的 lane / handler 设计完全相容 —— 实际上 lane + handler + 引用模式正好是 snapshot 友好的前置:**因为状态都在文件系统里、CW 只持引用,所以打 snapshot 就是打 references 的当前集合,远小于内容快照本身**。

本 ADR 不实现 snapshot 机制(超出 epic 粒度纪律范畴),但留作 forward-looking 方向 —— 当本 ADR 与 ADR-A 落地后,是顺势开第三本 ADR("Cortex CW snapshot 机制")的自然时机,且地基已经准备好。

**用户提供的 snapshot 设计 driver(2026-05-03 session)**:

> "发生 compacting 总之先恢复到那个状态的意思"
> "对 kvcache 也友好"
> "我的确考虑过模板治理"
> "因为我不想"拼"agents md"

四条 driver 解构:

1. **Compaction recovery 是主用例**:Claude Code 跨压缩会丢 working state;snapshot 就是这一痛点的正向解药,从"我希望它别忘"变成"它就算忘了也能 1 步 resume"
2. **KV cache 友好性**:references-only 架构下,snapshot 内容主体是稳定的引用集合,后续读取走 prefix-stable 路径,Anthropic 的 prompt cache(5 分钟 TTL)能持续命中,**性能上是免费午餐**
3. **避免"拼" AGENTS.md**:当前 AGENTS.md 已经在承担"事实上的手工 snapshot"职能 —— 每次新 guardrail / 新 context 都往里加,日趋膨胀。snapshot 机制把"运行时状态"剥离到独立 artifact,**让 AGENTS.md 回归 lean SSOT**(只放约定 / guardrail / 入口点),不再是 kitchen-sink
4. **模板治理是前置**:template(epic / task / ADR / daily)需要先治理成 canonical 形态,snapshot 才有可靠的 base image 去 diff;反之模板乱,snapshot 就是 garbage in / garbage out。这条把"模板规范"从美学问题升级成 snapshot 可行性的工程前置

#### Claude 内部已有 / 缺失的机制(2026-05-03 调研)

| 机制 | 当前状态 | 与 snapshot 的关系 |
|------|----------|--------------------|
| Prompt caching | ✅ 已有,5 分钟 TTL | 与 references-only 架构天然合拍;snapshot 命中前缀,cache 命中率高 |
| Session `/resume` | ✅ 已有 | 粗粒度,整段 transcript 重放,不是结构化恢复 |
| Memory system(`~/.claude/projects/.../memory/`)| ✅ 已有,跨会话存活 | 当前最接近 snapshot 的机制,但是面向**长期身份/偏好**的固化片段,不是瞬时 working state |
| Skills(progressive disclosure)| ✅ 已有 | capability 按需载入,与 task = bootloader 同范式 |
| 第一公民 CW snapshot/restore | ❌ 无 | 当前只能靠 daily + memory + AGENTS.md "拼" |

所以本 ADR 说的"snapshot 是 forward-looking" —— 不是空想,是基于"已有原料(memory + skills + caching)+ 缺失整合层(snapshot 抽象本身)"的具体工程方向,且和 lane / handler / references-only 设计协同。

#### Snapshot 精确化:session dump,但只 dump 引用

用户后续追加(2026-05-03 session):

> "从 snapshot+daily 恢复,我觉得就很好了"
> "基本相当于 dump 了 session"
> "但是不至于炸 cw"
> "那还是先拼吧 🤔"

这把 snapshot 的目标精确到可工程化的尺度:

| 维度 | 定义 |
|------|------|
| 对应物 | session dump,语义上"基本相当于 dump 了 session" |
| 内容选择 | **只 dump 引用集合 + 当前焦点 metadata**(open epic id、current task id、recent decisions ids、touched files paths)|
| 不 dump 什么 | transcript 全文、读过的文件全文、思考链 —— 这些靠引用回查 |
| 配套 | snapshot + daily 两文件协同 —— snapshot 是机器状态,daily 是人话叙述,**双源恢复** |
| 尺寸约束 | 不炸 CW —— references-only 保证 snapshot 本身远小于一次 transcript 全 dump |
| 工程门槛 | 需要"模板治理"先到位,canonical 模板 = 可靠的 base image |

**与本 ADR 的硬关联**:lane 上限 + handler 协议 + references-only 三条机制都是 snapshot 的工程前置:
- lane 上限 → snapshot 时 main + emergency 各最多一个 epic,状态边界清晰
- handler 协议 → snapshot 里只放 task id,subagent / 新 agent restore 时按 id 取
- references-only → snapshot 大小可控,不会因为 epic 内容多就炸 CW

**短期务实路径**("那还是先拼吧 🤔"):因为 Claude 没第一公民 snapshot,**当前继续靠 AGENTS.md + memory + daily 拼**,但本 ADR 落地后,这一"拼"是有架构纪律的拼(lane / handler / references),snapshot 真到来时迁移成本低。

#### 终极形态:AGENTS.md 走 build 渲染(SSR / SSG 同构)

用户后续(2026-05-03 session):

> "要不然就要 agents md 也靠 build 机制渲染出来啦"
> "类似我们的 skill 呢"
> "因为这玩意本质和前端渲染也类似的"

这是 snapshot 概念推到完全形态后的工程对应物 —— **AGENTS.md 不再手工编辑,变成 build artifact**,跟 SKILL.md(已经走 `{{PACKAGE_VERSION}}` 模板渲染)同范式。

三层类比对齐:

| 前端渲染 | Skill 系统(已落地) | AGENTS.md(forward-looking) |
|----------|---------------------|----------------------------|
| Template(React component / Handlebars) | `packages/<x>/skill/SKILL.md`(带占位符) | `AGENTS.md.tmpl`(待设计) |
| Data(props / state / API 返回) | bump 时的 version 数据 | 当前 active epic / open tasks / recent ADRs / lane 状态 |
| Render(SSR / SSG) | `lythoskill-creator build` 渲染 SKILL.md | hook / build 时渲染 AGENTS.md |
| Output(浏览器读的 HTML) | 各 skill 包的最终 SKILL.md | 各 agent 读的最终 AGENTS.md |

**关键收益**:

1. **彻底告别"拼" AGENTS.md**:每次新 guardrail / 新 context 不再手工编辑文件,**填到模板的对应 slot,build 时合成**。AGENTS.md.tmpl 保持 lean 且稳定;working state 由数据层提供
2. **复用现有 build 机制**:`lythoskill-creator build` 已经处理 SKILL.md 模板渲染,扩展支持 AGENTS.md 渲染是顺势加一类目标,**不是另立体系**
3. **snapshot 是数据层、AGENTS.md 是渲染层**:snapshot 提供 data,模板渲染产出 AGENTS.md;两者职责清晰,不互相吃边界
4. **跨 agent 一致性**:不同 CLI(Claude / Cursor / Kimi)都读 build 出的同一个 AGENTS.md,模板治理 = 渲染契约,不是各家自适应
5. **KV cache 友好**:模板部分稳定 → cache prefix 长;只有数据层变化触发 cache 失效 —— 比当前手工 patch AGENTS.md 友好得多(后者每次改动都让前缀失效)

**与"模板治理"绑死**:用户提到的"我的确考虑过模板治理"在这里落地为具体工程要求 —— **模板治理 = AGENTS.md 渲染管道的合同**。模板乱 → 渲染输出乱 → agent 行为乱。所以模板治理是"AGENTS.md as build artifact"的唯一前置。

**ADR 边界提醒**:本 ADR 的核心是 epic 粒度纪律,以上 snapshot / build 渲染都是 forward-looking 注释。本 ADR 不实现这些。但**lane + handler + references-only 三条机制是上述所有 forward-looking 路径的共同地基**,做对当下选项 E 就是给未来铺地。建议在本 ADR + ADR-A 完成后,顺势开 ADR-C("Cortex CW snapshot 与 AGENTS.md 渲染管道")承接这一线。

#### External validation:Hermes Agent / Manus context engineering 与本 ADR 收敛

用户提示("和 hermes agent 最近的实践文章对应的")驱动的 web search 显示,本 ADR 提出的 forward-looking 路径与业界已落地实践高度一致:

**Hermes Agent (NousResearch, 2026)**:
- **9-layer 系统 prompt 组装**:identity → memory guidance → skills → platform hints → context files → frozen memory,按"稳定→易变"排序。等价于本 ADR 提议的"模板化 AGENTS.md 渲染管道"
- **Frozen memory snapshot**:session 启动时固化,中途任何 memory write 不修改 system prompt,**解析为本 ADR 的 snapshot 概念**
- **Progressive 3-tier skill disclosure**:名(~300 token)→ 指令(~2K)→ 引用(~500),与 task = bootloader / SKILL.md 的 progressive disclosure 同范式
- **核心规则**:"Mid-conversation toolset changes, memory reloads, or skill swaps invalidate the cache and 10× your cost. Defer changes to 'next session' by default." —— 直接验证用户"不想拼 AGENTS.md / build 渲染"的设计动机

**Manus context engineering(Hermes 引用为基础)**:
- **KV-cache hit rate 是 production agent 最重要的单一指标**,直接影响延迟和成本
- **Cache-friendly 三规则**:① 前缀稳定(单 token 差就失效)② append-only(避免修改历史)③ 显式 cache breakpoint
- **Tool masking 而不是 removal**:不动 tool 列表,用 logit mask 调可见性 —— 与本 ADR 的"references-only"思路同源(变更通过引用切换,不动 prefix)

**对本 ADR 的意义**:
- **不是创新,是收敛**:lane / handler / references-only 这套机制不是孤立设计,而是与外部成熟实践(Hermes / Manus)在多个独立路径上汇合到同一组工程不变量
- **更强的方案 E 信心**:外部生产级 agent 系统通过同样的约束拿到 5-10× cache cost 节约,**意味着 lane + handler + references-only 落地后会顺势获得性能红利**(不只是治理收益)
- **forward-looking 路径有先例可循**:ADR-C(snapshot + AGENTS.md 渲染)不需要从零设计,可以直接参考 Hermes 的 9-layer assembly 与 frozen memory snapshot 结构

引文来源:
- Hermes Agent docs (nousresearch.com) — Prompt Assembly / Context Compression and Caching
- fp8.co — "OpenClaw vs Hermes Agent: Prompt & Context Compression"(2026-04-28)
- manus.im/blog — "Context Engineering for AI Agents: Lessons from Building Manus"
- digitalapplied.com — "KV Cache Optimization for LLMs 2026"(2026-04-24)

### 现象 1:Epic 爆发 — 心智没传达到位

session 里经常一次性冒出 3~5 个 epic。例如本次 session 仅 cortex 自动化主题就差点同时立 4 个 epic:"trailer 解析"、"hook 系统"、"BDD 覆盖"、"AGENTS.md 镜像"。这违反了 workflowy 心智 —— 这些其实是同一个 zoom-in 节点("cortex 自动流转")下的子事项,不是 4 个独立焦点。

### 现象 2:Epic 拆得过细 / 过粗,没有一致标准

回看 `cortex/epic/01-active/`(若存在),已有 epic 中混杂着两种倾向:有的 epic 实质只是一张 task 的包装(粒度过细 = workflowy 里把单个 leaf 当节点 zoom),有的 epic 是"把整个 cortex 重构"这种范围(粒度过粗 = 把整棵树当节点 zoom,等于没 zoom)。两种都让 epic 失去 focus 价值。

### 现象 3:Epic graveyard + 没有归档判据

ADR-20260503003314901 已识别"task 卡在 in-progress"问题并提出 git-coupling 解决。但 epic 一旦数量失控,即使 task 流转自动化了,**epic 本身永远完不成** —— 因为它的 outcome 模糊到没有"完成"判据,而且没有外部压力推动归档(`01-active/` 越堆越多,新 agent 看到"这就是 epic 应有的样子",反向加固坏习惯)。**graveyard 的本质是缺少归档触发器**。

### 用户原话与心智参照

> "然后就是 epic 粒度。好歹是一个迭代,epic 应该是不会大爆发的。如果本来就是不同的事那算了"
> "现在 epic 粒度有模糊倾向吧"
> "有时候没几下一堆 epic 出来"
> "同时最多 2 轨道。一个相当于当前迭代,一个相当于紧急轨道"
> "这样 epic 的归档也有依据"
> "本来 epic 的心智是 workflowy"

用户的核心判据组合:
- **Workflowy 心智** → epic 是 focus 单位,本质串行
- **双轨上限** → 最多 1 主 + 1 紧急,不是数字 2 而是语义 2(主线 vs 例外)
- **归档有依据** → lane 满了就强制归档/挂起一个老的,让"完成 / 暂停"成为有触发器的事件,而不是靠自觉

### 为什么不只是"checklist 认知干预"

仅靠创建期 checklist(初版方案 C)能挡掉粒度过细 / 过粗,但**挡不住"两个都合理但同时启动两个独立主线"**。Workflowy 的本意是串行,所以光过滤每个 epic 自身合不合格还不够,要再加一层**全局 lane 约束**,强制聚焦顺序。

所以本 ADR 的目标是**双层防线**:checklist 管粒度认知,lane 上限管聚焦串行。两者协同。

### 为什么和自动化 ADR 配对

ADR-20260503003314901(git-coupling)解决"epic 完不成 → graveyard"的下游症状(自动流转让 done 不再被遗忘)。本 ADR 解决"epic 一开始就立太多 → graveyard"的上游症状(让创建本身受约束,且 lane 满时强制做归档决策)。两个 ADR **同时存在,治理才闭环**:一个让 epic 真的能完成,一个让 epic 真的值得开始,且现有的能被自然推向完成。

## 决策驱动

- **Cortex = agent OS 雏形**:本 ADR 的所有约束都从这一框架推出 —— epic 是 process group,task 是 handler/bootloader,main agent 是 kernel scheduler,subagent 是 process。下面的具体 driver 都是这一隐喻的工程落地
- **Workflowy focus mode**:epic = 当前 zoom in 的节点;同时只有一个主焦点 + 一个紧急逃生口
- **双轨而不是数字上限**:`main` lane(当前迭代主线)+ `emergency` lane(紧急但不可拖入主线的事项),语义切分天然解释"为什么是 2";对应 OS 的 standard / expedite job 双队列
- **lane 满 = 归档触发器**:当 main lane 已满又有新 epic 候选时,**强制做一个决策**(完成/挂起/归档/重分类),把"何时归档"从自觉转换为有外部压力的事件;OS 层面就是 admission control
- **Soft + Hard 分层**:checklist 是 soft(认知干预,可 skip);lane 上限是 hard(物理拦截,但留 `--override` 应急口);分别对应 OS 的 advisory check 与 hard limit
- **Working set 保护**:CW 容量是 6502 级别的硬约束,task / epic 必须按引用模式组织,所有可能膨胀的内容都放引用后,不在 CW 直接流动
- **判据可机器检查**:checklist 5 题 + lane 状态 stat,都能进 CLI(等价 OS 的 `ulimit` / `getrlimit` 接口)
- **与自动化 ADR 协同**:ADR-A 让 done 不被遗忘 + 失败时 probe 兜底(fsck);本 ADR 让 lane-full 推动 done(admission control 反向施压)
- **不锁死历史 epic**:已有 epic 不强制重判,但激活本 ADR 时跑一次 probe,识别明显违反者并提醒(不强制移动)

## 选项

### 方案A:维持现状(纯靠 agent 自觉)

依赖 AGENTS.md 中关于 epic 的描述 + 新 agent 自己读懂分层意图。

**优点**:
- 零实现成本

**缺点**:
- 已经验证不可持续 —— 本 session 已经亲历过几次 epic 创建冲动
- 跨 agent / 跨压缩,对"epic 粒度"的理解会持续漂移
- 历史 epic 库会越来越乱,新 agent 看到一堆同时 active 的 epic,以为"这就是 epic 应有的样子",反向加固坏习惯
- 没有归档触发器 → graveyard 必然形成

### 方案B:hard cap(同时 active epic 数上限,纯数字)

`cortex epic create` 检查 `01-active/` 数量,超过 N(例如 3)直接拒绝。

**优点**:
- 实现简单
- 物理上杜绝爆发

**缺点**:
- 治标不治本 —— 不解决"什么是 epic"的认知问题
- 多线并行场景误伤("如果本来就是不同的事那算了" 用户原话已经否决 hard cap 的"数字"形式)
- 数字阈值天然有争议(为什么是 3?为什么不是 5?)
- agent 被拒后会去改阈值或绕过,而不是反思粒度

### 方案C:创建期 checklist(纯认知干预)

`cortex epic create` 时强制走一个 5 题 checklist(soft gate,可以选 "skip" 但记录到 epic metadata)。题目覆盖 outcome 明确性、可结案性、迭代尺寸、是否该是 task / ADR。同时在 epic 模板顶部加 "Epic 是什么 / 不是什么" callout。

**优点**:
- 治粒度认知
- 不误伤多线
- 可审计(skip 原因留 metadata)

**缺点**:
- 只挡得住单 epic 的"质",挡不住整体的"量"
- 两个都通过 checklist 但同时启动,违反 workflowy 串行心智
- 没有归档触发器

### 方案D:epic 取消(只保留 task + ADR 两层)

直接取消 epic 这个粒度,所有产出绑到 ADR(决策)+ task(单工作单元)。

**优点**:
- 彻底消除粒度争议

**缺点**:
- 失去"一段迭代的 outcome"这个真实存在的粒度
- 失去 workflowy focus 节点的心智抓手
- 会把"几张相关 task"的关系丢掉(目前靠 epic 反向引用 task)
- 等于回退到没有迭代视图

### 方案E(推荐):双轨 lane(main + emergency)+ 创建期 checklist + 归档触发器

**核心结构**:
- 每个 epic 在创建时声明 lane:`main` 或 `emergency`
- 同时 active 的 epic 上限:**main lane ≤ 1, emergency lane ≤ 1**(总数 ≤ 2,但语义切分,不是数字争论)
- `cortex epic create` 同时跑:
  1. **Lane 检查**(hard):目标 lane 已占用 → 强制走"完成 / 挂起 / 归档 / 重分类为现有 epic 的 task" 四选一(留 `--override` 紧急口,但要写理由,记入 metadata)
  2. **Checklist**(soft):5 题认知 prompt(同方案 C)
- 模板顶部加 "Epic 是什么 / 不是什么 + Workflowy focus 心智 + 双轨说明" callout
- `cortex probe` 扩展:检查 lane 数,超出时 warn(主要为捕捉历史超额 epic)

**Checklist 5 题(沿用 C)**:
1. **Outcome 明确**: 这个 epic 完成时,能用一句话说出"X 已交付"吗?
2. **可结案性**: 完成判据是可观测的吗?
3. **迭代尺寸**: 预计在 1~3 周内可以收尾吗?
4. **不是 task**: 是否需要 ≥3 张 task 才能完成?(<3 张 → 直接是 task)
5. **不是 ADR**: 是决策还是产出?(决策 → ADR)

**Lane 语义**:
- `main` = 当前迭代主线,workflowy 当前 zoom in 节点;一次只能一个,逼迫聚焦
- `emergency` = 真正不能拖到下个迭代的事(线上 bug、blocking 依赖等);也只能一个,因为同时来两个紧急说明根本不在迭代轨道上,应升级到 ADR 决策

**优点**:
- **完整治理**:checklist 治"质",lane 治"量",两条防线
- **数字有原则**:1+1 是 workflowy 心智 + primary/contingency 模式直接落地,不是"为啥是 2 不是 3"
- **归档自动有触发器**:lane 满 + 新 candidate → 必须做归档/挂起决策。**这正是 graveyard 的解药 —— 不靠定期清理,靠"没空位"自然挤压**
- **不误伤合理多线**:emergency lane 给真的紧急留口
- **与现有工具一致**:cortex CLI 风格 + AGENTS.md 镜像 + probe 兜底,与 ADR-A 同范式
- **可审计**:override 原因、skip 原因都进 metadata

**缺点**:
- 创建一个 epic 多走 lane 选择 + 5 题(可 override / skip,边际成本可控)
- emergency lane 有被滥用为"插队 main lane"的风险 → 用 metadata 记录原因 + 事后 review 缓解

## 决策

**选择**: 方案E

**原因**:

1. **Workflowy 心智落地**:用户原话"epic 心智是 workflowy"是这一选择的根本驱动。Workflowy 的 zoom-in focus mode 在结构上就是 1 主线 + 偶发逃生口。方案 E 把这个心智直接编码成 lane 上限,概念和实现 1:1。

2. **graveyard 有解**:用户补的"这样 epic 的归档也有依据"是关键 —— 之前所有方案都没回答"什么时候触发归档"。方案 E 用 lane 满作为外部压力,把归档决策从"agent 自觉"转换为"lane 已满,你必须做选择"。这是工具级不变量,不是教育。

3. **拒绝 hard cap(B)**:用户明示"如果本来就是不同的事那算了"否决了纯数字 cap。但**"双轨"不等于"数字 cap"** —— 它是语义 cap,基于"主线 vs 紧急"的真实区分,不是"≤ N"的争论。

4. **拒绝单 checklist(C)**:checklist 治"质"不治"量"。两个都通过 checklist 但同时启动两个主线,仍违反 workflowy 串行心智。需要 lane 这一层物理拦截。

5. **拒绝取消 epic(D)**:中间层在大量真实场景里有用(本 session 的"cortex 自动流转"主题就是完美的 epic 候选)。问题不是 epic 概念错,是创建判据 + 数量约束都缺失。

6. **保留紧急逃生**:`--override`(lane)+ `--skip-checklist` 让真的清楚自己在做什么的 agent 不被卡;但 override 原因留 metadata,事后能回溯。

7. **与 ADR-20260503003314901 范式一致 + agent OS 调度纪律**:那本通过 hook 把 agent 自觉转换为工具不变量(kernel-level 状态同步);本 ADR 通过 lane 上限 + checklist 把 agent 自觉转换为创建期不变量(admission control)。**两者都是 cortex agent OS 雏形里的 scheduling discipline**:ADR-A 管 process 状态机,本 ADR 管 process group 调度。同样的 cost / benefit 决策风格,同样的"在低成本介入点装不变量"思路。

## 影响

- 正面:
  - **粒度收敛**:同时 active 的 epic 自然 ≤ 2,且语义清晰
  - **可结案**:每个新 epic 创建时已声明 outcome 和判据,完成时不需要重新讨论"这算不算完"
  - **归档有触发器**:lane 满推动归档/挂起决策,graveyard 自然消化(不靠定期清理)
  - **focus 落地**:main lane 单坑强制串行,与 workflowy zoom-in 心智一致
  - **Main-agent kernel 带宽保护**:lane 上限同时是 admission control + main-agent 自身工作 working set 上限,不让"想清楚的事"互相挤占;subagent 派发更稳定
  - **配合自动化更有效**:ADR-A 让 epic 能从 active 流到 done + probe 兜底;本 ADR 让"流到 done"成为常态压力
  - **与外部生产实践收敛**:lane / handler / references-only 与 Hermes / Manus 的 KV-cache 友好实践同源,落地后顺势获得 prefix-stable cache 红利
  - **跨 agent 传染**:lane + checklist 一次写好,任何 agent 创建 epic 都看见
  - **历史 epic 自然消化**:激活时 probe warn 提示超额,但不强制移动;后续创建受限,自然挤压老 epic 决策

- 负面:
  - 创建一个 epic 多走 lane 选择 + 5 题(可 override / skip,边际成本可控)
  - emergency lane 有被滥用为"插队 main lane"的风险 → metadata 记录原因 + 事后 review 缓解
  - lane 上限的具体数(1+1)可能未来需要调,需要保持单点改动友好

- 后续:
  1. 实现 `cortex epic create --lane main|emergency` + lane-full 拒绝/override 逻辑
  2. 实现 checklist prompt(集成到 `cortex epic create`)
  3. 更新 epic 模板,顶部加 "Epic 是什么 + Workflowy focus 心智 + 双轨说明" callout
  4. AGENTS.md 加一节 "Cortex Granularity"(简短,链到本 ADR 详情)
  5. `cortex probe` 扩展:lane 超额 warn(覆盖历史超额场景)
  6. 在 ADR-20260503003314901 实施时同步用本 ADR 的标准 review 已存在 epic
  7. BDD 覆盖:lane 空 / lane 满 / override / checklist skip / checklist 全过 等场景

## 相关

- 关联 ADR:
  - ADR-20260503003314901(cortex git-coupling)— 平行 ADR;那本让 epic 真的能"完成"+ probe 兜底,本 ADR 让 epic 真的值得"开始"且 lane 满推动"完成"
  - ADR-20260502233119561(lock-step bump)— 同一种"在低成本介入点装 checkpoint"范式(那里是 commit hook,这里是 CLI prompt + lane 上限)
  - ADR-C(待自然推演,暂不实现)— "Cortex CW snapshot 与 AGENTS.md 渲染管道";本 ADR 的 lane / handler / references-only 是其工程前置
- 关联 Epic: 待创建(同 ADR-20260503003314901 的 Epic — 两者实施合并到一个 epic,outcome 一致 = "cortex 自动化 + 粒度纪律落地",**正好用作"main lane = 1"的首发示例**)
- 关联 Skill: lythoskill-project-cortex(实现位置:`packages/lythoskill-project-cortex/src/cli.ts` 中 `epic create` / `probe` 命令扩展、epic 模板更新)
- 外部参考(forward-looking 验证):
  - Hermes Agent (NousResearch) — 9-layer 系统 prompt 组装、frozen memory snapshot、progressive 3-tier skill disclosure
  - Manus context engineering — "KV-cache hit rate 是 production agent 最重要单一指标";cache-friendly 三规则(前缀稳定 / append-only / 显式 breakpoint)
  - fp8.co "OpenClaw vs Hermes Agent: Prompt & Context Compression"(2026-04-28)— 两个生产级 agent 的对比,同样指向 prefix-stable / frozen-snapshot 路径
