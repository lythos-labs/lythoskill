# TASK-20261014175122489: release docs remaining gaps from zero-context review: name table cold-start pages rollback

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-14 | Created |
| in-progress | 2026-10-19 | Started |
| suspended | 2026-10-19 | Blocked |

## Background & Goals
用 `pi --model deepseek-flash` 做了一次零背景评审（读 release-auth-workflow.md + release-troubleshooting.md，不读源码/AGENTS.md）。它能正确重建流程+原理，但列了 11 个「零背景读者会卡住」的缺口。其中 3 个已修（repo 名 Caltara→lythos-labs、test-utils「private」措辞、legacy 流程缺 build --all，见 commit 3b5bd6a5）。本卡登记剩下的 8 个，避免流失。

## Requirements
- [ ] ① 冷启动：`{{PACKAGE_VERSION}}` 占位符在 source 里未替换，读者无法复制执行；首版/新 clone 怎么起头、为何 bump 用当前版本不用 latest——补一段说明
- [ ] ② 新包首发的可执行步骤（classic token 手工首版 / 临时 NPM_TOKEN 怎么加怎么删）
- [ ] ③ Pages 部署细节（repo Pages 设置、构建命令、产物路径、source 切到 Actions）
- [ ] ④ npm 名 ↔ 目录名权威映射表（`@lythos/skill-deck` vs `packages/lythoskill-deck` 等）
- [ ] ⑤ release.yml 实际 job 划分 + 「generated skill artifacts in sync」门禁在哪一步跑
- [ ] ⑥ 回滚/撤回语义：打错 tag、unpublish/deprecate 坏版本
- [ ] ⑦ 未定义术语：BDD/reproduce gates 命令、`npm stage publish` 是什么
- [ ] ⑧ 文档里引用的 ADR/daily 对零背景者不可验证——决定是保留引用还是内联结论

## Technical Approach
纯文档补全,不引入新抽象,0/6 C-criteria,无需 ADR。按「零背景读者能否照做」为标准逐条过；④（映射表）可从 packages/*/package.json 的 name 字段机械生成，不手写。③（Pages）部分可能超出 release 文档职责，可只放指针指向 GitHub Pages 设置，不重复写。⑥（回滚）是新的 failure-mode，应归入 release-troubleshooting.md 而不是 auth-workflow。

## Acceptance Criteria
- [ ] 8 项逐条处理：要么补进文档，要么明确标「超出本档职责 + 指向」
- [ ] 再跑一次零背景评审（`pi --model deepseek-flash`）确认新读者不再卡这 8 处
- [ ] build --all 同步 skills/；cortex probe 无 empty-shell

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20261014175122489)

- Detail 1
- Detail 2
```

## Notes
