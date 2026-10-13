# TASK-20261013225251343: ci-gate local CI gate and push-watch SOP

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-10-13 | Created |
| in-progress | 2026-10-13 | Started |
| review | 2026-10-13 | Deliverables committed |

## Background & Goals
2026-10-13 事故:`cortex index` 落点修复(v0.20.0)后,cortex BDD fixture 仍断言
旧行为(根 INDEX.md),单元测试全绿但 **CI 连红 3 个 main push、约 6 小时无人发现**
——因为"push 后 verify CI"这步 SOP 被跳过,且本地 test gate 不覆盖 CI 的
BDD/validate/artifacts-sync 步骤。站长要求:"怎么让你能够严格执行不跳不漏"。

## Requirements
- [ ] `scripts/ci-gate.ts`:单命令 = CI test job 的本地可跑超集(unit + cortex BDD + deck BDD + validate decks + site snippets + align + artifacts sync),collect-all 输出
- [ ] AGENTS.md Submit 节:push 后 `gh run watch --exit-status` 盯到终态才可收尾;超时→一次性 backstop cron + daily open item;禁止以"CI running"结束回合
- [ ] AGENTS.md Gotchas += [CI-GATE](本地 test gate ≠ CI gate,附事故实例)
- [ ] onboarding SKILL.md boot 序列 += CI 尾检(上 push 的 CI 非 success → 先 triage)
- [ ] build 同步 skills/ 产物
- [ ] 跟进卡:把 ci-gate 接进 pre-push 钩子(.husky 改动需 qa-sweep 负测试,单独一轮)

## Technical Approach
无架构决策(脚本编排 + 文档/SOP),0/6 C-criteria,无需 ADR。
脚本照 scripts/ 现有风格(spawnSync 继承 stdio,collect-all,末尾汇总表 exit 1)。
artifacts-sync 步骤复刻 CI 原义:`build --all` 后 `git diff --quiet -- skills/`。
SOP 三层的取舍:行为层(AGENTS.md+onboarding)本卡落地;机械层(pre-push 钩)
独立成卡——guard 改动按仓规需 qa-sweep 负测试,不并进来。

## Acceptance Criteria
- [ ] `bun scripts/ci-gate.ts` 本地全绿(本次 dogfood:改完先跑它再 push)
- [ ] AGENTS.md/onboarding 改动 build 后同步到 skills/
- [ ] 本卡 commit push 后 CI watch 到终态为 success(新 SOP 的第一次实战)

## Progress Log
- 2026-10-13 事故实况:CI run 38363612556/38364452973/38364722353 三连红,根因=cortex BDD fixture 断言旧行为;fixture 修正(25906116)后 CI 绿。
