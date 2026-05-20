# ADR-20260519225831495: curator find — bare name to full path lookup

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-19 | Created |

## 背景

用户从网络/社区发现一个 skill 的 bare name（如 "fullstack-dev"），想知道它的完整 path 以便
`deck add`。目前 `deck add` 要求完整 locator（`github.com/owner/repo/path`），bare name 无法
直接使用。

Curator 已扫描冷池并索引了所有 SKILL.md 的 `name` 字段到 `catalog.db`。但这个索引是结构化查询
用的（`query "SELECT ..."`），没有一个简洁的 "给我可用的 deck add 命令" 出口。

## 决策驱动

bare name → full path 是 deck add 的前置步骤。不闭合这个断层，用户每次发现新技能都要手动去
GitHub 搜完整路径。Curator 作为本地知识库，应该能用已知信息回答"这个 skill 的完整路径是什么"
并给出可直接使用的命令。

## 选项

### 方案A: `curator find <bare-name>` — 本地冷池查询

新增 `find` 子命令：按 name 查 catalog.db，输出完整 locator + deck add 命令 + toml 片段。

**优点**:
- 利用已有索引（catalog.db 已有 name 字段），实现量极小
- 本地操作，毫秒级响应
- 输出直接可用的命令（复制粘贴到终端）
- 符合 curator 本地优先定位（不依赖外部 API）

**缺点**:
- 只查本地冷池，未 clone 的技能查不到
- 需要先 `curator scan` 或 `curator add` 才能命中

### 方案B: `deck add --find <name>` — deck CLI 集成

在 deck CLI 加 `--find` 参数：deck 内部调 curator query，然后自动 add。

**优点**:
- 一步到位：查找 + 添加在一个命令里
- 用户不需要知道 curator 存在

**缺点**:
- 耦合 deck ↔ curator（deck 需要知道 curator 的内部查询逻辑）
- 自动 add 不可逆（用户可能只想查路径，不想直接添加）
- 增加 deck CLI 复杂度

### 方案C: 外部 registry 查询

查公共 skill registry（agentskill.io, mcp.so 等）的 API。

**优点**:
- 不限于本地冷池，理论上可以查到所有公开 skill

**缺点**:
- curator 不做外部 API wrapper（per ADR-20260508230803515）
- 公共 registry 覆盖度不确定，bare name 匹配质量不可控
- 引入网络依赖

## 决策

**选择**: 方案A — `curator find <bare-name>`

**原因**:
1. 利用已有索引，改动量最小
2. 查和加分离：curator find 负责查找，deck add 负责添加，各司其职
3. 输出可审计：用户看到完整 path 再决定是否 add，而非自动操作
4. 符合 curator 本地优先的 thin pattern 定位
5. 未命中时 agent 可以执行 WebSearch（per curator's Discovery SOP），curator 本身不 wrap API

## 影响

- 正面: 闭合 bare name → deck add 的信息断层；新用户上手更快；curator 的价值从"收藏管理"扩展到"技能发现导航"
- 负面: catalog.db 需要有该技能才能命中（需要先 `curator add`）；冷池规模决定查询覆盖率
- 后续: `curator find` 输出后，agent 可直接接 `deck add` 或指导用户手动添加

## 相关
- 关联 ADR: ADR-20260508230803515 (curator no external API wrappers)
- 关联 Task: TASK-20260519224912252
