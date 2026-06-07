# ADR-20260607233903985: CLI task command: subcommand inconsistency between create and state transitions

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-06-07 | Created |
| accepted | 2026-06-07 | Accepted |

## 背景

Cortex CLI 的 `task` 命令在"创建"和"状态流转"两个场景下采用了不同的接口模式：

- **创建**: `task "title"` — 直接传 title，无 subcommand
- **状态流转**: `task start <id>` / `task review <id>` / `task done <id>` — 使用 subcommand

今天实际发生：agent 误用 `task create "title"`，CLI 将 `create` 解析为 title，生成了无意义的 `TASK-...-create.md`。

根因不是 agent "幻觉"，而是 CLI 本身的不一致性：当用户已经熟悉 `task start/review/done` 的 subcommand 模式后，`task "title"` 的扁平模式违背了已建立的心智模型。

## 决策驱动

1. 用户（包括 agent）对 subcommand 模式的预期是合理的 — `start/review/done` 已经训练了这种预期
2. 误用的代价虽小但频繁（生成无意义文件 + 需要手动删除重建）
3. 修复成本极低（CLI 增加 `create` 别名或提示即可）

## 选项

### 方案A: 保持现状，靠文档约束
**优点**:
- 零代码改动
- 现有帮助文本已明确说明用法

**缺点**:
- 不一致性持续存在，误用会继续发生
- 文档约束对 agent 效果有限（agent 读的是 SKILL.md，不是 `--help`）

### 方案B: `task create "title"` 作为创建的标准入口
**优点**:
- 与 `task start/review/done` 形成一致的 subcommand 模式
- 消除用户心智模型冲突

**缺点**:
- 破坏性变更：现有脚本/习惯使用 `task "title"` 的会失效
- 需要更新所有文档和 SKILL.md 引用

### 方案C: 兼容模式 — `task create "title"` 和 `task "title"` 都支持
**优点**:
- 向后兼容，无破坏性变更
- 满足 subcommand 直觉，同时保留旧用法

**缺点**:
- CLI 代码稍微复杂（多一个分支判断）
- 两种写法并存可能让新人困惑（但 `task "title"` 可以标记为 deprecated）

## 决策

**选择**: 方案C（兼容模式，长期向方案B 迁移）

**原因**:
- 修复成本极低（CLI 增加 `if (arg === 'create')` 分支即可）
- 向后兼容，不影响现有工作流
- 可在帮助文本中标注 `task "title"` 为 legacy 用法

## 影响

- **正面**: 消除误用模式，CLI 接口更自洽
- **负面**: 需要更新 cortex CLI 源码 + 帮助文本 + AGENTS.md 引用
- **后续**:
  - 在 CLI 中实现兼容
  - 更新 AGENTS.md 中的示例
  - 考虑在 `task "title"` 用法上加 deprecation warning（v1.0 后移除）

## 相关
n- 关联 ADR:
- 关联 Epic:

## 相关
- 关联 ADR:
- 关联 Epic:
