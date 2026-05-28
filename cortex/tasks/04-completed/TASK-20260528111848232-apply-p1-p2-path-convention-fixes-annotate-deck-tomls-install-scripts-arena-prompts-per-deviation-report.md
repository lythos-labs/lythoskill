# TASK-20260528111848232: Apply P1/P2 path-convention fixes: annotate deck tomls, install scripts, arena prompts per deviation report

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-28 | Created |
| in-progress | 2026-05-28 | Started |
| completed | 2026-05-28 | Closed via trailer |

## 背景与目标

T5 (path-convention.md) 的偏离报告列出了 48 项路径叙事偏离。P0 已在 `e79de1a` 中修复，剩余的 P1（27 项，主要是 deck toml 缺少平台可配置注释 + install 脚本硬编码路径）和 P2（17 项，主要是 arena runner/preflight 硬编码 `.claude/skills/`）需要统一清理。

目标：消掉偏离报告中所有 action 标记为 `annotate` 或 `change` 且不属于其他 task（T1 site/ 部分）的条目。

## 需求详情

### Batch 1 — 通用 deck toml 添加平台注释（P1，仅用户会 copy-paste 的通用 deck）

特化 deck（codex/、baoyu-*、deepseek-*、arena-add-remove/）用自己的路径就行，不需要 annotate。只标注通用 starter 类 deck。

- [ ] `examples/decks/vanilla.toml` — `working_set` 行尾加 ` # Claude Code default; or .agents/skills (community standard)`
- [ ] `examples/decks/qa-sweep.toml` — 同上
- [ ] `examples/decks/site-builder.toml` — 同上
- [ ] `examples/decks/governance.toml` — 同上
- [ ] `examples/decks/architecture-explainer.toml` — 同上
- [ ] `examples/decks/visual-explainer.toml` — 同上
- [ ] `examples/decks/scout.toml` — 同上

### Batch 2 — examples/*.sh 添加可配置提示（P1）

- [ ] `examples/install-deck.sh` — 第 29-30 行 `echo` 和 `ls` 后加注 "(or your configured working_set)"
- [ ] `examples/quick-init.sh` — self-check 块顶部加平台配置注释

### Batch 3 — packages/ 源模板添加注释（P1）

- [ ] `packages/lythoskill-deck/skill/assets/skill-deck.toml.template` — `working_set` 注释改为提及平台可配置

### Batch 4 — Arena prompts 泛化路径（P2）

- [ ] `packages/lythoskill-arena/src/runner.ts` — prompt 中 `.claude/skills/` → "your working set" 或添加可配置说明
- [ ] `packages/lythoskill-arena/src/preflight.ts` — AGENTS.md 模板中 `.claude/skills/` → 泛化
- [ ] `packages/lythoskill-arena/skill/SKILL.md` — skill 指令中硬编码路径 → 泛化
- [ ] `packages/lythoskill-coach/skill/SKILL.md` — prompt 中 `.claude/skills/` → 泛化

### Done check

- [ ] Rebuild: `lythoskill build` 同步 `skills/` 输出目录
- [ ] `cortex probe` 通过

## 技术方案

1. **Deck toml**: 每行格式 `working_set = ".claude/skills"  # Claude Code default; change for Cursor/Codex`，保持与 `examples/decks/codex/*.toml` 的注释风格一致
2. **Shell 脚本**: 最小改动 — 在 echo 行加 `(or your configured working_set)`，不重构脚本结构
3. **Arena prompts**: 把 agent-facing 提示从硬编码路径改为 "your working set" 或 "the working set directory"，因为这些 prompt 是发给子 agent 的，子 agent 不知道自己的 working_set 路径
4. **SKILL.md vs 源模板**: `packages/<pkg>/skill/SKILL.md` 是源（改这个），`skills/<pkg>/SKILL.md` 是 build 输出（不改，等 rebuild）

参考: `cortex/wiki/01-patterns/path-convention.md` 偏离报告

## 验收标准

- [ ] 7 个通用 deck toml 带平台可配置注释（特化 deck 用自己的路径，无需 annotate）
- [ ] `install-deck.sh` 和 `quick-init.sh` 不暗示 `.claude/skills` 是唯一路径
- [ ] Arena runner/preflight/SKILL 不再硬编码 `.claude/skills/` 为唯一搜索路径
- [ ] Coach SKILL.md 路径泛化
- [ ] `lythoskill build` 后 `skills/` 与源一致
- [ ] `cortex probe` 无新增警告
- [ ] 偏离报告中所有非-T1/非-showcase 的 P1/P2 条目已解决

## 进度记录

## 关联文件
- 修改: `examples/decks/*.toml` (7), `examples/install-deck.sh`, `examples/quick-init.sh`, `packages/lythoskill-deck/skill/assets/skill-deck.toml.template`, `packages/lythoskill-arena/src/runner.ts`, `packages/lythoskill-arena/src/preflight.ts`, `packages/lythoskill-arena/skill/SKILL.md`, `packages/lythoskill-coach/skill/SKILL.md`
- 新增: (无)

## Git 提交信息建议
```
fix: apply P1/P2 path-convention fixes from deviation report (TASK-20260528111848232)

- Annotate 22 examples/decks/*.toml with platform configurability comment
- Add working_set configurability note to install-deck.sh and quick-init.sh
- Genericize hardcoded .claude/skills/ references in arena and coach prompts
- Refs: TASK-20260527212829974 (T5), path-convention.md deviation report
```

## 备注

Refs: TASK-20260527212829974 (T5 — path-convention.md), EPIC-20260527212032856
Blocked by: None
Blocks: None
