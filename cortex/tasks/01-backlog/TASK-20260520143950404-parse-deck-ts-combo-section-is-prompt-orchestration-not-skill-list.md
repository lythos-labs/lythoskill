# TASK-20260520143950404: parse-deck.ts: [combo] section is prompt orchestration, not skill list

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-20 | Created |
| in_progress | 2026-05-20 | Fixing parse-deck.ts |

## 背景与目标

SKILL.md (line 214) 已将 `[combo]` 定义为 `combo.prompt` 轻量编排提示，toml-format.md
已对齐。但 parse-deck.ts 仍将 `[combo]` 当作 skill section 解析（与 `[innate]`/`[tool]`
同列）。需修正：`[combo]` 不再解析 skills 数组，改为解析 prompt 字段。

## 需求详情
- [x] parse-deck.ts: 移除 `[combo]` 从 skill section 循环
- [x] 新增 `combo.prompt` 解析，作为 ParsedDeck 的可选字段
- [x] schema.ts: SkillType 移除 "combo"
- [x] 相关引用更新（add.ts, cli.ts, migrate-schema.ts, test/runner.ts）
- [x] 现有使用 `[combo]` skills 的 deck toml 不受影响（parse 跳过无 skills 的 section）

## 技术方案

1. `parse-deck.ts`: 将 `["innate", "tool", "combo"]` 改为 `["innate", "tool"]`
2. 新增 combo prompt 解析：`parsed.combo?.prompt` → `ParsedDeck.comboPrompt?: string`
3. `schema.ts`: `type: z.enum(["innate", "tool", "transient"])` 移除 combo
4. `add.ts`: 移除 combo 从有效 type 列表
5. `cli.ts`: 移除 combo 从 `--type` help text

## 验收标准
- [x] `[combo] prompt = "..."` 的 deck toml 解析不报错
- [x] `[combo] skills = [...]` 的旧格式 deck 兼容（跳过）
- [x] `deck add --type combo` 报错提示不再支持
- [x] 测试通过

## 关联文件
- 修改: packages/lythoskill-deck/src/parse-deck.ts
- 修改: packages/lythoskill-deck/src/schema.ts
- 修改: packages/lythoskill-deck/src/add.ts
- 修改: packages/lythoskill-deck/src/cli.ts
- 修改: packages/lythoskill-deck/test/runner.ts

## Git 提交信息建议
```
fix(deck): [combo] parsed as prompt, not skill section (TASK-20260520143950404)

- parse-deck.ts: [combo] removed from skill section loop
- schema.ts: SkillType drops "combo"
- add.ts, cli.ts: combo removed from valid types
- combo.prompt survives as deck-level metadata for agents
```
