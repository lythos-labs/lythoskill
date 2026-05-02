# Pattern: Smart Agent, Dumb Tools

> 别名：编排在上，计算在下 / Agent 即 IoC 容器

## 问题

开发 skill 时常见诱惑：**把需要"理解"的逻辑下沉到 CLI**。

- CLI 里写正则匹配用户意图
- CLI 里接 OpenAI API 做 NL→DSL 转换
- CLI 里写状态机编排多步 workflow
- CLI 里写条件分支决定调用哪个子命令

结果：
1. **重复建设** — agent 已经有 LLM 的 NLU 能力，CLI 再写一个劣化版
2. **context 割裂** — CLI 看不到对话历史，agent 看得到
3. **副作用失控** — 每个 CLI 各自发 API 请求，计费、限流、配置爆炸
4. **僵化** — 正则覆盖不了边界 case，改 parser 比改 prompt 难十倍

## 原则

```
┌─────────────────────────────────────────┐
│  Agent（智能层）— 编排、理解、决策         │
│  · 何时调用什么工具                       │
│  · 怎么处理模糊输入                       │
│  · 怎么从错误恢复                         │
│  · 怎么利用对话上下文                     │
└────────────┬────────────────────────────┘
             │ 结构化输入 / 明确指令
┌────────────▼────────────────────────────┐
│  CLI（工具层）— 纯函数、无副作用           │
│  · 输入确定 → 输出确定                    │
│  · 不调用 LLM API                        │
│  · 不写 parser / 状态机 / 条件分支        │
│  · 不保留状态                             │
└─────────────────────────────────────────┘
```

### 编排发生在 SKILL.md

SKILL.md 不是"CLI 的使用手册"，它是 **agent 的编排脚本**。

```markdown
## 工作流程

1. 先调用 `mermaid-validate` 检查语法
2. 如果有效，调用 `mermaid-render` 生成 SVG
3. 如果用户提到"深色主题"，读取 `tokens.json` 并传给 render
4. 如果无效，把错误信息展示给用户，不要自动修复
```

agent 读到这里，自己决定什么时候调用什么。不需要 CLI 里写 `if (valid) render() else error()`。

### CLI 是函数式的

| CLI 该做 ✅ | CLI 不该做 ❌ |
|---|---|
| 语法解析（确定性的） | NLU（"这句话什么意思"） |
| SVG 渲染（确定性的） | 意图判断（"用户要图还是表"） |
| 文件格式转换 | 条件路由（"A 失败就试 B"） |
| Schema 校验 | 多步编排（"先做 X 再做 Y 再检查 Z"） |
| JSON 适配/归一化 | 从错误恢复（"重试 3 次后降级"） |

**铁律：如果这件事需要 "理解" 或 "选择"，它属于 agent；如果只需要 "计算" 或 "转换"，它可以下沉到 CLI。**

### 状态在 Agent

CLI 不保留状态。对话历史、中间结果、用户偏好 —— 全部在 agent 的上下文中。

```
❌ CLI 自己记状态：
   my-tool --resume-from-checkpoint-3

✅ Agent 记状态，CLI 只收当前输入：
   Agent: "上一步生成了 X，现在调用 render"
   CLI: render(x) → svg
```

### 例外：固化 SOP 可以下沉

如果某个 workflow 已经**完全固化**（输入确定 → 步骤确定 → 输出确定，本质是状态机），可以把它沉淀为代码或脚本。但 agent 的角色变成**门禁**（gatekeeper）：

- 检查输入是否满足前置条件
- 检查输出是否符合预期
- 异常时接管，不走固化路径

```
固化 SOP（状态机）          Agent 门禁
├── 步骤 A（确定）          ├── "输入合法吗？"
├── 步骤 B（确定）          ├── "输出符合 schema 吗？"
├── 步骤 C（确定）          └── "异常 → 我接管"
└── 输出（确定）
```

**判断标准**：如果改 workflow 的频率低于改代码的成本，它就是固化的，可以下沉。如果每次运行都需要微调策略，它就属于 agent。

## 类比：Agent 即 IoC 容器

| IoC / DI | lythoskill |
|---|---|
| Bean Registry | 冷池 (`~/.agents/skill-repos/`) |
| `@Configuration` | `skill-deck.toml` |
| `@Autowired` 注入点 | `.claude/skills/` 工作集 |
| Scope（Singleton/Prototype） | `innate` 常驻 vs `transient` 过期销毁 |
| `@Qualifier` / `@Primary` | `combo` 路由 — 同 niche 多实现，条件选择 |
| Profile（dev/prod） | `arena` 隔离 — 临时上下文切换 |
| `ClassNotFound` | `❌ Skill not found` — deny-by-default |
| 接口 | Schema 契约（design-system token 格式） |
| 实现替换 | 换 `theme-factory` 为 `acme-design-system`，接口不变 |

和传统 IoC 一样：**容器（agent）决定"用什么"，bean（CLI）只管"做它该做的"**。

## 反模式

### Fat CLI

```typescript
// ❌ CLI 自己接 API、自己做 NLU、自己编排
export async function describe(input: string) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const prompt = `把这句话转成 mermaid: ${input}`
  const res = await openai.chat.completions.create({...})
  return parseMermaid(res.choices[0].message.content)
}
```

问题：
- 需要 `OPENAI_API_KEY`
- 需要 prompt engineering
- 需要 parse/容错
- 看不到 agent 已有的对话上下文
- 和 agent 能力 100% 重叠

### 劣化 Parser

```typescript
// ❌ 用正则/状态机模拟 agent 的自然语言理解
const match = input.match(/画.*(图|流程|时序)/)
if (match) return generateFlowchart(input)
```

问题：
- "帮我画个登录的时序" 匹配不到
- "用 class diagram 表示这个领域模型" 匹配不到
- 每新增一种图表类型都要改 parser
- agent 本来就会做这件事，不需要 CLI 重复

### CLI 里写 Workflow

```bash
# ❌ CLI 自己决定调用链
my-tool process --auto-retry --fallback-to-b --notify-on-error
```

问题：
- 策略硬编码，agent 无法根据上下文调整
- "失败 3 次后通知"应该是 agent 判断"要不要通知"，不是 CLI 的配置项
- 同样的逻辑在 10 个 CLI 里重复 10 次

## 正确示例

### mermaid-describe（Agent 做智能）

SKILL.md：
```markdown
当用户用自然语言描述一个图表时：
1. 判断图表类型（flowchart / sequence / class / er）
2. 提取实体和关系
3. 输出标准 mermaid 语法
4. 先调用 `mermaid-validate` 确认语法有效
5. 再调用 `mermaid-render` 生成 SVG
```

CLI 里**什么都没有** —— 没有 API 调用，没有 parser，只有一个 `validate` 和 `render` 命令。

### design-system（Schema 作为防幻觉契约）

SKILL.md 告诉 agent：
```markdown
## Schema Mapping

| Token | SVG Target |
|-------|-----------|
| colors.primary | stroke on node borders |
| colors.surface | fill on node rects |
| typography.fontFamily | font-family on text |

### Sacred（不可触碰）
- viewBox、transform、path d、width/height
```

agent 读到这里，自己重写 SVG。schema 限制了 agent 能改什么，防止 hallucination。

CLI 只有一个 `adapt` 命令（JSON 归一化），没有 SVG 重写逻辑。

## 收益

1. **零配置 CLI** — 不需要 API key，不需要模型选择
2. **单一计费点** — 整个对话一个 session，不产生额外 LLM 调用
3. **上下文利用** — agent 记得前面聊过什么，CLI 不需要传 state
4. **灵活编排** — 改 workflow 改 SKILL.md 的 prompt，不改代码
5. **组合涌现** — agent 同时看到多个 skill，能发明出 skill 作者没想过的用法

## 相关

- [thin-skill-pattern](./thin-skill-pattern.md) — 开发态/发布态分层
- [skill-loading-lifecycle](./skill-loading-lifecycle.md) — skill 何时被加载到 agent 上下文
