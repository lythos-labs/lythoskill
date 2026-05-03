# Hermes 自进化 Skill 田野笔记：社区玩法与 lythoskill 对接

> 类型: 田野调查 | 关联: [hermes-agent-skill-evolution-and-deck-governance](./hermes-agent-skill-evolution-and-deck-governance.md), [hermes-deck-interop-junction](./hermes-deck-interop-junction.md)
>
> 来源: Hermes 官方文档、GitHub 社区项目（hermes-skill-factory、hermes-agent-self-evolution、Speedrunlab）、Issues 讨论

---

## 一、社区玩法的四层现实

Hermes 生态围绕"自进化 skill"已经形成了四条独立运作的线，不是未来设想，是今天就能 clone 运行的项目。

### 1.1 实时线：主仓库的 `skill_manage`

Hermes Agent 本体（`NousResearch/hermes-agent`）在每次任务完成后，内部调用 `skill_manage` 工具自主创建或修改 skill。

**触发条件**（官方文档明确列出）：
- 任务成功完成且调用了 5+ 个工具
- 任务中遇到错误/死胡同，但找到了可行路径
- 用户纠正了 Agent 的做法
- 发现了非平凡的 workflow

**动作集**：

| Action | 用途 | 关键参数 |
|--------|------|---------|
| `create` | 从零创建新 skill | `name`, `content`（完整 SKILL.md）, `category` |
| `patch` | 针对性修复（优先） | `name`, `old_string`, `new_string` |
| `edit` | 大规模重写 | `name`, `content`（全量替换） |
| `delete` | 删除 skill | `name` |
| `write_file` | 添加/更新附属文件 | `name`, `file_path`, `file_content` |
| `remove_file` | 删除附属文件 | `name`, `file_path` |

**关键细节**：`patch` 被官方明确标注为"preferred for updates"——因为比 `edit` 更省 token，只有变更文本出现在 tool call 中。

**输出位置**：`~/.hermes/skills/<category>/<name>/SKILL.md`，直接写入运行时可访问目录，无人工 gate。

### 1.2 社区插件线：hermes-skill-factory（Romanescu11，178⭐）

不是官方功能，是社区贡献的 meta-skill，但已被 HermesHub 收录。

**工作机制**：
- 被动观察：静默跟踪 session 中的 tool calls 和 commands
- 模式检测：发现可重复的工作流序列
- 主动提议：在适当时机弹出 TUI 提示，用户选 A/B/C/D
- 一键生成：用户确认后同时输出 SKILL.md + plugin.py

**与主仓库的区别**：

| 维度 | 主仓库 `skill_manage` | hermes-skill-factory |
|------|----------------------|---------------------|
| 触发 | 任务结束后自动判断 | 检测到重复模式后主动提议 |
| 交互 | 无用户确认，静默写入 | TUI 确认，用户可控 |
| 输出 | 仅 SKILL.md | SKILL.md + plugin.py |
| 目标 | 固化单次成功经验 | 提取跨 session 的重复 workflow |

### 1.3 离线优化线：hermes-agent-self-evolution（Nous Research 官方）

独立子项目，不是主仓库内置。设计意图刻意与日常运行分离。

**五阶段路线**（官方明确标注状态）：

| Phase | 目标 | 引擎 | 状态 |
|-------|------|------|------|
| 1 | Skill 文件（SKILL.md） | DSPy + GEPA | ✅ 已实现 |
| 2 | 工具描述 | DSPy + GEPA | 🔲 计划中 |
| 3 | 系统提示片段 | DSPy + GEPA | 🔲 计划中 |
| 4 | 工具实现代码 | Darwinian Evolver | 🔲 计划中 |
| 5 | 全自动持续改进管道 | 自动化流水线 | 🔲 计划中 |

**Guardrails**（全部通过才生成 PR）：
1. 完整测试通过
2. 大小限制（skill ≤15KB，工具描述 ≤500 chars）
3. 缓存兼容性（不修改 mid-conversation 状态）
4. 语义保留（不偏离原始目的）
5. **PR 人工审核**（从不直接 commit）

**成本**：~$2-10/次优化运行，纯 API 调用，无 GPU。

**关键设计决策**：
- 独立子项目而非内置：进化需要高频 LLM 调用，分离可独立计费、独立升级
- 离线批量而非实时：反思式优化是重计算任务，不适合嵌入实时响应路径
- PR 审核而非自动生效：刻意保留人类最终控制权

### 1.4 策展线：Curator（官方内置）

Curator 只对 **agent-created skills** 生效，从不碰 bundled skills 或 hub-installed skills。

**触发条件**：
- 间隔 7 天（`interval_hours`）
- Agent idle 2 小时（`min_idle_hours`）
- 首次安装不立即运行，先 seed `last_run_at`，延迟一个完整周期

**两阶段运行**：

**Phase 1 — 自动过渡（确定性，无 LLM）**：
- unused 30 天 → `stale`
- unused 90 天 → 移入 `~/.hermes/skills/.archive/`

**Phase 2 — LLM 审查（辅助模型 fork）**：
- `max_iterations=8`
- forked agent 可 `skill_view` 任意 agent-created skill
- 决定：keep / patch（via `skill_manage`）/ consolidate（合并重叠 skill）/ archive

**豁免机制**：`pinned` skills 不可被自动过渡和 LLM 审查触碰。

**预览**：`hermes curator run --dry-run` 可生成审查报告而不修改 library。

### 1.5 跨平台移植线：Hermes Agent as a skill file（Speedrunlab）

社区项目，把 Hermes 的学习循环模式提取成 portable SKILL.md，drop 到任何 agentskills.io 兼容 agent 即可使用。

**封装的能力**：
- Auto skill creation（复杂任务后起草 reusable skill，等待操作员审核）
- Periodic self-checks（每 15 次 tool call 暂停评估）
- Skill refinement（过时 skill 提出 patch，操作员批准后才应用）
- Memory flush before context loss
- Memory capacity management（80%/90%/95% 三级阈值 + consolidation 规则）
- Cross-session recall
- Compound learning（错误结构化，重复错误升级）
- Skill versioning and lifecycle（语义版本、废弃、回滚）
- Governance hierarchy（skill/memory/lesson 冲突时的显式解析顺序）
- Inter-agent skill sharing（操作员门控激活的跨 agent 导入/导出）

**意义**：Hermes 的自进化模式正在被"skill 化"，成为可移植到其他 agent 框架的 instruction set。

---

## 二、与 lythoskill 已有机制的对接手册

不是"lythoskill 能解决什么问题"，而是"社区已有的这些玩法，怎么和 lythoskill 已有的命令/文件自然衔接"。

### 2.1 实时创建 skill → `deck add` + `transient`

**Hermes 行为**：Agent 完成任务后，`skill_manage create` 直接写入 `~/.hermes/skills/<name>/`。

**lythoskill 对接**：

```bash
# 假设 Hermes 生成了 deploy-flask-to-aws skill
# 用户想试用，但不承诺长期保留

# Step 1: 注册到 cold pool（已有能力）
bunx @lythos/skill-deck add ~/.hermes/skills/deploy-flask-to-aws

# Step 2: 声明为 transient（已有能力）
# skill-deck.toml:
[transient.deploy-flask-trial]
skills = ["deploy-flask-to-aws"]
expires = "2026-05-15"

# Step 3: 激活
deck link
```

**对接点**：Hermes 的"直接写入"和 lythoskill 的"cold pool + deck.toml 声明"形成互补——Agent 负责生产，deck 负责准入控制。

### 2.2 hermes-skill-factory → `deck add` + 版本锁定

**Hermes 行为**：skill-factory 生成 SKILL.md + plugin.py，用户确认后写入目录。

**lythoskill 对接**：

```bash
# skill-factory 输出到 ~/.hermes/skills/software-development/python-env-setup/
# 用户试用后认为质量合格，决定纳入长期 deck

# 1. 注册到 cold pool
deck add ~/.hermes/skills/software-development/python-env-setup

# 2. 提升为 tool（从 transient 转正）
# skill-deck.toml:
[tool]
skills = ["python-env-setup"]

# 3. link 后 skill-deck.lock 自动记录 hash
# 如果 skill-factory 后续生成改进版，lock 会检测到变化
```

**关键细节**：skill-factory 生成的 plugin.py 不是 agentskills.io 标准内容，deck link 的过滤机制（排除 dev 文件）会自动处理——plugin.py 不会被链入 working set，只有 SKILL.md 进入。

### 2.3 GEPA 候选变体 → `transient` 并行对比

**Hermes 行为**：hermes-agent-self-evolution 的 Phase 1 会产生多个候选变体（gepa-run-042, gepa-run-043...）。

**lythoskill 对接**：

```toml
# skill-deck.toml
[deck]
max_cards = 12

[tool]
skills = ["github-code-review"]  # 当前稳定版

[transient.gepa-v2-trial]
skills = ["github-code-review-gepa-v2"]
expires = "2026-05-10"

[transient.gepa-v3-trial]
skills = ["github-code-review-gepa-v3"]
expires = "2026-05-10"
```

**arena 衔接**：用 `lythoskill-arena` 对三个版本跑同一批任务，evaluator 打分，胜出者转正。

### 2.4 Curator 归档 → cold pool 天然隔离

**Hermes 行为**：Curator 将 unused skill 移入 `~/.hermes/skills/.archive/`。

**lythoskill 现状**：cold pool 本身就是"物理隔离的归档层"，curator 的 `.archive/` 和 cold pool 是同一概念的不同实现。

**自然融合**：

```
Hermes curator 归档路径: ~/.hermes/skills/.archive/
lythoskill cold pool 路径:   ~/.agents/skill-repos/

建议约定: 让 cold pool 的 scan 逻辑也覆盖 ~/.hermes/skills/.archive/
          这样被 curator 归档的 skill 不会从 lythoskill 的索引中消失
          只是从 working set 中不可见（已经是默认行为）
```

### 2.5 max_cards 与 Memory capacity management 的阈值对照

Speedrunlab 的 skill-file 实现了 80%/90%/95% 三级 memory threshold。lythoskill 的 `max_cards` 是硬数量约束，两者可形成互补：

| Speedrunlab 阈值 | lythoskill 对应机制 | 协作方式 |
|-----------------|-------------------|---------|
| 80% — 预警 | `max_cards` 接近时的 CLI warning | deck link 在预算 80% 时输出黄色警告 |
| 90% — consolidation | `align` 命令的 audit | `bunx @lythos/skill-creator align` 检查冗余 skill |
| 95% — 强制 flush | `max_cards` 硬超限 → exit 1 | deck link 拒绝执行，强制用户删减 |

---

## 三、社区项目的具体参数（一手数据）

### hermes-skill-factory

- **Repo**: `Romanescu11/hermes-skill-factory`
- **Stars**: 178
- **Requirements**: Hermes Agent v2026.3+
- **输出结构**:
  ```
  ~/.hermes/skills/<category>/<name>/SKILL.md
  ~/.hermes/plugins/<name>.py
  ```
- **安装**: `bash install.sh` 或手动复制 SKILL.md + plugin.py
- **激活**: `hermes skills reload && hermes skills enable skill-factory`

### hermes-agent-self-evolution

- **Repo**: `NousResearch/hermes-agent-self-evolution`
- **License**: MIT
- **依赖**: DSPy + GEPA
- **快速启动**:
  ```bash
  export HERMES_AGENT_REPO=~/.hermes/hermes-agent
  python -m evolution.skills.evolve_skill \
    --skill github-code-review \
    --iterations 10 \
    --eval-source sessiondb  # 或 synthetic
  ```
- **输出**: Git 分支 + PR，不直接修改目标仓库

### Speedrunlab / Hermes Agent as a skill file

- **Repo**: `Speedrunlab/hermes-agent-as-a-skill-file`
- **License**: MIT
- **核心洞察**: "Upgrade your existing agent, no need to migrate"
- **输出**: 单个 SKILL.md，可 drop 到 OpenClaw、NemoClaw、Claude Code 等任何 agentskills.io 兼容框架

---

## 四、对接时需要注意的真实摩擦点

不是"问题"，是集成时必然会遇到的格式/语义差异。

### 4.1 `allowed-tools` 格式差异

- **agentskills.io 标准**: space-separated string
- **Claude Code / lythoskill 实践**: YAML 数组 `["Bash(...)", "ReadFile(...)"]`
- **影响**: Hermes 解析器读到数组格式时可能静默忽略，或报错
- **建议**: 社区投稿前，用已有的 `yaml` 依赖解析 frontmatter，检测 `allowed-tools` 类型，统一为字符串格式

### 4.2 目录嵌套深度

- **Hermes**: `<category>/<name>/SKILL.md`（双层，如 `github/github-code-review/`）
- **lythoskill flat scan**: 递归扫描 cold pool，支持嵌套，但 `skill-deck.toml` 中声明时需要用 FQ 路径或 bare name
- **摩擦**: `github-code-review` 在 Hermes 中路径是 `github/github-code-review/`，在 lythoskill 的 flat fallback 中可能被解析为 `github-code-review`
- **建议**: deck.toml 中使用 FQ locator（`github.com/owner/repo/github/github-code-review`）避免歧义

### 4.3 Skill 名与目录名不匹配

- **agentskills.io 硬性规则**: `name` 字段必须匹配父目录名
- **lythoskill 现状**: `project-cortex` skill 的目录是 `lythoskill-project-cortex/`，但 frontmatter 中 `name: project-cortex`
- **影响**: Hermes 的 `skill_view` 和严格解析器会拒绝加载
- **建议**: 投稿社区前统一修正

### 4.4 `type` 字段的扩展使用

- **agentskills.io v1**: 无 `type` 字段
- **lythoskill 实践**: `type: standard` 用于区分 skill 类别
- **Hermes**: 官方 skill 在 metadata 中用 `category`（如 `software-development`）
- **影响**: 不致命，但多 Agent 共享时会造成 frontmatter 膨胀
- **建议**: `type` 和 `category` 并存，或统一收敛到 `metadata.category`

---

## 五、结论

Hermes 社区的自进化 skill 不是单一路线，而是**四条线并行**的生态系统：

1. **实时创建**（主仓库 `skill_manage`）— 无 gate，直接写入
2. **社区插件**（skill-factory）— 用户确认后生成 SKILL.md + plugin.py
3. **离线优化**（self-evolution）— PR 审核制，DSPy+GEPA
4. **生命周期策展**（Curator）— 自动归档 + LLM 审查

lythoskill 已有的机制——`deck add` 注册、`transient` 试用、`deck link` 激活、`skill-deck.lock` 锁定、`max_cards` 硬约束——**不需要新增功能**就能自然对接这个生态。对接的核心动作只是：

- 把 Hermes 的产出目录（`~/.hermes/skills/`）纳入 cold pool 扫描范围
- 用 `transient` 承接 Hermes 自动生成和 GEPA 候选变体
- 用 `arena` 对候选变体做 Pareto 对比
- 用 `align` 做定期审计（对应 Speedrunlab 的三级 threshold）

这不是"lythoskill 需要变成什么"，而是"lythoskill 已有的牌怎么打"。
