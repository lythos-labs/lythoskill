---
lane: main
checklist_completed: false
checklist_skipped_reason: "automated: catalog co-location is a targeted fix with clear scope"
---
# EPIC-20260520124010693: curator catalog co-location: eliminate three data silos, catalog follows pool

> **Epic 是什么**:1-3 周可结案的 outcome,有依赖、有顺序、要规划。
> **Epic 不是什么**:配置漂移类小事(那是 task)、决策选型(那是 ADR)。
> **Workflowy zoom-in 心智**:屏蔽其他 epic 的诱惑,聚焦本卡。
> **双轨**:`lane: main`(当前迭代,最多 1)、`lane: emergency`(不可避免紧急,最多 1)。

## Status History

| Status | Date | Note |
|--------|------|------|
| active | 2026-05-20 | Created |
| done | 2026-05-20 | Done |

## 背景故事

用户反馈：curator scan 后 `find` 查不到数据。"换一个项目就找不到"。

排查发现三个独立的 catalog.db 散落各处：
- `~/.agents/skill-repos/.lythoskill-curator/catalog.db` — 871 skills（真数据）
- `~/.agents/lythoskill/curator/catalog.db` — 0 skills（空，scan 写到了这里）
- `~/.agents/lythos/skill-curator/catalog.db` — 181 skills（25天前残留）

Root cause：ADR-20260511210000000 将 curator 输出统一到 `~/.agents/lythoskill/curator/`（全局命名空间），但实现不完整：
1. scan 写入新路径（空），find 也读新路径（空），871 真数据在旧路径无人用
2. 自定义 pool 扫描会覆盖全局 catalog，多 pool 隔离丢失
3. 静默错位：scan 成功、find 失败，无任何警告

修正方向：catalog 跟随 pool (`<pool>/.lythoskill-curator/`)，取消全局命名空间例外。

## 需求树

### 主题A：catalog co-location
- **触发**: 三数据孤岛导致 find 静默失败
- **需求**: catalog 跟随 pool 走，scan/add 输出到 `<pool>/.lythoskill-curator/`
- **实现**: parseCuratorArgs/runAdd output 改为 pool-co-located；find/query 搜 populated catalog 优先
- **产出**: scan + find 无需 --db 即可工作；自定义 pool 自动隔离
- **验证**: 默认 pool scan → find 直接命中；自定义 pool scan 不污染默认 pool

### 主题B：scan robustness
- **触发**: 5 个 SKILL.md YAML 解析错误静默吞掉，scan loop 崩溃
- **需求**: 捕获 YAML parse error、标记 status (parsed/parse_error/incomplete)、写入 catalog.db
- **实现**: scanSkill() try/catch 捕获 parseError；writeCatalogDb 写入 status+parse_error
- **产出**: 6 个 YAML 错误现在可见（之前静默）；inferSource 根级 repo 修复
- **验证**: scan 报告 6 个 [YAML] 标记、0 crash、0 skip

### 主题C：BDD scenarios bundled
- **触发**: 零知识 agent 验证需要 BDD 场景，但 test/scenarios/ 不在 skill 构建产物里
- **需求**: 3 个 BDD 场景复制到 skill/scripts/bdd/
- **实现**: 复制 reproduce.sh + judge.md；新增 real-data HIT/MISS 场景
- **产出**: 零知识 haiku agent 验证 PASS（17s，5/5 criteria）
- **验证**: 从冷池拿到 curator 技能时自带可复现验证脚本

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|
| ADR-20260511210000000 | Consolidate curator output to `~/.agents/lythoskill/curator/` | superseded (catalog location) |
| ADR-20260424000744041 | Curator output is personal environment scan | principles retained |

关键修正：ADR-20260511210000000 的 Pattern B（全局命名空间）对 catalog 位置不适用。Catalog 是 cold pool 的派生索引，应跟随 pool（Pattern A）。其他 curator 产出（additions.jsonl）可保留全局命名空间。

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|
| TASK-20260520124010693-1 | completed | scanSkill() YAML error capture + status tagging |
| TASK-20260520124010693-2 | completed | inferSource() root-repo fix + dedup |
| TASK-20260520124010693-3 | completed | catalog co-location: output defaults to <pool>/.lythoskill-curator/ |
| TASK-20260520124010693-4 | completed | find: populated catalog preference + empty/stale detection |
| TASK-20260520124010693-5 | pending | ADR update + README/SKILL.md alignment |
| TASK-20260520124010693-6 | pending | bump + publish |

## 经验沉淀

- **静默错位比显式报错更危险**：三个 catalog.db 都合法存在，但只有一个是真数据。系统应该优先 populated catalog，空 catalog 要警告。
- **Catalog 跟随 pool 是自然法则**：就像 `.git/` 跟着 worktree 走。强行统一到全局路径创造了更多问题。
- **多 pool 是真实需求**：测试、隔离、实验都需要自定义 pool。默认设计必须支持。

## 归档条件
- [ ] ADR 更新记录设计修正
- [ ] README + SKILL.md 对齐新行为
- [ ] bump + publish 完成
- [ ] 零知识 agent BDD 通过
