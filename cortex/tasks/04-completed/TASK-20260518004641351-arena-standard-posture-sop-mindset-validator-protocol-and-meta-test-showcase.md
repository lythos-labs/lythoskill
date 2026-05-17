# TASK-20260518004641351: Arena Standard Posture SOP — mindset validator protocol and meta-test showcase

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | Closed via trailer |

## 背景与目标
Arena SKILL.md 缺少 agent-orchestrated 模式的标准 SOP。Agent 读到 skill 后知道"可以 spawn subagent"，但不清楚**为什么这么做**以及**怎么判断做得对不对**。需要把" mindset alignment > output correctness"的心智模型固化为文档，并用 meta-test 验证它确实能让 agent 产生正确行为。

## 需求详情
- [x] 在 Arena SKILL.md 中添加 Standard Posture: Arena as Mindset Validator 章节
- [x] 定义 4 步标准姿势：Prepare → Dispatch → Observe → Judge
- [x] 明确 mindset alignment > output correctness 的判据
- [x] 用 arena 编排模式验证 subagent 能否理解并应用 Standard Posture
- [x] 将 meta-test 结果放入 showcase/

## 技术方案
1. SKILL.md 新增章节：Purpose / Minimal deck principle / 4 steps / Why it matters
2. Meta-test：最小 deck（lythoskill-deck + lythoskill-arena）→ prepare-workdir → spawn subagent → 读 SKILL.md → 解释 → 应用 → decision-log
3. Judge：subagent 是否自发推导出 mindset-alignment 判据（非 prompt 给出）

## 验收标准
- [x] Standard Posture 章节写入 Arena SKILL.md 并通过 build
- [x] Subagent 读完后能用自己语言解释 purpose、minimal deck、4 steps、guessing=FAIL
- [x] Subagent 能应用 Standard Posture 设计具体测试（project-cortex MUST FILL 示例）
- [x] Subagent 自发推导出 Judge 判据（非 prompt 给出）
- [x] Showcase 目录包含 README.md + decision-log.jsonl + reproduce.sh

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: packages/lythoskill-arena/skill/SKILL.md
- 新增: showcase/2026-05-17-arena-standard-posture-meta-test/

## Git 提交信息建议
```
feat(scope): description (TASK-20260518004641351)

- Detail 1
- Detail 2
```

## 备注
