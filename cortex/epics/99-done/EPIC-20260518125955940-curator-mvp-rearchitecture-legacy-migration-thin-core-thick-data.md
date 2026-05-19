---
lane: main
checklist_completed: false
checklist_skipped_reason: "MVP scope confirmed in ADR — minimal mindset refactoring, no future vision creep"
---
# EPIC-20260518125955940: Curator MVP: mindset refactor + legacy migration — thin core, thick data

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

> Curator MVP: mindset refactor + legacy migration — thin core, thick data

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-18 | Created |
| done | 2026-05-18 | Done |

## 背景故事

ADR-20260518123403810 重新推导了 curator 的角色：从 "discovery engine" 退到 **策展者/买家秀 = remember**。核心心智是 curator = 查卡器 + 备注 + 组卡审美，CLI = agent SOP 固化层（同 arena 模式），智能（发现、推荐、fact-check）在 agent 侧。

当前 curator 代码和 SKILL.md 描述仍运行在旧心智上——niche 从 SKILL.md frontmatter 提取、audit 标记空 niche 为违规、SKILL.md 暗示 curator 是 discovery 主入口。这造成持续的阻抗匹配问题（组卡时 curator 出 bug、鸡肋感）。

**MVP 目标**：把 curator 从旧心智迁移到新心智的最小必要改动。不做向量数据库、不做 DL/RL、不做 Obsidian 化——那些是数据层自然演化，不是核的改动。核要保持稳定。

## 需求树

### 主题A: Niche 来源改造 #backlog
- **触发**: `deck_niche` 从 SKILL.md frontmatter 提取 → 主流技能无此字段 → false negative
- **需求**: niche 改为 agent-enriched metadata（策展人备注），不再从 frontmatter 提取
- **实现**:
  1. `curator-core.ts` / `cli.ts` 中移除 `deck_niche` → `niches` 的 frontmatter 提取逻辑
  2. 新增 `curator tag <skill-name> --niche "xxx" [--qa {...}]` 子命令
  3. Scan 只更新 name/description/path，保留 agent 写入的 niche（merge 策略）
  4. REGISTRY.json 的 `byNiche` 索引改为从 agent-enriched niche 构建
- **产出**: 双路径 niche 提取代码消失，`tag` 命令可用
- **验证**: `curator audit` 不再报告空 niche 违规；agent 收录技能后 `curator tag` → `curator query` 可看到 niche

### 主题B: Audit 规则对齐 #backlog
- **触发**: 空 niche 标记为违规 → 主流技能 100% 触发 → 噪音
- **需求**: audit 只检查结构性错误（路径不存在、`name` 缺失、SKILL.md 不可解析）
- **实现**:
  1. 移除 `runAudit()` 中空 niche 检查
  2. 新增 legacy pattern check：grep SKILL.md body 中的已知废弃模式（`skills.sh`、`deck status sh`、`HANDOFF.md` 等）
  3. 保留结构性检查（路径、name、parseable）
- **产出**: audit 输出从噪音变信号
- **验证**: 扫描冷池后 audit 输出 0 空 niche 违规；legacy pattern 可检测

### 主题C: SKILL.md 心智对齐 #backlog
- **触发**: curator SKILL.md 描述仍暗示它是 discovery 主入口，与实际使用模式脱节
- **需求**: SKILL.md 描述 agent 如何使用 curator query + WebSearch + gh 做 discovery，curator 定位为本地数据源
- **实现**:
  1. 重写 "discover" 相关 section → agent SOP："先用 curator query 查本地有没有 → 再用 WebSearch/gh 找新的 → curator add 收录 → curator tag 标注"
  2. 移除 "discovery engine" 相关措辞
  3. 添加 fact-check + confidence evaluation SOP
- **产出**: SKILL.md 描述的心智与 ADR 一致
- **验证**: arena 验证——zero-knowledge subagent 读 SKILL.md 后能正确使用 curator + WebSearch 组合做发现

### 主题D: Legacy 清理 #backlog
- **触发**: `skills.sh`、`deck status sh`、`HANDOFF.md` 等历史残留
- **需求**: 代码、文档、SKILL.md 中移除废弃引用
- **实现**:
  1. grep 全仓 `skills.sh`、`deck status`、`HANDOFF.md` → 逐条判断 clean/update
  2. 更新 `feed-adapters.ts`：删除或 thin out，保留注释说明 "feed 概念存活于 schema 层，不在 adapter 代码层"
  3. 移除 `deck status sh` 等残留 shell 命令引用
- **产出**: 0 条已知废弃模式残留
- **验证**: `curator audit --legacy` 输出 0

### 主题E: reproduce.sh 对齐 #backlog
- **触发**: EPIC-20260518024809887 确立 reproduce.sh IoC 模式，curator 测试需跟进
- **需求**: curator 的 scan → tag → query → audit 完整流程有 reproduce.sh 覆盖
- **实现**:
  1. 创建 `showcase/curator-mvp/reproduce.sh`
  2. 覆盖：scan 冷池 → query 查技能 → tag 写 niche → audit 检查 → 验证输出
  3. Zero-knowledge subagent 验证 PASS
- **产出**: reproduce.sh 可独立运行
- **验证**: `bash reproduce.sh` → 全部 PASS

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260518123403810 | Curator role re-derivation | accepted |
| ADR-20260508230803515 | Curator does not wrap external APIs | accepted |
| ADR-20260518024500631 | BDD evolution to reproduce.sh | accepted |
| ADR-20260507143241493 | Cold-pool metadata layer, SQLite-backed | accepted |

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260518130210081 | backlog | 主题A: 移除 frontmatter niche 提取 + 新增 `tag` 命令 |
| TASK-20260518130212342 | backlog | 主题B: Audit 规则调整（去空 niche + 加 legacy check） |
| TASK-20260518130214814 | backlog | 主题C: SKILL.md 重写（discovery SOP + fact-check） |
| TASK-20260518130217386 | backlog | 主题D: Legacy 引用全仓清理 |
| TASK-20260518130219922 | backlog | 主题E: reproduce.sh 覆盖 curator 完整流程 |

## 经验沉淀

- 薄核厚数据：curator CLI 不膨胀，增长在外置数据 repo。本 epic 只改核，不建数据 repo
- Arena CLI 模式 = curator CLI 模式：CLI 固化机械部分，智能在 SKILL.md + agent
- Feed schema ≠ feed adapter：schema 是元数据，adapter 是反模式
- **reproduce.sh + HATEOAS 是 curator 的恩惠**：curator 需要大量 agent 智能（discovery、fact-check、confidence），但机械部分仍受 reproduce.sh IoC 验证和 HATEOAS self-healing error 的庇护
- **Curator 组 deck = "记者"系技能**（TRPG 写卡既视感）：记者 = 调查 + 叙事综合 + **表达**。**调查** = fact-check（交叉验证来源、检测偏差），**叙事综合** = 从碎片事实中提炼判断，**表达** = 把判断转化为用户可理解、可行动的推荐——"这个技能适合 X，因为 3 次独立测试确认 Y，但 hub A 在 TS 技能上系统性偏高 2 分"。没有表达的 curator 只是数据库，有表达的 curator 是记者告诉你调查结果及其意义。Provenance chain 不只机器可读——它本身就是故事
- **Query 不是唯一入口，是实现便利**：query 对应 implementation，不是 intent。User 的 intent 是 "find me a good skill for X"，query + WebSearch + agent reasoning 是实现。SQL 是天然展现 intent 的 DSL——声明式、可读、说"要什么"而非"怎么做"

## 归档条件
- [ ] 主题A-E 全部完成
- [ ] reproduce.sh PASS（zero-knowledge subagent）
- [ ] arena 验证：agent 使用新 curator SKILL.md + WebSearch 正确执行 discovery SOP
- [ ] curator audit 输出 0 空 niche 违规、0 legacy pattern 残留
- [ ] 代码中无 `deck_niche` frontmatter 提取残留
- [ ] `curator tag` 命令可用且写入正确
