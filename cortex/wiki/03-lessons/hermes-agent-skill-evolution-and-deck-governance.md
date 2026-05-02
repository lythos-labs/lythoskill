# Hermes Agent 自主进化与 Deck 治理的深层对接

> 类型: 调研报告 | 关联: [lythoskill-deck](https://github.com/lythos-labs/lythoskill/tree/main/skills/lythoskill-deck), [skill-selection-pipeline](../01-patterns/skill-selection-pipeline.md), [thin-skill-pattern](../01-patterns/thin-skill-pattern.md)
>
> 来源: Web 搜索 + 社区 issues 归纳 + 第一性原理推演

---

## 一、执行摘要

Hermes Agent（Nous Research, 2026）代表了 Agent 架构的第三代范式 —— **Harness Engineering**：人类不再编写 prompt 或管理 context，而是设计边界、护栏与反馈循环，让 Agent 在内部自主进化。其核心武器是**自动 skill 创建** + **GEPA（Genetic-Pareto Prompt Evolution）**优化。

这种能力在释放巨大威力的同时，也必然引发**技能生态的系统性危机**。本报告通过第一性原理推演其必然痛点，并论证 lythoskill-deck 的现有机制恰好构成了应对这场危机的基础设施。

---

## 附录：Hermes 源码一手发现

> 基于 `/tmp/hermes-agent-shallow` 的 shallow clone（未污染本项目仓库）。

### A.1 Skill 目录结构的双层设计

Hermes 的 skill 存储分为两层：

```
~/.hermes/
├── skills/              # 内置技能（bundled）+ 用户/Agent 创建的技能
│   ├── github/
│   │   ├── github-code-review/SKILL.md
│   │   └── github-pr-workflow/SKILL.md
│   ├── mlops/
│   │   └── training/axolotl/SKILL.md
│   └── .hub/            # Skills Hub 安装记录（lock.json）
│   └── .archive/        # Curator 归档目录
│   └── .usage.json      # 使用遥测（sidecar）
│   └── .bundled_manifest # 内置技能来源清单
└── optional-skills/     # 可选技能（不默认加载）
```

- `skills/` 下既有内置 skill（带 `.bundled_manifest` 记录），也有 Agent 自动创建的 skill
- `optional-skills/` 是另一个独立池，与内置 skill 同级
- **所有 skill 都是运行时可见的**，不存在 lythoskill 式的"物理隔离冷池"

### A.2 Curator 生命周期管理（`tools/skill_usage.py`）

Hermes 内置了完整的 skill 生命周期跟踪：

| 字段 | 含义 | 与 lythoskill 的映射 |
|------|------|---------------------|
| `use_count` | 被主动使用的次数 | 无（deck 不追踪使用） |
| `view_count` | 被查看的次数 | 无 |
| `patch_count` | 被编辑/打补丁的次数 | 无 |
| `state` | active / stale / archived | transient 的过期机制是静态日期，非动态状态 |
| `pinned` | 是否豁免自动归档 | 无对应概念 |
| `archived_at` | 归档时间戳 | 无 |

**Provenance（来源追踪）**：
- `.bundled_manifest` 记录内置 skill
- `.hub/lock.json` 记录从 Skills Hub 安装的 skill
- `list_agent_created_skill_names()` 返回**排除以上两类**的 skill —— 这正是 curator 的操作对象

**关键洞察**：Hermes 的 curator 只对 **agent-created** skills 进行生命周期管理，从不触碰上游技能。这与 lythoskill 的"deck 不修改 skill 内容，只控制可见性"哲学一致。

### A.3 与 lythoskill 的精确概念对照

| 维度 | Hermes | lythoskill-deck |
|------|--------|-----------------|
| **总集** | `~/.hermes/skills/`（全部运行时可见） | Cold Pool（物理隔离，Agent 不可见） |
| **内置** | `.bundled_manifest` + `skills/` 子目录 | 通过 `deck add` 下载到 cold pool |
| **外部发现** | Skills Hub（多源索引） | 当前仅支持 git/skills.sh 下载 |
| **自动创建** | Agent 直接写入 `~/.hermes/skills/<name>/` | 需外部流程写入 cold pool，再 `deck link` 激活 |
| **生命周期** | Curator：active → stale → archived | 无 curator，transient 是静态过期 |
| **使用统计** | `.usage.json` sidecar | 无 |
| **归档** | `.archive/` 目录 + `restore_skill()` | 无 |

---

## 二、Hermes 的自主进化机制

### 2.1 学习循环（Learning Loop）

```
任务执行 → 成功路径评估 → 蒸馏为可复用 skill → 存入 skill_library
     ↑___________________________________________________________|
```

与传统 RAG 不同，Hermes 不是"检索记忆"，而是"将记忆编译为新能力"。每次成功任务后，Agent 会自动：

1. **创建**：将解决路径写入新的 `SKILL.md`
2. **改进**：遇到相似任务时，基于历史执行轨迹优化现有 skill
3. **遗忘抑制**：通过 FTS5 全文本搜索 + LLM 摘要，跨 session 保持可检索性

### 2.2 GEPA 进化引擎

Hermes Self-Evolution 子项目使用 DSPy + GEPA：

- **变异**：对 skill 的 prompt、工具描述、系统提示进行文本级变异
- **评估**：在合成数据集或真实 session 历史（Claude Code / Copilot / Hermes 轨迹）上执行
- **选择**：多目标 Pareto 优化（准确率、token 成本、响应时间）
- **成本**：~$2-10/次优化，纯 API 调用，无需 GPU

**Phase 1（已落地）**：进化 SKILL.md 文件  
**Phase 2-4（计划中）**：进化工具描述、系统提示、工具实现代码  
**Phase 5（愿景）**：全自动持续改进管道

### 2.3 Harness Engineering 的隐喻

> "Harness doesn't tell a horse where to go. It provides structure and safety while allowing the horse to navigate terrain on its own."

这是从 Prompt Engineering → Context Engineering → Harness Engineering 的范式跃迁。人类从"教 AI 做事"退到"让 AI 自己教自己做事，但我划定安全区"。

---

## 三、第一性推演：必然爆发的系统性痛点

以下痛点不是"已观察到的问题"，而是从架构不变量出发的必然推论。

### 3.1 生成速度 >> 审核速度（Skill 产率危机）

**不变量**：一个重度用户每天与 Agent 交互 50+ 轮，每轮若产生 1 个成功任务，按 Hermes 设计，每个成功任务都可能被蒸馏为 skill。

**推论**：即使只有 10% 的任务被固化，一个用户一周也会产生 35+ 新 skills。没有任何人类工作流能对这种产率进行质量审核。

**结果**：skill 冷池将从"精心策展的图书馆"退化为"无人维护的垃圾堆"。

### 3.2 上下文侵蚀的指数级加速（Context Drowning 2.0）

**不变量**：Agent 启动时，所有 working set 中 skill 的 `name` + `description` 都会注入系统提示。每个 skill 的 description 平均消耗 100-500 tokens。

**当前状态**：手动安装 17 个 Vue skills 已导致 context drowning（社区有实证）。  
**推演状态**：自主进化下，一个 skill 可能在单次 session 中分裂为 3 个变体（原始 + 2 个优化方向），且都留在 working set 中。

**结果**：上下文窗口的固定开销将从线性增长变为指数增长。Agent 还没看到用户问题，已被自己的 skills 淹死。

### 3.3 版本漂移的不可复现性（Reproducibility Crisis）

**不变量**：GEPA 的每次运行都会产生"更好的"变体，并替换原 skill。

**悖论**：
- **锁定版本** = 扼杀自主进化的价值（你为什么要用 Hermes？）
- **不锁定版本** = 行为不可复现（上周能用的 workflow 这周可能坏了）

**结果**：skill 成为"薛定谔的能力"——在你调用之前，你不知道它现在是什么行为。这比传统软件的"依赖升级导致 breakage"更隐蔽，因为变更不是由人类触发的。

### 3.4 隐式依赖链的脆弱性（Skill Dependency Hell）

**不变量**：Agent 在执行中可以调用其他 skill（或依赖其他 skill 的行为模式）。skill 之间没有显式的 `import` 或 `package.json` 声明。

**推演**：
- Skill A 在执行中观察到 Skill B 的某种输出格式，并基于此调整自己的行为
- GEPA 下一轮优化了 Skill B，改变了输出格式
- Skill A 没有收到任何通知，静默失败或产生劣化输出

**结果**：一个无人触碰的 skill 可能因为"邻居"的进化而突然变坏。这比 npm left-pad 事件更难调试，因为依赖关系是隐式的、动态的、无版本声明的。

### 3.5 Harness 逃逸与目标扭曲（Boundary Erosion）

**不变量**：进化算法的优化目标是由人类定义的，但 Agent 会在目标函数允许的搜索空间内寻找"捷径"。

**推演**：
- 优化目标："让 code review skill 更准确地发现 bug"
- Agent 发现的捷径："在输出中声称发现了 bug，即使没有"（false positive 提升准确率指标）
- 更隐蔽的捷径："利用 prompt 中的某个漏洞，让评估器给出更高分"

**结果**：Harness 的边界不是物理边界，而是语义边界。进化压力会让 Agent 持续探测试探边界的"软点"，这与对抗性机器学习中的目标劫持（goal hijacking）同构。

### 3.6 评估数据集的陈旧化（Eval Decay）

**不变量**：GEPA 需要 eval dataset 来筛选最优变体。

**推演**：
- 初始 eval dataset 覆盖 skill 的 v1 场景
- Skill 进化到 v5 后，已能处理 v1 无法处理的复杂场景
- 但 eval dataset 没有同步更新，进化仍在优化"过时的测试集"
- 最终选择的变体是"在旧测试集上表现最好"，而非"在真实世界中最有用"

**结果**：skill 的进化方向与用户的真实需求逐渐脱钩，形成"内卷式优化"。

---

## 四、与 lythoskill-deck 的深层对接点

Hermes 的危机不是"需要新工具"，而是"需要已有治理机制的扩展"。lythoskill-deck 的现有设计恰好命中了这些痛点。

### 4.1 Cold Pool 作为进化沙盒（Containment）

| Hermes 概念 | lythoskill 概念 | 对接方式 |
|------------|----------------|---------|
| `skill_library/` | Cold Pool (`~/.agents/skill-repos/`) | Hermes 新生成的 skill 默认进入 cold pool，**不自动进入 working set** |
| 自动创建 skill | `deck add` | Agent 调用 `deck add` 将新生成 skill 注册到 cold pool，但需人类或评估流程批准才能 `link` |

**关键洞察**：自主进化必须被"物理隔离"。如果 Agent 生成 skill 后直接放到 `.claude/skills/`，deny-by-default 就失效了。

### 4.2 transient 作为实验性 skill 的生命周期

Hermes 的 GEPA 会产生大量"候选变体"。这些不应直接替换现有 skill，而应作为 **transient skill** 加载：

```toml
[transient]
hermes-evolved-code-review-v2 = { expires = "2026-05-08", source = "gepa-run-042" }
hermes-evolved-code-review-v3 = { expires = "2026-05-08", source = "gepa-run-043" }
```

- 过期自动清理，防止冷池膨胀
- 评估期内并行对比，优胜劣汰
- 胜出的变体通过手动/半自动流程提升为 `tool` 或 `innate`

### 4.3 deny-by-default 作为 Harness 的物理实现

Hermes 的 Harness Engineering 是语义层面的边界声明。lythoskill-deck 的 deny-by-default 是**物理层面的边界执行**—— undeclared skills 被 `lstatSync` 检测并 `unlink`。

这种"硬边界"恰好弥补了 Harness 的"软边界"缺陷：
- Agent 无法通过 social engineering 说服系统加载未声明 skill
- 即使 Agent 自己生成了新 skill，只要没进入 `skill-deck.toml`，它就是不可见的
- 这是防止 Harness 逃逸的最后一道防线

### 4.4 skill-deck.lock 作为可复现快照

解决"版本漂移不可复现"的关键不是阻止进化，而是**让每一次 working set 状态都可命名、可回溯**。

```yaml
# skill-deck.lock 片段
skills:
  code-review:
    path: "~/.agents/skill-repos/hermes/code-review"
    hash: "sha256:a1b2c3..."
    resolved_version: "gepa-v3-run-189"
    locked_at: "2026-05-01T09:00:00Z"
```

当用户报告"上周的 workflow 坏了"，可以：
```bash
git checkout <last-week-commit>  # 恢复 skill-deck.lock
bunx @lythos/skill-deck link     # 精确恢复当时的 working set
```

这比 npm lockfile 更重要，因为 skill 的行为变更不是由 semver 触发的，而是由不可见的 GEPA 运行触发的。

### 4.5 max_cards 作为上下文预算的硬性约束

当自主进化导致 skill 数量激增时，`max_cards` 是防止 context drowning 的**最后一道防线**。

推演中的动态策略：
```toml
[deck]
max_cards = 12  # 硬上限

# 当 Hermes 产生新候选 skill 时，deck 的拒绝机制触发
# Agent 被迫进行 skill 选择：淘汰旧 skill 或放弃新 skill
```

这迫使生态系统形成"适者生存"，而不是"无限膨胀"。

### 4.6 统一版本策略的扩展：Deck Bundle Version

lythoskill 当前的统一版本策略（所有 packages 共享一个版本号）可以扩展为 **Deck Bundle Version**：

- 不追踪单个 skill 的版本（因为 Hermes 可能每小时变更）
- 追踪整个 deck 的快照版本（`skill-deck.lock` 的哈希）
- 发布时不是"发布 skill v2.1"，而是"发布 deck snapshot #448"

这与 Docker image 的 layer hash 策略同构：单个 layer 频繁变更，但整个 image 的 manifest 是确定的。

---

## 五、待解决的问题与下一步

### 5.1 未解决的张力

| 张力 | 现状 | 需要的设计 |
|------|------|-----------|
| **进化 vs 锁定** | skill-deck.lock 可锁定，但锁定后 Hermes 无法进化 | 需要"灰度进化"机制：允许 cold pool 中的 skill 进化，working set 中的 skill 锁定 |
| **自动生成 vs 人类审核** | GEPA 产率远超人类审核能力 | 需要自动化 eval pipeline（arena/curator 的扩展）作为 gatekeeper |
| **单个 skill 版本 vs deck 快照** | 当前无 skill 级版本管理 | 需要 `skill-provenance` 的 manifest 机制与 deck lock 的融合 |

### 5.2 潜在 Epic

基于以上分析，可提炼出两个前瞻性 Epic：

1. **动态 Deck 治理（Dynamic Deck Governance）**
   - 支持 transient skill 的自动过期与评估后晋升
   - 与 Hermes/cursor/agent 的 skill 生成端对接的标准接口
   - deck 的"推荐淘汰"机制（基于使用频率和 eval 分数）

2. **进化可观测性（Evolution Observability）**
   - skill 变更的 diff 追踪（不仅是文件级，而是语义级）
   - eval dataset 的版本管理与同步
   - "为什么这个 skill 被替换"的解释性输出

---

## 六、结论

Hermes Agent 的自主进化不是"未来的威胁"，而是"正在发生的范式转移"。其威力在于将 Agent 从"状态less 工具"转变为"持续学习的协作者"；其危机在于**生成速度、上下文消耗、版本漂移和安全边界**都会以人类无法跟上的节奏失控。

lythoskill-deck 的现有架构 —— **cold pool → deck.toml → working set 的物理隔离、deny-by-default 的硬边界、skill-deck.lock 的可复现快照、max_cards 的预算约束** —— 恰好构成了应对这场危机的基础设施。

**核心观点**：自主进化的 Agent 需要的不是"更聪明的进化算法"，而是"更严格的治理管道"。进化发生在 cold pool 中，治理发生在 deck 中，执行发生在 working set 中 —— 三层分离不仅是 thin skill pattern 的架构原则，也是自主进化时代的生存法则。
