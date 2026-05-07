# ADR-20260507014124191: Agent-friendly CLI error as decision tree with repo-structure inference heuristics

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-06 | Created |
| accepted | 2026-05-07 | Accepted |

## 背景

CLI 错误信息当前是面向**人类终端读者**设计的字符串。但在 lythoskill 生态里,大量 CLI 调用的实际消费者是**agent**(Claude Code 等)。Agent 读到 `❌ Skill not found: github.com/owner/repo/skill` 这样的字符串,只能做两件事:
1. 拼接重试(瞎猜 locator,有时碰巧通过)
2. 回报失败,让人类介入

两种都是 dead-end:第一种制造 30+ 轮硬钻(参见 2026-05-07 早晨 `skill-deck.toml` 被覆盖事件),第二种把 agent 退化为人形复读机。

### 触发事件

`EPIC-20260507020846020` 的 deck 迁移过程中需要决定: `deck add` / `deck validate` 在 locator 解析失败、repo 不存在、SKILL.md 路径不在 cloned repo 内等异常路径上,输出形态是什么。

### 真实世界 repo 多样性

`cortex/wiki/03-lessons/2026-05-07-real-world-skill-repo-structure-survey.md` 列出 9 个公开 skill repo,布局有 standalone / flat / monorepo `skills/` / nested category / arbitrary subdir 五种。任何"猜路径"的 agent 行为都会在某种布局下崩。

### Plan/Execute 框架已有

`cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md` 把 plan-as-data 编纂为项目级 pattern,已在 RefreshPlan / PrunePlan / AgentScenario 上应用。错误处理路径只是该 pattern 的一个未被填充的象限。

## 决策驱动

1. **Agent 自主修复需要结构化数据**:错误必须暴露"问题在哪一阶段、检测到什么、可能的修复"三类信息,agent 才能不需 LLM 推理就直接 act。
2. **Plan = data 不变量**:错误不是异常控制流的副产物,而是 plan layer 的一种**有效输出**。这与现有 RefreshPlan/PrunePlan 的"plan 即数据"立场自洽。
3. **同一形态服务多消费者**:human-readable text、JSON for agents、CI exit code,共享同一底层数据结构。渲染发生在 execute 层,不在 plan 层。
4. **Repo 结构推断带"建议"而不"自动修"**:agent 仍然是决策者,Plan 的 `suggestedFixes` 给出 confidence 分数 + 候选 newLocator,由 agent 判断要不要采纳。Plan 不替 agent 决策。

## 选项

### 方案 A: 字符串错误(现状) — Rejected
保留 `console.error` + `process.exit(1)` 的人类向输出。

- **优点**: 零工作量,与当前其他 CLI 一致
- **缺点**:
  - Agent 无法可靠 parse(字符串格式可能任意改动)
  - "did you mean X?" 一类的提示混在错误正文里,agent 取出来还得正则
  - CI 拿不到机器可读结构,只能比对 exit code
  - **早晨 `skill-deck.toml` 被覆盖事件就是这种 UX 直接喂出来的**

### 方案 B: 字符串错误 + hint 行 — Rejected
错误后追加单行 hint:`Did you mean: github.com/foo/bar/skill?`

- **优点**: 边际改进,仍是 plain text
- **缺点**:
  - hint 的 confidence 不可区分(0.95 和 0.3 都印同一行)
  - 多候选时 hint 只能列单行或拼接(失去结构)
  - 仍需要 agent 用正则/启发式抽出 newLocator,等价于把结构化负担推给消费者
  - 与 Plan-as-data pattern 不一致(等于在 execute 层重新藏数据)

### 方案 C: ANSI / Markdown 格式化错误 — Rejected
用富文本渲染让人类看得清楚,例如 markdown 表格列出候选。

- **优点**: 人类终端体验最好
- **缺点**: agent 仍要 parse 文本;格式版本变化即破坏 agent 的解析逻辑;没解决根本问题

### 方案 D: ValidationReport 作为结构化 plan,渲染交给 execute — Selected

错误在 plan layer 是**一等数据**:

```ts
interface ValidationReport {
  status: 'valid' | 'invalid' | 'ambiguous'
  locator: string
  phase: 'syntax' | 'repo-existence' | 'path-existence' | 'skill-md-existence'
  findings: {
    parseError?: string
    repoExists?: boolean
    repoIsPrivate?: boolean
    skillMdFound?: boolean
    detectedPaths?: string[]   // 实际存在的 SKILL.md 候选目录
    remoteStatus?: number
  }
  suggestedFixes: Array<{
    action: 'update-locator' | 'web-search' | 'prompt-user'
    confidence: number          // 0..1
    message: string
    newLocator?: string
  }>
}
```

CLI 在 execute 层渲染:`--format=text` 是人类向、`--format=json` 是 agent 向。两者从同一对象出。

#### 决策树语义

`phase` 字段把验证拆成 4 个阶段。Agent 读 `phase` 知道**问题落在哪一层**:
- `syntax`: locator 字符串本身不符合 FQ 规则 → 修拼写
- `repo-existence`: locator 解析成功但 repo 不在 github → owner/repo 错了
- `path-existence`: repo 存在,但 skill 子路径不在 → `detectedPaths` 给出实际候选,suggestedFixes 给出 newLocator
- `skill-md-existence`: 路径存在但没 SKILL.md → 这个 repo 不是 skill repo

每一阶段都是 agent 可以独立 act 的决策点——这就是"决策树"的含义,不是单 string 的"全部信息混在一起"。

#### 推断启发式(repo-structure inference)

`detectedPaths` 由 `inferSkillPath(treeEntries, expectedSubpath?)` 计算:
1. 扫描 GitHub Tree API 返回的所有 blob path
2. 收集所有以 `SKILL.md` 结尾的 path 的父目录
3. 若 `expectedSubpath` 给定,标记 `exactMatch`
4. 否则返回所有候选

这些是**真实文件系统证据**,不是猜测。Agent 用 `confidence` 字段判断要不要采纳建议(>0.8 可以无人值守 act,0.4-0.8 应当先确认)。

## 决策

**选择**: 方案 D — ValidationReport 作为结构化 plan,渲染在 execute 层。

实施已落地于 `EPIC-20260507020846020`:
- `@lythos/cold-pool` 包 `src/types.ts` 定义 `ValidationReport / ValidationFindings / SuggestedFix`
- `src/validate-plan.ts` 提供 `buildValidationPlan` (pure) + `executeValidationPlan` (side-effect: GitHub Tree API)
- `src/infer-skill-path.ts` 提供 inferSkillPath
- `deck validate --format=json` 暴露 JSON 形态
- `scripts/validate-example-decks.ts` 在 CI 上消费 JSON 形态

## 影响

### 正面

- Agent 不再瞎猜 locator;`detectedPaths` + `newLocator` 可以**无 LLM 推理**直接 act
- 同一 ValidationReport 服务三个消费者:CLI text、agent JSON、CI exit code(都从一个对象渲染)
- 错误进入 Plan layer 后,与 RefreshPlan/PrunePlan 立场一致(plan = data,execute 渲染),整个 CLI 套件统一一种 UX 语法
- 本 ADR 是 0.10.0 的 agent-CLI 接口标准锚点,后续命令(`curator validate` / `arena preflight`)可以直接套相同的 ValidationReport 形态
- CI 守门(`scripts/validate-example-decks.ts`)能识别 `ambiguous` 和 `invalid`,从前者(rate-limited / private)不挂 CI,只把后者算 fail——人类策略可以按字段精细化

### 负面

- 输出体积变大(尤其 JSON 形态),不适合直接给终端 user 读 → `--format=text` 默认行为补齐
- 增加一次 GitHub API 调用(remote phase),受 rate limit 影响 → 用 ambiguous 状态优雅降级
- 类型定义放在 `@lythos/cold-pool`,curator/arena 想扩展自己的 phase 时需要本地复用或自定义 union(目前可接受)

### 后续

1. `curator add` 接相同 ValidationReport(后续 epic)
2. `arena agent-run preflight` 输出 ValidationReport(后续 epic)
3. 0.10.0 release 时把 `--format=json` 升级为推荐用法,文档化"CLI 命令 → JSON schema"映射
4. ValidationReport 的 phase 集合允许扩展(例如 `rate-limit-budget` / `auth-required`),作为新 ADR 增量添加

## 相关

- 关联 ADR:
  - `ADR-20260502012643244` (FQ-only locator) — `phase: 'syntax'` 的判定来源
  - `ADR-20260507021957847` (`@lythos/cold-pool` 包结构) — ValidationReport 的导出位置
- 关联 Epic: `EPIC-20260507020846020`
- 关联 Wiki:
  - `cortex/wiki/01-patterns/2026-05-04-intent-plan-execute-fractal-architecture-pattern.md` (plan-as-data 来源)
  - `cortex/wiki/03-lessons/2026-05-07-real-world-skill-repo-structure-survey.md` (推断启发式的证据基础)
