# ADR-20260424125637347: handoff format migration from fixed file to daily-first

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-24 | Created |
| accepted | 2026-04-24 | Approved by user |

## 背景

project-scribe 和 project-onboarding 的技能设计中，handoff 一直使用固定文件名 `daily/HANDOFF.md`（或 `playground/HANDOFF.md`）。但在实际运行中暴露了严重问题：

1. **Handoff 严重过时，但 onboarding 无条件信任它**：上一个 session 的 handoff 说 "working tree clean"，但下一个 session 的 `git status` 显示 13 个 modified 文件。由于文件名固定，onboarding 无法从文件名本身判断新鲜度。
2. **并非每天都有工作**：如果某天没有 session，handoff 文件依然存在但内容属于几天前。onboarding 读取后拿到的全是 stale 信息。
3. **人类可读性差**：`HANDOFF.md` 是纯 agent 交接文件，没有人类工作日志的价值。项目成员需要另外维护日报。

## 决策驱动

- **防呆设计**：固定文件名一旦过时，影响极坏（带坏 onboarding agent）
- **Obsidian daily-note 心智**：工作手帐天然按日期分页，不是固定笔记本
- **子弹笔记思维**：同一天可以 append，不需要创建多个文件
- **CQRS 读写分离不变**：scribe 写，onboarding 读，只是存储格式变了

## 选项

### 方案A：维持固定文件名 HANDOFF.md

保持 `daily/HANDOFF.md` 作为当前 session 的固定交接文件。每次 session 结束时覆盖它。

**优点**:
- onboarding 极其简单：直接 `cat daily/HANDOFF.md`
- 文件名确定性高，不需要排序/查找

**缺点**:
- 过时风险极高：文件名不携带时间信息，人眼和脚本都无法一眼判断新鲜度
- 如果某天没有 session，handoff 内容永远停留在上一次，下次 onboarding 读到的是 stale 信息
- 不是工作手帐，人类无法从中读取历史工作记录

### 方案B：Daily-first，Handoff 作为 Daily 的第一个 section（推荐）

Handoff 内容写入 `daily/YYYY-MM-DD.md` 的第一个 section（`## Session Handoff`）。同一天多次 session 时 append 到同一个文件。onboarding 找 `daily/` 下最新的日期文件。

**优点**:
- 文件名自带日期，一眼判断新鲜度：`2026-04-24.md` 比 `HANDOFF.md` 诚实
- 人眼可读：打开今天的 daily，既是 handoff 也是工作日志
- 同一天 append 不需要多个文件（子弹笔记思维）
- 多日无工作时，onboarding 看到最新文件是几天前的，自然意识到信息可能过时

**缺点**:
- onboarding 需要 `ls daily/*.md | sort | tail -1` 查找最新文件（多一步）
- 旧 handoff 内容分布在不同日期的文件中，不便于"只看交接"的场景

## 决策

**选择**: 方案B（Daily-first，Handoff 作为 Daily 的第一个 section）

**原因**:

1. **过时的 handoff 比没有 handoff 更危险**：固定文件名的 HANDOFF.md 一旦过时，onboarding agent 会基于错误假设开始工作，浪费 token 甚至引入 bug。日期文件名的 daily 天然具备"新鲜度可见性"。

2. **Obsidian / 子弹笔记的心智一致性**：工作手帐就是按日期分页的。同一天多次 session 像同一天的多条笔记，append 即可。这是无压记录（low-pressure journaling）的核心。

3. **人类和 agent 共享同一文件**：daily 文件既服务 onboarding（第一个 section），也服务人类回顾（工作日志、pitfalls、next）。不需要维护两套系统。

## 影响

- 正面:
  - Handoff 新鲜度从"不可见"变为"文件名即日期"
  - 人类可读：daily 文件是工作手帐，不是纯机器格式
  - 同日 append 支持无压记录
  - onboarding 和 scribe skill 同时更新，保持 CQRS 一致

- 负面:
  - onboarding 需要文件查找逻辑（不能硬编码文件名）
  - 历史 handoff 分散在多个日期文件中，想看跨日期的 handoff 需要遍历

- 后续:
  - 更新 project-scribe SKILL.md：产出目标改为 `daily/YYYY-MM-DD.md`
  - 更新 project-onboarding SKILL.md：Layer 2 改为查找最新 daily 文件
  - 删除旧的 `daily/HANDOFF.md`（内容已进 git 历史）
  - 在 onboarding subagent 测试中验证新格式的有效性

## 相关

- 关联 ADR: ADR-20260424113352614-project-scribe-remains-independent-with-optional-skill-cooperation.md
- 关联 Wiki: [player-deck-separation-and-tcg-player-analogy](../wiki/01-patterns/player-deck-separation-and-tcg-player-analogy.md)
- 关联 Skill: lythoskill-project-scribe, lythoskill-project-onboarding
