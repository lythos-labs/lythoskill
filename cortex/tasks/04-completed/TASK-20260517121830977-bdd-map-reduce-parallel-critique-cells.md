# TASK-20260517121830977: BDD: map-reduce 并行 critique — 3 cell 不同 workdir 不同 deck

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-17 | Created |
| completed | 2026-05-17 | 3/3 cells PASS, parallel dispatch verified |

## 做了什么

验证 Agent tool 能否 native spawn 3 个 subagent 并行，各自在不同 workdir、不同 deck link、不同任务 scope。模拟 map-reduce 的 map 阶段。

## 怎么做

1. 创建 `/tmp/map-reduce-test/` 下 3 个独立 cell workdir
2. 每个 cell 有独立的 `skill-deck.toml` (lythoskill-deck + critique)
3. 并行 `Agent tool spawn ×3, run_in_background=true`
4. 每个 subagent 独立 `deck link` → 读 DESIGN.md → critique 不同维度

| Cell | 评审范围 | 产出 |
|------|---------|------|
| 1 | 设计哲学 | `review-design-philosophy.md` — 9/10 Exceptional |
| 2 | 色彩系统 | `review-color-system.md` — Philosophy 9, Detail 5 (gap: OKLch 未全覆盖) |
| 3 | 字体系统 | `review-typography.md` — Hierarchy 8, Functionality 6 (gap: 缺 CJK web-font 策略) |

## 得到什么结果

- **全部并行完成** — 3 cells 在 ~4 分钟内全返回
- **每个 cell 独立 deck link 成功** — 无工作集污染
- **产出质量高** — 每个 review 有具体分数 + 可操作建议
- Gaps 被正确识别: 色彩 Detail 5/10 (OKLch 不全), 字体 Functionality 6/10 (缺 CJK 加载策略)

| Metric | Cell 1 | Cell 2 | Cell 3 |
|--------|--------|--------|--------|
| Tokens | 31,206 | 31,294 | 31,028 |
| Tool calls | 9 | 5 | 5 |
| Duration | 230s | 229s | 217s |

## 核心发现

Agent tool parallel spawn + isolated deck link 完全可行。Map-reduce 的 map 阶段验证通过。每个 cell 的 deck link 严格隔离 — 不会污染其他 cell 或主工作集。这为 Task-driven Agent BDD 的 cross-deck vs 提供了实现路径。

## 验收标准
- [x] 3 个 subagent 并行 spawn 成功
- [x] 每个 cell 独立 workdir + deck link 无污染
- [x] 全部产出 review 报告（有分数 + 可操作建议）
- [x] 并行执行时间在可接受范围 (~4min)

## 关联
- Epic: EPIC-20260517121757041
- 源: `packages/lythoskill-arena/skill/SKILL.md` (Agent-Orchestrated Protocol)
- 模式: agent-orchestrated map-reduce
