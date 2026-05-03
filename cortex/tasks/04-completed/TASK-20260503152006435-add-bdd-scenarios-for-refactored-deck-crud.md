# TASK-20260503152006435: Add BDD scenarios for refactored deck CRUD

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created per ADR-20260503152000411 test coverage |
| completed | 2026-05-03 | Closed via trailer |

## 背景与目标

ADR-20260503152000411 引入新 schema + 三轴命令模型 + alias collision 检测,需用 BDD 场景在 `lythoskill-test-utils` 里固化"哪些是契约不能动"——尤其是 cold pool 路径稳定 + 副作用不跨轴这两条。memory `project_test_utils_bdd_control_loop`:test-utils 是 agent+CLI 反馈环 BDD harness,LLM 原生读 BDD,不走 Cucumber。

## 需求详情
- [ ] Scenario 1: `add` 写 FQ 后,`link` 把 `.claude/skills/<basename>/` 落出 symlink → cold pool 路径
- [ ] Scenario 2: 两条同 basename 的 FQ entry,无 `as` → `link` 报 collision 错并 exit non-zero
- [ ] Scenario 3: 加 `as` 后 collision 解决,两条都正常 symlink
- [ ] Scenario 4: `refresh tdd-foo` 只对该 path 执行 `git pull`,其他路径 mtime 不变
- [ ] Scenario 5: `remove <fq>` 后,deck.toml 对应块消失 + working set symlink 删,**cold pool 路径仍在**
- [ ] Scenario 6: `prune` 不删 declared 路径,即便 working set symlink 暂时缺
- [ ] Scenario 7: 任何阶段(add / refresh / link / remove / prune)cold pool 物理路径都保持 `<cold_pool>/<host>/<owner>/<repo>/...`
- [ ] Scenario 8: 旧 string-array deck.toml + array-of-tables 混合 deck.toml 都能 link 通过(过渡兼容)
- [ ] Scenario 9: `deck update` 仍工作但 stderr 打 deprecation warning

## 技术方案
- 在 `packages/lythoskill-test-utils/` 现有 BDD scenario 框架中加文件(沿用现有 `*.feature` / `*.md` 写法,看仓库当前格式)
- 每个 scenario 用真实文件系统 fixture(临时目录)+ 调用 deck CLI binary 跑,断言文件系统状态
- cold pool 用临时目录隔离,避免污染用户真实 cold pool
- collision、deprecation 等错误流必须断言 stderr 内容

## 验收标准
- [ ] 9 个 scenario 全部 pass
- [ ] CI workflow 接进 BDD 套件
- [ ] 任何后续 PR 触动 deck 改动都跑这套
- [ ] scenario 文件 LLM 可读(自然语言 + Given/When/Then 风格)

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 新增: `packages/lythoskill-test-utils/scenarios/deck-crud-*.{feature,md}`(具体文件名按现行 test-utils 约定)
- 修改: `.github/workflows/test.yml`(若需挂入 BDD 套件)

## Git 提交信息建议
```
test(deck): BDD scenarios for refactored CRUD (TASK-20260503152006435)

- 9 scenarios covering add/link/refresh/remove/prune lifecycle
- Cold-pool path stability invariant (go-module form)
- Schema migration backward-compat
- Deprecation warning visibility
- Implements ADR-20260503152000411 test coverage
```

## 备注
- 依赖前置 task 1-5 都先有实现(scenario 调用真实 CLI)
- 看 test-utils 现行 scenario 写法,统一格式
