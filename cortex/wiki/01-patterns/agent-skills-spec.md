# Agent Skills 开放格式规范

> Agent Skills 由 **Anthropic (Claude)** 提出并维护为开放标准，**Kimi Code CLI** 已实现该规范。
> 本页提取两者共识作为基线，其他平台差异仅作简要对照。

---

## 1. 起源与基线

Agent Skills 是 Anthropic 定义的开放格式，用于让 AI Agent 获得特定领域能力。核心思想极其简单：

> **一个包含 `SKILL.md` 的文件夹就是一个 skill。**

Kimi Code CLI 完整实现了这一标准，并在此基础上增加了分层加载、品牌组/通用组等机制。

---

## 2. 最大公约数目录结构

Claude 与 Kimi 完全一致的结构：

```
skill-name/
├── SKILL.md           # 必需：YAML frontmatter + Markdown 指令
├── scripts/           # 可选：可执行脚本
├── references/        # 可选：参考文档
└── assets/            # 可选：模板、图片等
```

**唯一必需的是 `SKILL.md`**。

### SKILL.md 最小格式

```markdown
---
name: skill-name
description: 精确描述何时触发、何时不触发
---

# Skill Title

Instructions for the agent.
```

- `name`: skill 标识符，同一作用域内唯一
- `description`: agent 路由决策的依据

---

## 3. Skill 发现路径

### Claude
- 项目级：`.claude/skills/`
- 用户级：`~/.claude/skills/`

### Kimi
- 项目级：`.kimi/skills/` 或 `.agents/skills/`
- 用户级：`~/.kimi/skills/` 或 `~/.config/agents/skills/`
- 支持 `--skills-dir` 参数指定额外路径

**共识**：项目级 skill 随代码仓库走，用户级 skill 跨项目复用。

---

## 4. Progressive Disclosure（渐进加载）

Claude 与 Kimi 均采用三级加载：

1. **元数据层**（~100 tokens）：`name` + `description` 常驻 system prompt
2. **SKILL.md 主体**（建议 < 5000 tokens）：任务匹配时加载
3. **资源层**（按需）：scripts/、references/、assets/ 动态读取

---

## 5. 其他平台差异（仅作参照）

| 平台 | 差异点 | lythoskill 态度 |
|------|--------|----------------|
| OpenAI Codex | 增加 `agents/openai.yaml`；Plugins 捆绑分发 | 不支持专属扩展，保持最大公约数 |
| Microsoft | C#/Python SDK、class-based skills | 不支持，保持文件系统技能 |
| Cursor | 扫描 `.cursor/skills/` | 安装时 copy 到对应路径即可 |
| Skilldex | `skills.json` manifest | 由 npm/pip 替代依赖解析 |

---

## 6. lythoskill 的特定增强

在 Claude/Kimi 基线之上：

| 特性 | 说明 |
|------|------|
| **Build Pipeline** | `lythoskill build` 从开发态生成发布态 skill |
| **Thin Skill Pattern** | 重逻辑下沉到 npm/pip 包，skill 层只保留 router |
| **三层分离** | Starter（实现）/ Skill（路由）/ Dist（发布） |
| **时间戳 ID** | `PREFIX-yyyyMMddHHmmssSSS`，无中心数据库 |
| **Schema → Doc** | 预留从 CLI schema 自动生成 SKILL.md 的扩展点 |

生成的 dist 目录可直接用于 Claude、Kimi、Cursor 等任何支持 Agent Skills 标准的平台。

---

## 参考

- Agent Skills 开放规范: https://agentskills.io
- Claude Skills: https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview
- Kimi Code Skills: https://www.kimi.com/code/docs/kimi-code-cli/customization/skills.html
