# TASK-20260530135730555: Arena BDD reproduce.sh for CLI and runner IO injection

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-30 | Created as part of EPIC-20260530135721111 |
| completed | 2026-06-13 | Reconciled — work was completed in commit history but Status History was missing |

## 背景与目标

为 arena IO 注入改造添加 reproduce.sh BDD 场景，遵循 ADR-20260518024500631 的 reproduce.sh 模式（IoC handoff + stdout prompt injection + 外部 judge.md）。

参考先例：
- `showcase/2026-05-29-curator-*-io-injection-bdd/` (6 个场景)
- `showcase/2026-05-28-deck-*-reproduce.sh/` (3 个场景)

## 需求详情

- [x] CLI IO 注入 reproduce.sh：验证 main() 接受 mock IO
- [x] Runner IO 注入 reproduce.sh：验证 runArenaFromToml 接受 mock IO
- [x] 每个场景包含：reproduce.sh + judge.md
- [x] ZK 验证：零知识 subagent 执行通过

## 验收标准

- [x] `bash showcase/2026-05-30-arena-cli-io-injection-bdd/reproduce.sh` → ZK agent 完成
- [x] `bash showcase/2026-05-30-arena-runner-io-injection-bdd/reproduce.sh` → ZK agent 完成
- [x] Judge 判定 PASS

## 关联文件
- 新增: `showcase/2026-05-30-arena-cli-io-injection-bdd/`
- 新增: `showcase/2026-05-30-arena-runner-io-injection-bdd/`
