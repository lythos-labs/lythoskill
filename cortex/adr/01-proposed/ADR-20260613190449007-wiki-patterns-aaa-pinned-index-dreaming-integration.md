# ADR-20260613190449007: Wiki patterns: AAA pinned index + dreaming integration

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-06-13 | Created |

## 背景

`cortex/wiki/01-patterns/` 是项目的主要模式文档目录。随着项目推进，该目录已积累 50+ 个文件，每个文件都以日期时间戳命名（如 `2026-05-02-thin-skill-pattern.md`）。

时间戳解决了两个重要问题：
- **唯一性**：避免命名冲突
- **时间新鲜度**：agent 可以通过文件名快速判断文档的写入时间

但它没有解决第三个问题：**重要性新鲜度**。一个新 agent 进入项目时，无法从 `01-patterns/` 的 flat 结构中判断：
- 哪些模式是当前仍在使用的核心规则
- 哪些模式已经被吸收进 `cortex/wiki/04-ssot/` 并成为 SSOT
- 哪些模式只是历史探索记录，不应作为当前决策依据

这导致两种失败模式：
1. **扫描 → 制造**：agent 扫描 patterns/，把历史探索性文档和当前有效模式混为一谈，写出基于过时假设的文档或代码
2. **忽略 → 遗漏**：agent 为了避免噪音，直接跳过整个 patterns/ 目录，错过仍在使用的关键模式

## 决策驱动

1. **降低新 agent 的理解成本**。项目目标之一是"新 agent 理解项目所需的 token 越少越好"。目前 patterns/ 的 flat 结构迫使 agent 做大量筛选工作。

2. **dreaming 已经在探索 frontmatter tag**。`lythoskill-dreaming` SKILL.md 提出 SSOT 文件应包含 `last_consolidated`、`sources`、`zk_validated` 等 frontmatter。当前 `cortex/wiki/04-ssot/` 已部分采用。我们应该把同样的 frontmatter 思路延伸到 patterns/ 的索引层，而不是让每个 pattern 文件自行其是。

3. **SSOT 收敛后需要留下指向标**。dreaming 把有效信息提取到 `04-ssot/` 后，原 pattern 文件仍然存在。如果没有"已吸收"标记，agent 会重复读取同一知识的两份副本，增加 confusion cost。

4. **避免删除历史**。这些 patterns 是项目认知过程的记录，删除它们会损失决策上下文。我们需要的是"分层"而不是"清理"。

## 选项

### 方案A：INDEX.md 置顶索引 + dreaming 维护

不改 `01-patterns/` 下的任何文件名，在目录内增加一个 `INDEX.md`（大写 `I` 使其在 `ls` 和文件浏览器中排在前面）。该 INDEX.md 按重要性分层展示 patterns：

- **P0 / Active**：当前 agent 必读的核心模式。每个条目配一句 TL;DR 说明"为什么重要"。
- **P1 / Absorbed**：已被 SSOT 吸收的模式。TL;DR 说明"已吸收至哪份 SSOT"，保留原文链接。
- **P2 / Historical**：探索性、实验性或已被取代的记录。TL;DR 说明"历史背景"，按需阅读。

 dreaming 的 Phase 2 增加一步"更新 `01-patterns/INDEX.md`"。判定规则：
- 被 ≥2 个 weekly 的 `decisions_accepted` 或 `project_lesson_candidates` 引用 → P0
- 已被 `04-ssot/*.md` 引用的模式 → P1
- 其他 → P2

**优点**:
- 零迁移成本，不改文件名，不动历史文件
- INDEX.md 可以提供 TL;DR，agent 一眼知道"为什么重要"而不用读全文
- 与现有时间戳命名机制完全兼容
- 如果 agent 不读 INDEX.md 直接 `ls`，大写的 `INDEX.md` 本身也会吸引注意力

**缺点**:
- 依赖 agent 纪律：必须养成"先看 INDEX.md"的习惯
- 如果 INDEX.md 更新不及时，会比 flat 目录更误导人
- 不能解决"agent 直接 grep/扫描整个目录"的问题

### 方案B：文件名加前缀置顶

给 P0/P1/P2 patterns 加前缀：

```
P0-2026-05-02-thin-skill-pattern.md
P1-2026-05-17-control-transfer-protocol.md
P2-2026-05-03-skill-combo-epistemology.md
```

**优点**:
- `ls` 时自然按重要性排序
- 不依赖 agent 是否读 INDEX.md
- 机器可读，glob 方便

**缺点**:
- 需要批量重命名 50+ 文件
- 破坏现有时间戳开头的统一性
- P0 文件内部仍然按时间排序，没有 TL;DR 解释"为什么重要"

### 方案C：按年份/主题归档旧 patterns

把较老的 patterns 移动到 `cortex/wiki/05-archived/`，减少 `01-patterns/` 的文件数量。

**优点**:
- 目录立刻变小
- 新 agent 不会被历史文件淹没

**缺点**:
- 删除/移动历史记录会损失上下文
- 哪些该归档没有明确标准，容易引发争议
- 与项目"SSOT 是 compass，不是 database"的记忆三轴模型冲突

### 方案D：用 curator 的 SQLite 作为 wiki metadata 索引后端

curator 已经在技术层面使用 SQLite 索引 cold pool 中的 skill metadata。同样的机制可以扩展到 cortex/wiki：

- 每个 `01-patterns/*.md` 的 frontmatter 或 metadata（status, importance, superseded-by, related-adr, related-ssot）写入 SQLite catalog
- `cortex/wiki/INDEX.md` 从 SQLite 查询生成，而不是靠 dreaming 做字符串拼接
- agent 可以直接通过 curator-like 查询定位 P0/P1/P2 patterns：`find patterns where importance=p0 and status=active`
- dreaming 的 Phase 2 从"写 Markdown 索引"变为"更新 SQLite catalog 并触发 INDEX 重新生成"

**优点**:
- SQLite 是成熟技术，curator 已经有现成实践
- 查询语义比 Markdown 索引更精确，可扩展更多过滤条件
- INDEX.md 和 metadata 不会 drift，因为 INDEX 是生成的
- 与 curator "local cold pool normalization" 的哲学一致：cortex/wiki 也可以有一个本地的、可查询的 metadata 视图

**缺点**:
- cortex 早期明确没有引入 SQLite（"还在早期"），现在重新引入需要重新论证
- 增加一个生成步骤：编辑 pattern → 更新 SQLite → 生成 INDEX.md
- 如果 SQLite 文件损坏或丢失，需要从 frontmatter 重建
- 可能和 curator "personal environment scan, not project artifact" 的定位冲突——如果 wiki catalog 是 project artifact，需要明确边界

## 决策

**选择**: 方案A —— 在 `cortex/wiki/01-patterns/` 内增加 `INDEX.md` 置顶索引，不改文件名。 dreaming 负责维护该索引。方案D（SQLite 后端）作为明确的后续演进方向，但当前不立即实施。

**原因**:

1. **零迁移成本，立即见效**。不改 50+ 文件名，不移动文件，只增加一个 INDEX.md。风险最低，可以马上测试 agent 是否真的会先看索引。

2. **INDEX.md 能提供 TL;DR**。这是文件名前缀做不到的。agent 一眼知道"为什么重要"，而不是只看到 `P0-` 前缀却不知道为什么。

3. **索引层解决索引问题，文件层保持不变**。重要性分层是索引职责。如果未来证明索引机制有效，再考虑是否下沉到文件名前缀或 SQLite。

4. **养成 agent 纪律**。项目已经要求 agent 先看 SSOT、先看 `AGENTS.md`、先看 `daily/`。增加"先看 `01-patterns/INDEX.md`"是同一套纪律的自然延伸。

5. **方案D需要重新圆桌**。curator 使用 SQLite 索引 skill metadata 已经成熟，但 cortex/wiki 之前没有引入 SQLite 是因为"项目还在早期"。现在索引本身成为问题，重新讨论这个前提是合理的。但方案D会改变 cortex 的架构边界（从纯文件系统治理变为文件+SQLite 治理），需要独立论证：
   - SQLite catalog 是 project artifact 还是 personal artifact？
   - 生成 INDEX.md 的责任放在 dreaming、curator，还是一个新的 cortex subcommand？
   - 如果 SQLite 损坏，恢复路径是什么？

   这些问题值得一个独立的 roundtable/ADR，而不是作为本 ADR 的附带方案解决。

## 影响

- 正面:
  - 新 agent 的 onboarding token 成本下降
  - patterns/ 和 SSOT 的关系变得明确
  - dreaming 的输出价值从"文档收敛"升级为"认知地图更新"
  - 与 `04-ssot/agent-onboarding-guide.md` 形成互补：前者给 mental model，后者给重要性地图

- 负面:
  - dreaming 每次运行需要额外一步索引维护
  - P0/P1/P2 判定规则需要不断校准
  - 如果 INDEX 更新不及时，会比 flat 结构更误导人（所以必须配合 ZK validate）

- 后续:
  - 更新 `lythoskill-dreaming` SKILL.md，把"更新 wiki INDEX"加入 Phase 2
  - 更新 `cortex/wiki/INDEX.md` 模板，支持 P0/P1/P2 分层
  - 对现有 50+ patterns 做一次初始分类（P0/P1/P2）
  - 给 `04-ssot/agent-onboarding-guide.md` 增加"读 INDEX 置顶"步骤
  - 开启方案D的独立讨论：是否用 curator/SQLite 作为 wiki metadata 索引后端

## 相关
- 关联 ADR: ADR-20260424125637347 (handoff format migration), ADR-20260519153000000 (scheduled weekly entropy reduction)
- 关联 Epic: 
- 关联 Skill: `lythoskill-dreaming`
- 关联文件: `cortex/wiki/INDEX.md`, `cortex/wiki/04-ssot/agent-onboarding-guide.md`
