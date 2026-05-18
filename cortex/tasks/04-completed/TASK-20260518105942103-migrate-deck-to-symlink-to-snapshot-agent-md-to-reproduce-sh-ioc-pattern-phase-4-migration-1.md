# TASK-20260518105942103: Migrate deck-to-symlink-to-snapshot to reproduce.sh

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| in-progress | 2026-05-18 | reproduce.sh + judge.md written |
| in-progress | 2026-05-18 | Started |
| review | 2026-05-18 | Deliverables committed |
| completed | 2026-05-18 | Done |

## 背景与目标
`deck-to-symlink-to-snapshot.agent.md` 是 deck BDD 中 IO 密度最高的场景（25 IO ops）——验证 symlink ↔ snapshot 往返、lock file mode 更新、内容保留、幂等性。迁移到 reproduce.sh IoC 模式。

Parent: TASK-20260518030349966 (Phase 4), Epic: EPIC-20260518024809887

## 需求详情
- [x] 写 reproduce.sh: shell scaffold (Steps 1-2) + IoC handoff (Step 3) + judge reference (Step 4)
- [x] 写 judge.md: 10 个 criteria，weighted，judge agent only
- [x] 执行 reproduce.sh → agent 验证 roundtrip → 10/10 PASS
- [x] judge-verdict.json + decision-log.jsonl 产出并提交
- [x] 原 .agent.md 保留共存

## 技术方案
Co-located in `packages/lythoskill-deck/test/scenarios/to-symlink-snapshot-bdd/`:
- reproduce.sh: 创建 cold-pool + deck → deck link → IoC handoff（agent 验证 lstat/lock/content）
- judge.md: 分离的评分标准（task agent 不可见）

## 验收标准
- [ ] 零知识 subagent `bash reproduce.sh` → 完成 roundtrip 验证
- [ ] 10 criteria 全部 PASS
- [ ] decision-log.jsonl ≥8 条记录
- [ ] judge-verdict.json 写入 workdir
- [ ] 原 .agent.md 保留（共存，不删除）

## 关联文件
- 新增: `packages/lythoskill-deck/test/scenarios/to-symlink-snapshot-bdd/reproduce.sh`
- 新增: `packages/lythoskill-deck/test/scenarios/to-symlink-snapshot-bdd/judge.md`
- 参考: `packages/lythoskill-deck/test/scenarios/deck-to-symlink-to-snapshot.agent.md` (original)
- Epic: EPIC-20260518024809887
