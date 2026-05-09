# TASK-20260509101438298: Align arena doc surface to working onboarding paths — replace broken `--skills` bare-name examples

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-09 | Created |
| completed | 2026-05-09 | All items done --skills removed + examples/arena/ created + 6 doc files updated |
| completed | 2026-05-09 | Closed via trailer |

## 背景与目标

**Goal**: 跟着 README 跑 arena 的用户能快速体验到工具的优势，不撞 bare-name FQ-only 错误。

当前 4 个文件仍展示 bare-name `--skills` 示例（`design-doc-mermaid,mermaid-tools` 或 表里的 `A,B`），但 ADR-20260502012643244 (FQ-only) 已落地，`deck link` 拒绝 bare name。Doc 滞后于策略，入口示例是死路。

不只用 FQ 代替 bare name 就完事——`--skills` 本身依赖用户在 cold pool 里有特定 repo，不是真正的"零摩擦" onboarding。真正可跑的必选路径已有历史积累：
- `agent-run --brief` + `--deck`（最简单次运行，见去年的 arena agent-run 改版）
- `run --config arena.toml`（正式 A/B 对比，走 deck path）
- `scaffold --decks`（Pareto frontier，path-based 无 bare-name 问题）

**Scope 扩展**：不只是 README.md 和 README.zh.md，还涉及 monorepo 包内 README 和 SKILL.md 中 arena 示例的一致性修正。

技术背景参考：
- ADR-20260502012643244 (FQ-only)
- ADR-20260508074057834 (working_set 路径修正)
- ADR-20260508075301691 (deck link URL 支持)
- ADR-20260507014124191 (agent-friendly CLI error)
- 近期 `agent-run` 和 `deck link` 改善（2026-05-07/08 的 daily）

## 需求详情

#### 受影响文件
| 文件 | 位置 | 当前问题 |
|------|------|---------|
| `README.md` | L487 对比表 | `--skills "A,B"` → bare name |
| `README.zh.md` | L470-472 示例 | `--skills "design-doc-mermaid,mermaid-tools"` → bare name |
| `packages/lythoskill-arena/README.md` | L58-62 Quick Start Mode 1 | 同上 bare name |
| `packages/lythoskill-arena/skill/SKILL.md` | L119-122 scaffold Mode 1 | 同上 bare name |

#### 前置：`--skills` 废弃
- 已有 deck URL 支持，arena 全部走 deck path，`--skills` 参数无必要
- [x] `packages/lythoskill-arena/src/cli.ts` scaffold 中删除 `--skills` 分支（只保留 `--decks`）
- [x] `parseArgs` 中删除 `--skills`/`-s` 解析
- [x] 同步更新 CLI help text（`printHelp()`）
- [x] 删除 `--control` 死参数（仅被 `--skills` 使用）

#### 前置：创建 arena 示例配置
- [x] 创建 `examples/arena/research-compare/arena.toml` — 声明式 A/B 对比（documents vs research-documents）
- [x] 创建 `examples/decks/arena-add-remove/` — 真实对比文件（`base.toml`, `plus-research.toml`, `minus-pdf.toml`）
- [x] 创建 `examples/arena/add-remove/arena.toml` — 三路 Pareto 声明式配置
- [x] 验证：`--dry-run` 通过

#### Doc 修正
- [x] `README.md` A/B 表：指向真实 contrast files
- [x] `README.zh.md` A/B 表 + 示例：同步修正
- [x] `packages/lythoskill-arena/README.md` Quick Start
- [x] `packages/lythoskill-arena/skill/SKILL.md` scaffold + 参数表
- [x] 2 个 reference doc 同步修正

## 技术方案

关键位置：
- `README.md` L487 — `--skills "A,B"` 表项
- `README.zh.md` L470-472 — 完整示例
- `packages/lythoskill-arena/skill/SKILL.md` L119-122 — scaffold 示例

对于 `--skills` 形式，三种处理方向：
1. 替换为 `--decks` 形式（推荐 — 无 bare-name 问题，且更接近实际用法）
2. 标注 `skills` 必须是 FQ locator（保留但加脚注）
3. 标记 scaffold + `--skills` 为过时，主推 `run --config arena.toml`（最诚实，但改动大）

## 验收标准
- [ ] 所有 README 中 `--skills` 示例不再包含 bare name
- [ ] FQ-only 在 doc 中有对应说明（至少指向 ADR）
- [ ] 中英文示例一致

## 进度记录

## 关联文件
- 修改: `README.md`, `README.zh.md`, `packages/lythoskill-arena/skill/SKILL.md`
- 新增: 无

## Git 提交信息建议
```
docs(arena): fix stale --skills examples — bare names rejected under FQ-only (TASK-20260509101438298)

- README.md L487: annotate --skills requires FQ locators
- README.zh.md L470-472: replace bare-name --skills example with --decks
```

## 备注
