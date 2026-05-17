---
created: 2026-05-11
status: proposed
---

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-11 | Created — git-only FQ locator decision ratified; agent does hub→git conversion |
| accepted | 2026-05-17 | Accepted |

# ADR-20260511000000000: Deck skill sources — git-only FQ locators vs hub/marketplace integration

## 背景

lythoskill 的 deck 当前使用 FQ locator 格式：`host.tld/owner/repo[/skill]`。这是 git-native 的 —
locator 直接映射到冷池路径 `~/.agents/skill-repos/<host>/<owner>/<repo>/`，`deck add` 执行
`git clone`，`curator scan` 从文件系统发现 `SKILL.md`。

早期（项目 bootstrap 阶段）尝试过 "via skills.sh" 的路径：`npx skills add <repo>` → 安装到
`.agents/skills/` → 手动 mv 到冷池。这是过渡方案 — 快照化思维，不适合管理大量 git repo。

现在 Vercel skills.sh 已形成完整生态：41+ agent 支持、排行榜、安全验证（Snyk/Gen）、
`npx skills` CLI、`.skill-lock.json` v3 lockfile。

问题是：**deck 是否应该支持 hub/marketplace 来源的技能**（非 git FQ locator）？

## 选项

### Option A: Git-only（现状）

FQ locator 只认 `host.tld/owner/repo[/skill]`。`deck add` = git clone。外部 hub 当搜索工具用，
找到后转成 FQ locator 再 add。

| Pros | Cons |
|---|---|
| 简单 — 一个 locator 格式，一个下载协议 | 用户需要手动从 hub 搜索结果转成 git URL |
| 冷池 = 纯 git mirror，可校验，可 `git pull` | 部分技能可能只发布在 hub 上（无公开 git repo） |
| `findSkillDirectories()` 不依赖任何外部 API | |
| 和 Maven `~/.m2` 同构 — 业界验证过的模式 | |
| Vercel 已经做好了发现层 — 没必要重复 | |

### Option B: 多协议 locator

支持多种 locator 前缀：`github.com/...` (git clone)、`skills.sh/...` (npx skills add)、
`npm:...` (npm install)、`url:...` (HTTP fetch)。

| Pros | Cons |
|---|---|
| 用户可以从任意来源直接 add | 每个协议需要独立的下载/更新/校验逻辑 |
| 覆盖更广的技能来源 | 冷池不再是纯 git mirror — 失去 `git pull` 统一更新 |
| | FQ locator 失去语义 — 变成 "不透明 identifier" |
| | `findSkillDirectories()` 需要理解多种目录布局 |
| | curator 需要追踪多种来源的 freshness |
| | 重复发明 Vercel skills.sh 的安装层 |

### Option C: Adapter 模式（curator-no-feed-adapters 的延伸）

Deck 保持 git-only，但在 agent 层面提供一个 "hub → FQ locator" 的转换层：agent 用
web search / skills.sh API 发现技能 → 找到对应的 GitHub URL → `deck add github.com/...`。

| Pros | Cons |
|---|---|
| Deck 保持简单 | Agent 多做一步转换 |
| Agent 的 web search 能力就是 adapter — 不需要手写 | 部分技能可能没有公开 git repo |
| 和 ADR-20260508230803515 一致（agent web fetch beats hand-rolled adapters） | |

## 决策

**Option A + C — git-only locators，agent 做 hub→git 转换。**

理由：

1. **Vercel 已经做好了发现层。** skills.sh 有排行榜、安全验证、`npx skills add`。重复做一套
   "lythoskill hub/marketplace" 是重复发明，而且我们的强项在治理不在发现。

2. **Git 是 universal fallback。** 几乎所有技能都有 GitHub repo。skills.sh 本身也是从 GitHub
   repo 安装的。`github.com/owner/repo` 是最低公共分母 — 任何 hub 最终都能追溯到 git URL。

3. **Agent web search = 最好的 adapter。** ADR-20260508230803515 已经确立了原则：agent web
   fetch/search 比手写 feed adapter 强。同样适用这里 — agent 在 skills.sh 搜到技能 → 找到
   对应的 GitHub URL → `deck add`。不需要 CLI 层面的协议适配。

4. **冷池的 git 同构性值得保护。** 如果冷池里有 git clone 来的、npm install 来的、HTTP fetch
   来的，`git pull` 统一更新失效，`findSkillDirectories()` 需要理解多种布局，curator freshness
   追踪需要多套逻辑。保持 git-only 意味着所有这些都只有一种实现。

5. **边缘情况：纯 hub 技能。** 如果某个技能只发布在 skills.sh 上没有公开 git repo — 这是极端
   边缘情况。处理方式：agent 手动 clone/fetch 到 `localhost/<name>` 路径。不需要为此在 CLI 层
   加协议支持。

## 影响

- Deck 保持 git-only FQ locator
- Agent 的工作流：`web search / skills.sh 发现 → 找到 git URL → deck add`
- `localhost/` 路径保留用于无 git repo 的技能
- 如果未来出现 "只有 hub 没有 git" 的流行技能，再评估是否需要 Option B
- 和 skills.sh 的关系：skills.sh = 搜索引擎，lythoskill = 包管理器

## 这是同一个模式在不同层的重复

这和 feed adapter（ADR-20260508230803515）本质是同一个问题：

```
Curator 层: 要不要写 feed-adapter 对接 skills.sh/LobeHub API?
           → 不要。Agent web search 比手写 adapter 强。

Deck 层:    要不要支持 skills.sh:/npm:/url: 等非 git locator?
           → 不要。Agent 做 hub→git 转换，git 是 universal fallback。
```

两次都是 "外部注册中心/市场提供了发现能力 → 我们要不要对接？" 两次答案都是 **不要 —
agent 的能力（web search, web fetch）就是最好的 glue code**。

这个模式可以泛化：**lythoskill 的 CLI 层只做本地治理（git, filesystem, SQLite），
外部发现和集成交给 agent。** 这是 thin skill pattern 在架构层面的体现 — 稳定层在 npm/CLI，
智能化在 agent。
