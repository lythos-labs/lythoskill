---
name: lythoskill-project-scribe
description: |
  项目书记 — 负责"写"项目记忆：产出单文件 Handoff，记录 Session 中发生的重要但未写入外部文档的事。

  与 project-onboarding（读）形成 CQRS 读写分离。

  核心理念：文件探索能恢复 ~70% 的上下文（项目结构、任务内容、决策）。
  Scribe 的价值是捕获那 ~30% 探索无法恢复的部分：踩过的坑、真实 working tree 状态、具体下一步。

  触发词："记录进度"、"更新任务"、"写日报"、"记个坑"、"完成事项"、"交接"、"session 要结束了"

  自动交接信号（session 结束前必须执行）：
  - 用户说"LGTM"、"就这样"、"先到这里"、"记录一下进度"
  - 对话超过 20 轮或 context 接近上限
  - 完成了一个明确的 milestone（如：成功 build、push 到 remote、通过测试）
  - 用户说"换个 agent 继续"、"session 要结束了"

type: standard
---

# 项目书记 (Project Scribe)

## 核心定位

> **负责"写"，与 project-onboarding（负责"读"）形成 CQRS 读写分离**
> **核心理念：Scribe 不是重复记录文件探索能恢复的内容，而是 dump session 中重要但未写入外部文档的事。**

就像医生写病历、护士记录体征，这个 skill 负责把**当前 session 的专属状态**写入记忆系统。

## Scribe 的价值边界

| 文件探索能恢复的 (~70%) | Scribe 应该 dump 的 (~30%) |
|------------------------|---------------------------|
| 项目结构和技术栈 | 本次 session 踩过的坑 |
| `skill-deck.toml` 的内容 | 真实 working tree 状态（防止 hallucination） |
| `cortex/` 中的 task/epic | 具体的下一步（不是"测试一下"） |
| `git log` 历史 | 临时 artifact 的位置和用途 |
| README 文档 | session 中做过但还没来得及提交的修改 |

**原则：如果下一个 agent 能通过 `ls` + `cat` + `git log` 自己找到，scribe 不需要重复记录。如果只有当前 session 的 agent 知道，必须 dump。**

## 交接前确认流程（必须执行）

在写 handoff 之前，按顺序确认：

1. **确认 git 状态**: `git status` — 哪些已提交、哪些未提交、哪些 untracked
2. **确认 cortex 状态**: `bun packages/lythoskill-project-cortex/src/cli.ts list` — 活跃的 epic/task
3. **确认 session 状态**: 回忆一下这个 session 里发生了什么重要但**还没写到任何外部文档**的事

**关键原则**：Handoff 不是"那一刻的照片"，而是"那一刻的照片 + 如何验证现在"的指令。
在 Handoff 的 `## 0. 验证当前状态` 中，必须提供以下命令：
- `git diff <handoff-commit> --stat` — 让读者自己构造"从 T0 到现在"的时间感
- `git status --short` — 确认 working tree 实时状态
- `git log --oneline -3` — 确认最近 commit 是否匹配

如果读者运行命令后发现输出与 handoff 不一致，说明 handoff 已过时。以实时输出为准。

```bash
# 1. Git 状态
$ git status
$ git log --oneline -5

# 2. Cortex 状态
$ bun packages/lythoskill-project-cortex/src/cli.ts list
$ bun packages/lythoskill-project-cortex/src/cli.ts stats

# 3. Session 状态
# 自我提问：
# - 我做过什么修改还没提交？
# - 我踩过什么坑？
# - 我做过什么重要决策？
# - 我创建了哪些临时文件/artifact？
# - 下一个 agent 最容易误解什么？
```

## 核心流程

### 流程 1: 产出 Daily + Handoff 合并文件（推荐）

将 session handoff 内容写入 `daily/YYYY-MM-DD.md`，作为当天的日报文件。Handoff 是该文件的第一个 section（`## Session Handoff`），人类工作日志接在后面。

```
用户：ession 要结束了，记录一下进度
    │
    ▼
┐──────────────────────────────────────────────────┒
│ 1. 确认 git 状态                               │
│    - git status 输出                                │
│    - git log --oneline -5                           │
└──────────────────────────────────────────────────┘
              │
              ▼
┐──────────────────────────────────────────────────┒
│ 2. 确认 cortex 状态                             │
│    - 活跃的 epic/task                              │
│    - 最近完成的里程碑                              │
└──────────────────────────────────────────────────┘
              │
              ▼
┐──────────────────────────────────────────────────┒
│ 3. 回忆 session 状态                             │
│    - 还没写到外部文档的重要事                      │
│    - 踩过的坑                                      │
│    - 做过的临时修改/artifact                       │
└──────────────────────────────────────────────────┘
              │
              ▼
┐──────────────────────────────────────────────────┒
│ 4. 填写 Daily 文件（含 Handoff section）          │
│    - 文件: daily/YYYY-MM-DD.md                     │
│    - 第一个 section 必须是 Session Handoff         │
│    - 重点填写 Pitfalls 和 Ground Truth State       │
└──────────────────────────────────────────────────┘
              │
              ▼
┐──────────────────────────────────────────────────┒
│ 5. 给用户确认 diff                              │
│    - 确认内容准确后再写入                         │
└──────────────────────────────────────────────────┘
```

### 流程 2: 记录坑点 (Pitfall)

当用户说"踩坑了"时，立即记录到 handoff 的 Pitfalls section。

```
用户：踩了个坑，playerKey 加时间戳会导致循环
    │
    ▼
┐──────────────────────────────────────────────────┒
│ 1. 更新 Handoff 的 Pitfalls 部分               │
│    - 错误尝试、正确做法、根因、浪费 time          │
└──────────────────────────────────────────────────┘
              │
              ▼
┐──────────────────────────────────────────────────┒
│ 2. (可选) 如果是通用坑                       │
│    → 更新 common-pitfalls.md                    │
└──────────────────────────────────────────────────┘
```

### 流程 3: 新迭代初始化

```
用户：开始 v0.3.0 的新迭代
    │
    ▼
┐──────────────────────────────────────────────────┒
│ 1. 确认昨日 Daily 已归档                          │
│    - daily/ 目录下已有 YYYY-MM-DD.md              │
│    - 如无，说明昨日无工作，直接创建今天的           │
└──────────────────────────────────────────────────┘
              │
              ▼
┐──────────────────────────────────────────────────┒
│ 2. 创建今天的 Daily                               │
│    - 文件: daily/YYYY-MM-DD.md                    │
│    - 第一 section: Session Handoff                │
│    - 后续 section: 工作日志、Pitfalls、Next       │
└──────────────────────────────────────────────────┘
```

## Daily 文件位置

| 场景 | 文件路径 | 说明 |
|-----|---------|------|
| 当前日期 | `daily/YYYY-MM-DD.md` | 当天的日报，第一个 section 是 Handoff |
| 历史 | `daily/2026-04-23.md` | 历史日报（时间戳平铺） |
| 模板 | `HANDOFF-TEMPLATE.md` | 项目根目录模板（供参考结构） |

> 命名哲学：不用 `archive/` 这种正式目录，直接用 `daily/` 或 `journal/`。
> Handoff 不是独立文件，而是 daily 文件的第一个 section。

## Pitfalls 记录规范

```markdown
### 坑 X: 简短描述
- **错误尝试**: 具体做了什么
- **表现**: 具体错误信息
- **正确做法**: 最终怎么解决的
- **根因**: 为什么会走弯路
- **浪费 time**: X 分钟
```

## 与 project-onboarding 的关系

```
┐──────────────────────────────────────────────────┒
│                   单文件 Handoff 交接                   │
├──────────────────────────────────────────────────┤
│                                                       │
│   当前 session ──→ project-scribe (dump)             │
│              - 确认 git 状态                          │
│              - 确认 cortex 状态                        │
│              - 回忆 session 状态                       │
│              - 写入 daily/YYYY-MM-DD.md              │
│                          │                            │
│                          ↓                            │
│              daily/2026-04-24.md                      │
│              (日报，第一个 section 是 Handoff)         │
│                          │                            │
│                          ↓                            │
│   下一 session ─→ project-onboarding (read)          │
│              - 找 daily/ 下最新的日期文件              │
│              - 读取第一个 section (Session Handoff)   │
│              - 验证 Ground Truth State                │
│                                                       │
└──────────────────────────────────────────────────┘
```

## 使用示例

### 示例 1: Session 结束交接

```
用户：就这样吧，session 快结束了

Scribe 执行：
1. git status 确认状态
2. 回忆本次 session 重要但未记录的事
3. 写入 daily/YYYY-MM-DD.md（今天日期的文件）
4. 给用户确认

输出：
✅ 已更新 daily/2026-04-24.md
📌 位置: daily/2026-04-24.md
⚠️ 警告: 以下文件在 diff artifact 中但不在 working tree，下个 agent 勿误认
```

### 示例 2: 记录坑点

```
用户：踩坑了，sed -i 在 macOS 上不兼容

Scribe 执行：
1. 更新 daily/YYYY-MM-DD.md 的 Pitfalls 部分
2. 记录错误尝试、正确做法、根因、浪费 time

输出：
⚠️ 已记录坑点到 daily/2026-04-24.md
📍 位置: daily/2026-04-24.md
‼️ 下个 agent 使用 sed 时请使用 sed -i '' 或直接用 Edit 工具
```

## 自动化触发点

建议与以下事件绑定：

| 事件 | 自动触发 |
|-----|---------|
| `git commit` | 提示更新 Handoff |
| `git tag` | 自动归档 Handoff，创建新版本 |
| 用户说"LGTM" | 强制执行 handoff 流程 |
| 用户说"又出问题了" | 提示记录 Pitfall |
| context 接近上限 | 强制执行 handoff 流程 |

## 注意事项

1. **Daily 文件优先** - handoff 写入 daily/YYYY-MM-DD.md 的第一个 section，不是独立 HANDOFF.md
2. **确认流程** - handoff 前必须执行 git/cortex/session 三重确认
3. **dump 专属状态** - 不要记录能通过 ls/cat/git log 恢复的内容
4. **写前确认** - 更新前给用户看 diff，确认后再写入
5. **防止 hallucination** - Ground Truth State 必须精确，尤其是 diff artifact 与 working tree 的区别

## 相关 Skill

- **lythoskill-project-onboarding** — 读 Handoff，建立上下文。与 scribe 形成 CQRS 读写分离。二者可独立使用：只有 scribe 时 handoff 仍能被人工阅读；只有 onboarding 时可降级为文件系统探索。
- **lythoskill-project-cortex** — GTD 项目治理（ADR/Epic/Task）。如果项目也使用 cortex，scribe 的交接流程会自动引用活跃的 epic/task 状态，但**不强制依赖**。cortex 独立运行，scribe 只是在其存在时顺手读取。
- **lythoskill-red-green-release** — 版本发布流程
