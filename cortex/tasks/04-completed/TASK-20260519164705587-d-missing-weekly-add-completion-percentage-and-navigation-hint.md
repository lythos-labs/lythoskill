# TASK-20260519164705587: D: missing-weekly 加入周完成度百分比 + 导航

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-19 | Created |
| completed | 2026-05-19 | Implemented — day X/7, XX% complete + navigation hints |
| completed | 2026-05-19 | Closed via trailer |

## 背景与目标

原 W21 周二就 warn "缺失周报"，不懂"周二写没意义"。加入时间感知让 agent 自己判断。

## 需求详情
- [x] 计算 day-of-week (1=Mon) 和 completion %
- [x] 输出格式: `W21: not yet written (day 2/7, 29% complete)`
- [x] 导航: reference weekly + tip about convention + source material + skill name
- [x] 不做判断（"该写"/"不该写"），只报告事实

## 技术方案
`date +%u` 获取 ISO day-of-week，计算 dow/7 百分比。

## 验收标准
- [x] 37 tests pass (新增 2 个 assertion: % check + Tip presence)
- [x] `--force` 输出显示 "day 2/7, 29% complete"
- [x] 无 "你应该" / "step 1/2/3" 等命令式语言
