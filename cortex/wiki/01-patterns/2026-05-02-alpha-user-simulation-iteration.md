# Pattern: Alpha User Simulation Iteration

> 状态: 🔄 进行中 | 关联: `lythoskill-arena`, `project-scribe`

## 问题

开源项目常犯的一个错误：**文档是作者写给作者的，不是写给陌生人的。** 作者知道所有隐含假设，新用户不知道。结果 README 看起来完整，实际用起来处处卡点。

传统用户测试的问题是：需要真实用户，耗时，反馈稀疏。

## 解决方案

用 **subagent 模拟陌生 alpha 用户**，作为持续迭代的反馈引擎：

```
发布 npm 包/GitHub release
      │
      ▼
spawn subagent: "你刚发现这个项目，什么都不知道"
      │
      ▼
subagent 只用公开渠道（npm registry, GitHub README, --help）
      │
      ▼
记录: 哪里顺畅 / 哪里卡壳 / 哪里需要猜
      │
      ▼
修复: README / SKILL.md / CLI help / 代码行为
      │
      ▼
重新发布 → 下一轮 simulation
```

## 具体做法

### 1. 设计 Simulation Prompt

关键约束：subagent **不能**读取项目源码，只能像真实用户一样用公开渠道：

```
You are a new developer who just discovered this project on GitHub.
You have NEVER seen this repo before.

Your goal:
1. Read the GitHub README
2. Install and run the tool using npm/bunx
3. Try the primary use case end-to-end
4. Report what worked, what broke, what was confusing

CRITICAL:
- Do NOT read any source files from the repo
- Do NOT use any insider knowledge
- Only use: npm registry, GitHub README, CLI --help
```

### 2. 关注点

| 维度 | 好的信号 | 坏的信号 |
|------|---------|---------|
| **First mile** | 5 分钟内跑通第一个命令 | 需要读源码才能知道怎么开始 |
| **Error messages** | 告诉用户怎么做 | 堆栈跟踪或 cryptic 错误 |
| **Path assumptions** | 命令在哪里都能跑 | 必须在特定目录或特定上下文 |
| **Implicit deps** | 依赖清晰列出 | 运行时才发现缺了某个工具 |
| **Docs ↔ Reality** | README 说的和实际一致 | README 过时或遗漏关键步骤 |

### 3. 第一轮发现（lythoskill 实践）

**2026-04-23 首轮 consumer test 发现：**

| 问题 | 影响 | 修复方向 |
|------|------|---------|
| `init` 在当前目录创建子目录，`build` 却期望从项目根运行 | 路径不一致，新用户困惑 | 统一 CLI 的 cwd 语义 |
| `deck link` 向上查找 `skill-deck.toml`，会污染父目录 | 新项目误用父仓库配置 | 添加 `--init` 模式或 cwd 边界检查 |
| `pnpm install` 在 sandbox 环境被拦截 | 子项目依赖安装失败 | 文档说明 `bun` 原生运行替代方案 |
| `cortex init` 和 `task/list/stats` 工作顺畅 | ✅ 这部分 UX 合格 | 保持 |

### 4. 迭代节奏

推荐每轮 simulation 聚焦一个 **首次接触场景**：

1. **零基础安装** — 只给 GitHub URL，看能否装起来
2. **从零创建 skill** — `init` → 写代码 → `build`
3. **Deck 治理** — 配置 `skill-deck.toml` → `link`
4. **Cortex 治理** — `init` → 创建 task → `list` → `stats`

每轮产出直接变成：
- README 的 Getting Started 章节
- CLI help 的补充说明
- `SKILL.md` 的 Usage 示例
- `cortex/wiki/02-faq/` 的新条目

## 为什么比传统测试好

| | 单元测试 | 集成测试 | Alpha Simulation |
|--|---------|---------|-----------------|
| 覆盖范围 | 函数正确性 | API 组合 | **完整用户旅程** |
| 假设检验 | "代码是否 work" | "API 是否兼容" | **"陌生人能否上手"** |
| 反馈源 | 断言 | 断言 | **真实 confusion** |
| 成本 | 写测试时间 | 环境搭建 | **一个 subagent prompt** |
| 产出 | bug 修复 | bug 修复 | **文档 + UX + bug** |

## 风险

1. **Subagent 不是真人**：可能错过某些人类特有的困惑（比如视觉设计、术语理解差异）
2. **Sandbox 限制**：subagent 的网络/文件限制可能比真实用户多，会误报问题
3. **过度迭代**：不要为了消除每一个小摩擦而增加复杂度 —— 有些"困惑"是学习成本，不是 bug

## 相关

- `cortex/wiki/01-patterns/thin-skill-pattern.md` — 被测试的核心架构
- `lythoskill-arena` — 类似的控制变量思想，用于技能比较而非 UX 测试
- `project-scribe` — 记录每轮 simulation 的发现，沉淀为项目记忆
