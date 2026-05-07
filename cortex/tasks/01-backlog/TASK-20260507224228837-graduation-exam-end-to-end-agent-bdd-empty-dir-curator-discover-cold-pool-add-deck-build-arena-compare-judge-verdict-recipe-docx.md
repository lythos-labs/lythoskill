# TASK-20260507224228837: Graduation exam: end-to-end agent BDD — empty dir → curator discover → cold-pool add → deck build → arena compare → judge verdict (recipe .docx)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-07 | Created |

## 背景与目标

lythoskill 体系的"毕业考题"——agent 从头到尾走完完整链路，验证所有组件协同工作。

**不是**测试单个命令，而是验证 agent 能否在真实环境中自主完成"发现→入库→筛选→对比→产出"的完整决策链。

## 需求详情

### Given
- 空目录（无 skill-deck.toml、无 cold pool、无 .claude/skills/）
- Bun 环境可用
- kimi CLI 作为 agent player

### When
1. **curator discover** — 搜索远程 feed，发现文档生成相关技能（PDF、DOCX、research 等）
2. **curator add** — 将选中的技能入库到 cold pool
3. **deck build** — 筛选技能构建 task-specific deck（如 recipe .docx 场景）
4. **arena compare** — 对比不同 deck 配置的效果（如 bare vs documents vs research-documents）
5. **judge verdict** — 评估输出质量，选出"好结果"

### Then
- 产出可用的 skill-deck.toml
- arena 运行至少 2 个 deck 配置的对比
- judge 给出比较性评分
- 最终产出物（.docx 菜谱）存在且非空

## 技术方案

使用 `LYTHOS_PLAYER=kimi` + `quick-agent.sh` 模式，从空目录冷启动。
核心验证点：agent 能否在没有人类指导的情况下，自主完成 skill 发现、筛选、对比决策。

## 验收标准
- [ ] 端到端流程无人工干预完成
- [ ] 至少 2 个 deck 配置被 arena 对比
- [ ] judge 产出有效 verdict
- [ ] 最终 .docx 文件非空

## 技术方案
<!-- 填写实现方案、关键决策、参考资源 -->

## 验收标准
- [ ] 标准1
- [ ] 标准2

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260507224228837)

- Detail 1
- Detail 2
```

## 备注
