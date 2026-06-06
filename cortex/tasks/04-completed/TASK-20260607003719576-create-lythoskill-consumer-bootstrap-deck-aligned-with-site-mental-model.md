# TASK-20260607003719576: Create lythoskill-consumer-bootstrap deck aligned with site mental model

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-07 | Created |
| in-progress | 2026-06-06 | Started |
| completed | 2026-06-06 | Closed via trailer |

## 背景与目标
The site frames lythoskill as "a gist for your AI toolkit": a `skill-deck.toml` declares what's active, `bunx @lythos/skill-deck link` reconciles it, and combos orchestrate loaded skills. The current `templates/AGENTS.md` approach drifts from this mental model by prescribing manual shell steps (mkdir, heredoc daily skeleton, bun install assumptions). We need a deck-first bootstrap artifact that lets any workspace adopt lythoskill governance by loading a deck and executing its combo.

## 需求详情
- [x] Create `examples/decks/lythoskill-consumer-bootstrap.toml` with governance skills in `[innate]` and a `[combo.bootstrap]` prompt
- [x] The combo prompt must follow site mental model: deck-as-declaration → link → skill-driven initialization (cortex init, scribe daily, writer docs) → validate
- [x] Update `templates/AGENTS.md` to reference the bootstrap deck as primary path; remove manual daily heredoc and `bun install` assumption
- [x] Update `templates/README.md` to lead with deck download + combo execution instead of static file copy
- [x] All package names verified against real `packages/*/package.json`

## 技术方案
- Deck uses FQ locators for lythoskill governance skills
- Combo prompt instructs agent to: create skill-deck.toml if missing, link, conditionally cortex init, use loaded scribe/writer skills for content, validate
- Static templates remain as fallback/copy-paste input for the writer skill
- No local package paths; all commands use `bunx @lythos/...`

## 验收标准
- [ ] `bunx @lythos/skill-deck validate --deck examples/decks/lythoskill-consumer-bootstrap.toml` passes
- [ ] A zero-knowledge agent loading the deck can follow combo.bootstrap without asking questions
- [ ] `templates/AGENTS.md` no longer contains manual daily heredoc or package-manager assumptions
- [ ] Pre-commit passes

## 进度记录
- 2026-06-07: Task registered.

## 关联文件
- 新增: `examples/decks/lythoskill-consumer-bootstrap.toml`
- 修改: `templates/AGENTS.md`, `templates/README.md`

## Git 提交信息建议
```
feat(deck): add lythoskill-consumer-bootstrap deck (TASK-20260607003719576)

- Deck-first bootstrap aligned with site "gist for your toolkit" mental model
- Combo prompt delegates initialization to loaded governance skills
- Update consumer templates to reference bootstrap deck
```

## 备注
This supersedes the static-only `templates/` approach; templates become input material for the writer skill invoked by the combo.
