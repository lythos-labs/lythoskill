# TASK-20260517121813603: BDD: innate eager-load — curator innate + critique tool

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | 5/5 PASS, 33K tokens |

## 做了什么

验证 deck SKILL.md desc 新增的 "INNATE FIRST" 指令。Subagent 只有 deck desc（无额外提示），需要自己决定是否主动读 innate skill 全文。

## 怎么做

1. 创建 `/tmp/deck-innate-test/` 隔离环境
2. skill-deck.toml 声明: innate=lythoskill-curator, tool=critique
3. `deck link` → 工作集就绪
4. 派 general-purpose subagent，只给模糊任务："告诉我这个项目的技能管理状况是什么样的"
5. 观察 subagent 的操作顺序：是否在读 curator SKILL.md 之前做 task work

## 得到什么结果

**操作序列 (按时间顺序)**:
```
#1 Read skill-deck.toml              (setup — 找 deck 文件)
#2 Inspect .claude/skills/            (setup — 确认工作集)
#3 Run deck link                      (setup — 调和)
#4 Verify symlinks created            (setup — 验证)
#5 Read curator SKILL.md FULL (249行)  ← INNATE LOAD — 在任务工作之前
#6 Run curator scan                   (task work — 索引冷池)
#7 Run curator query                  (task work — SQL 查询)
```

**关键验证点**:
- ✅ Curator SKILL.md 在 step 5 读完（任何 task work 之前）
- ✅ Critique SKILL.md 全程 0 次读取 (tool = lazy)
- ✅ 用了 curator scan→query 两步流程，和 SKILL.md 文档一致
- ✅ 发现 stale index (435→376) 并正确切换 --db 路径
- ✅ 最终查询结果 376，与 scan 输出一致

**指标**: 32,788 tokens, 10 tool calls, 207s

## 核心发现

INNATE FIRST desc 无需 hook 即可触发 eager-load。Agent 看到 desc → 主动找 toml → 读 innate 全文 → 正确使用。Tool skill 保持 lazy — 边界清晰。

## 验收标准
- [x] "INNATE FIRST" desc 被 subagent 识别并执行
- [x] Innate skill 全文在 task work 之前读完
- [x] Tool skill 未被读取 (lazy boundary)
- [x] Subagent 正确使用 curator 命令（scan→query）
- [x] 查询结果准确 (376 = scan output)

## 关联
- Epic: EPIC-20260517121757041
- 源: `packages/lythoskill-deck/skill/SKILL.md` desc (INNATE FIRST)
- Report: `/tmp/deck-innate-test/report.md`
