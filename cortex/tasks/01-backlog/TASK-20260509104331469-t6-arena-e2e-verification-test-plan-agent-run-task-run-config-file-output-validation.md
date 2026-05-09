# TASK-20260509104331469: T6 — Arena e2e verification test plan: agent-run task + run --config + file output validation

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-09 | Created |

## 背景与目标

验证 v0.9.39 的 arena CLI（`--skills` 已删除，全走 deck 路径）在 npx/bunx 下的全部入口路径都正确工作，尤其是**真实文件输出场景**。不依赖上游包缓存状态。

CLI 有 3 条执行路径，都要测（之前只测了 agent-run --brief 和 run --config --dry-run）：

| 路径 | 覆盖情况 |
|------|---------|
| `single --brief`（原 agent-run） | ✅ 已测（PASS） |
| `single --task <scenario.agent.md>` | ❌ 未测 |
| `vs --config arena.toml` 全流程（原 run） | ❌ 仅 --dry-run，未真实执行 |
| `scaffold --decks` | ❌ 未测 |
| `vs --decks` CLI-flag（0.10 已删除） | ✅ 已确认被拒绝 |

## 测试场景

### S1: single --brief 基线
- 命令：`bunx @lythos/skill-arena@0.9.39 single --brief "List 5 numbers" --deck ./examples/decks/scout.toml --timeout 60000`
- 状态：✅ PASS（已执行）
- 验证 CLI 解析 + deck link 基本工作（0.10: 其实是 `single` 命令）

### S2: single --task 场景文件
- 命令：`bunx @lythos/skill-arena@0.9.39 single --task <path> --deck ./examples/decks/scout.toml`
- 需要写场景文件：`test/scenarios/arena-single-task.agent.md`
  - Given: 空工作目录，bun 可用
  - When: 写 `output.md` 包含指定内容，验证 `bun test` 通过
  - Then: `output.md` 存在内容正确
  - Judge: 内容完整性、格式、可执行
- 前置：清除 bunx temp 缓存

### S3: single 产生真实文件（.docx）
- 命令：`bunx @lythos/skill-arena@0.9.39 single --task <path> --deck ./examples/decks/documents.toml`
- 需要写场景文件：`test/scenarios/arena-docx-output.agent.md`
  - Given: 空工作目录，bun 可用，cookie recipe 描述
  - When: 生成 cookie recipe .docx 文件
  - Then: .docx 文件存在且可读
  - Judge: 格式正确、内容完整
- 参考: 已有 cookie recipe arena 测试产出（`playground/arena-bdd-research/runs/`）

### S4: vs --config arena.toml 声明式多 side
- 命令：`bunx @lythos/skill-arena@0.9.39 vs --config examples/arena/add-remove/arena.toml`
- 需要 kimi 或 claude player 可用
- 验证：report.md 生成 + runs/ 下每个 side 的输出文件 + judge 评分
- 最重要的入口 — `vs` 是正式推荐路径

### S5: vs --decks 被拒绝
- 命令：`bunx @lythos/skill-arena@0.9.39 vs --task X --decks A,B`
- 验证：0.10 中 CLI-flag 模式已删除，应提示 `--config <arena.toml> is required`
- 状态：⏳ 待 ADR 实施后自动通过

### S6: scaffold --decks 遗留路径
- 命令：`bunx @lythos/skill-arena@0.9.39 scaffold --task "test" --decks "./examples/decks/arena-add-remove/base.toml,./examples/decks/arena-add-remove/plus-research.toml"`
- 验证：生成 arena.json + TASK-arena.md + sides/ 目录结构
- 不执行 subagent（scaffold 仅产生文件）

### S7: bunx 跨包依赖解析
- 清缓存后全部 S2/S4 通过（曾踩到 bunx 解析到 0.9.31 导致 buildReconcilePlan 缺失）
- 验收：所有 bunx 解析的 `@lythos/*` 包版本 ≥0.9.39

## 执行顺序

```
S1 → S6 → S2(写scenario) → S3(写scenario) → S4 → S5 → S7(清缓存重跑关键路径)
 基线   scaffold简单    single场景     docx产出    主力入口   拒旧  🔁 验证
```

S1/S6 不依赖 player，可以随时跑。
S2/S3/S4 需要至少一个 AI player（kimi 或 claude-sdk）可用。
S7 是全局验证，最后做。

## 验收标准

- [ ] S1 通过（基线）
- [ ] S2 场景文件 + 通过
- [ ] S3 场景文件 + 通过
- [ ] S4 通过（arena.toml 多 side 真实执行）
- [ ] S5 通过（CLI-flag 兼容）
- [ ] S6 通过（scaffold 结构正确）
- [ ] S7 清缓存后关键路径仍通过
- [ ] 发现问题有记录和修复

## 关联文件
- 新增: `test/scenarios/arena-agent-run.agent.md`
- 新增: `test/scenarios/arena-docx-output.agent.md`

## Git 提交信息建议
```
test(arena): e2e verification — agent-run, run --config, docx output (TASK-20260509104331469)

- S1-S7 test scenarios for v0.9.39 release
- agent-run --task and --brief paths verified
- run --config arena.toml full pipeline tested
- scaffold --decks legacy path works
- bunx cache-independent resolution validated
```

## 备注

agent-run 内部调 `bunx @lythos/skill-deck link`（`cli.ts:183`），这是最关键的外部依赖调用。skill-deck 的 npm 版本与本地版本必须一致。S7 专门验证清缓存后的解析。
