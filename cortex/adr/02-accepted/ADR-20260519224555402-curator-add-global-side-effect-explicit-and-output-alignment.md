# ADR-20260519224555402: curator add 全局副作用显式化与 --output 对齐

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-19 | Created |
| accepted | 2026-05-19 | Accepted |

## 背景
`curator add` 命令在把 skill clone 到 cold pool 的同时，会执行两项隐式全局副作用：
1. 追加 `additions.jsonl` 到 `~/.agents/lythoskill/curator/`（决策历史记录）
2. write-through cache：即时扫描新 skill 并写入全局 `catalog.db`

这两项副作用的写入路径在源码中硬编码（`cli.ts:680`、`cli.ts:911`），不跟随 `scan --output`，也不跟随 `--pool`。此外，write-through cache 被包裹在空 `catch` 块中，失败完全静默。

用户的心理模型是："我指定了 `--pool`，所有操作都落在 pool 里。" 但实际上全局策展目录被悄悄修改了。当用户在不同项目使用多个 cold pool 时，additions 记录全部混在一个文件里，索引更新也可能写到非预期的位置。

## 决策驱动
- **副作用透明原则**：对用户主目录的修改必须在 stdout 中显式声明路径
- **心智模型一致性**：`add` 的元数据副作用应与 `scan` 的输出目录对齐，或至少提供对齐的手段
- **失败可见性**：best-effort 操作不应静默吞掉异常，应给出降级提示让用户知道"稍后 scan 会补齐"
- **多冷池支持**：多个 cold pool 场景下，additions 记录不应强制全局混排

## 选项

### 方案A：保持现状（集中式硬编码）
**优点**:
- 默认场景零配置，便利性最高
- 全局 additions.jsonl 天然形成跨项目的统一决策日志
- 代码改动量最小（零改动）

**缺点**:
- 隐式副作用违反 CLI 诚实性原则
- 多 cold pool 场景下 additions 混杂，难以按 pool 追溯
- write-through 失败静默，用户无法区分"已索引"和"未索引但 clone 成功"
- `scan --output ./local` 与 `add` 的索引位置脱节

### 方案B：add 支持 `--output` + 副作用显式声明 + 降级提示
**优点**:
- 默认行为完全不变（不传 `--output` 仍走全局默认路径）
- 多冷池场景可通过 `--output` 保持 scan 与 add 的索引位置一致
- stdout 显式声明 additions 和 index 的写入路径，消除意外感
- write-through 失败时打印降级提示，而非静默跳过
- 遵循最小惊讶原则（Principle of Least Astonishment）

**缺点**:
- `add` 参数表面 +1（`--output`）
- 如果用户频繁切换 `--output`，可能产生多个分散的 additions.jsonl，全局追溯需聚合

## 决策
**选择**: 方案B

**原因**:
- 默认行为不变保证了向后兼容和便利性
- `--output` 是可选的逃生舱（escape hatch），只在需要时启用
- 显式声明和降级提示属于"信息补全"而非"行为变更"，不会破坏现有脚本
- 与 ADR-20260511210000000（curator output 集中化）不冲突：集中化是默认值，分散化是显式 override

## 影响
- 正面:
  - `curator add` 的 UX 从"黑盒"变为"白盒"
  - 多项目/多冷池用户可维持独立的策展索引
  - write-through 失败时用户明确知道需要手动补 scan
- 负面:
  - 新增 `--output` 参数，CLI help 和 SKILL.md 文档需同步更新
  - 技能层面需通知用户"add 现在会多打印两行路径信息"
- 后续:
  - 实现 `curator add --output` 参数透传（关联 TASK）
  - 评估是否需要在后续版本中把 `--output` 提升为环境变量/配置文件级别的默认项

## 相关
- 关联 ADR: ADR-20260511210000000（curator output 集中化到 ~/.agents/lythoskill/curator/）
- 关联 Epic: EPIC-20260519-curator-add-ux-transparency（cortex 创建中）
