# TASK-20261013142924953: fix index generation path drift

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-13 | Created |
| in-progress | 2026-10-13 | Started |

## Background & Goals
`cortex index` 生成的 `INDEX.md` 落点与文档漂移。文档（SKILL.md Directory Structure、
AGENTS.md §0、包 README）一致声明索引在 `cortex/INDEX.md`，但
`generate-index.ts` 的 `generateIndex()` 写的是 **CWD 相对路径** `INDEX.md`
（generate-index.ts:251），从仓库根目录运行就落到仓库根的 `INDEX.md`。
实证：本仓库根目录现有一个 60KB 未跟踪的 `/INDEX.md`（2026-09-11 生成），
即某次从根目录跑 `cortex index` 的产物。`init` 也完全不创建 INDEX.md，
新鲜 init 的项目目录树与文档不符。

## Requirements
- [ ] `generateIndex()` 将主索引写到 `cortex/INDEX.md`（由 config 的 `tasksDir` 推导 cortex 根，不依赖 CWD）
- [ ] `init` 结束时生成初始 `cortex/INDEX.md`（空项目也有文档承诺的文件）
- [ ] `generateWikiIndex()` 行为不变（本就写 `cortex/wiki/INDEX.md`）
- [ ] 新增协同定位测试：断言主索引落在 cortex 根、且 CWD 根不出现 `INDEX.md`
- [ ] 删除本仓库根目录的流浪 `/INDEX.md`（未跟踪生成物，无任何引用）

## Technical Approach
行为对齐文档的 bug fix，不引入新抽象/边界/概念，0/6 C-criteria，无需 ADR。
- `generate-index.ts`：`writeFileSync('INDEX.md', …)` → `writeFileSync(join(dirname(config.tasksDir), 'INDEX.md'), …)`。
  用户 config 若把 `tasksDir` 配成无父级的 `'tasks'`，`dirname` 得 `'.'`，行为同旧版，向后兼容。
- `init.ts`：config 写盘完成后调用 `generateIndex(config)`，一次调用同时覆盖"树里有 INDEX.md"与"内容即时可用"。
- 测试：`src/generate-index.test.ts`，`mkdtempSync` 建临时目录，绝对路径 config，
  断言 `tmp/cortex/INDEX.md` 存在且 `tmp/INDEX.md` 不存在。
<!-- ⚠️ REQUIRED: Implementation plan, key decisions, references. Empty = shell, blocked by probe.

     ⚠️ A DECISION DOES NOT BELONG IN THIS SECTION. If this card introduces or
     changes an abstraction, a module boundary, a package boundary, a named
     concept, or a closed data set — that is an architectural decision, and it
     must be recorded in an ADR. This section may only REFERENCE that ADR; it
     must never be the only record. A one-line statement of intent gives a
     reviewer nothing to object to: no options to reject, no rejected
     alternative to question. Two same-shape incidents (feed-adapters.ts 2026-05,
     adapter-registry.ts 2026-09) both rode in exactly this section.

     Prepare it first, in full:  bunx @lythos/project-cortex adr "<decision-title>"
     Criteria (hit >= 2 of C1-C6): AGENTS.md § Decision Records -->

## Acceptance Criteria
<!-- ⚠️ REQUIRED: Testable acceptance criteria. Keeping placeholders = shell. -->
- [ ] `bun test src/ --pass-with-no-tests`（lythoskill-project-cortex 包）全绿，含新测试
- [ ] 新测试断言：索引写入 `<tasksDir 父级>/INDEX.md`，CWD 根无 `INDEX.md`
- [ ] 仓库根 `/INDEX.md` 已删除，`git status` 不再出现该流浪文件
- [ ] 全仓 `bun --filter='*' run test` 通过

## Progress Log
- 2026-10-13 漂移实证：`generate-index.ts:251` 写 CWD 相对路径；根 `/INDEX.md`（60KB，未跟踪，09-11）为活证据；`init.ts` 无 INDEX.md 产物。

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20261013142924953)

- Detail 1
- Detail 2
```

## Notes
