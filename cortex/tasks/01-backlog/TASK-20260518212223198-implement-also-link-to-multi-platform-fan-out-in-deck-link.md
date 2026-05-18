# TASK-20260518212223198: implement also_link_to multi-platform fan-out in deck link

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |

## 背景与目标

ADR-20260517152850372 已 accepted — `also_link_to` 字段在 `skill-deck.toml` 中预留但 `link.ts` 中零实现。当前 `deck link` 只 reconcile 一个 `working_set`。用户同时使用多平台时需要手动多次 link。

发现于 2026-05-18 README sober fact-check — "fans out to 6 platforms" 被标记为过言（MISLEADING），因为代码实际不支持。

## 需求详情
- [ ] `link.ts` 读取 `also_link_to` 数组，对每个路径执行 reconcile
- [ ] `also_link_to` 为空时行为不变（向后兼容）
- [ ] 每个 fan-out 目标独立清理（只删该目录下的 symlink）
- [ ] 测试覆盖：单 working_set、多个 also_link_to、目标目录不存在

## 技术方案

参考 `link.ts` 现有 reconcile 逻辑。对 `also_link_to` 数组中的每个路径调用相同的 reconcile。详见 ADR-20260517152850372。

## 验收标准
- [ ] `deck link` 同时向 `.claude/skills/` + `.kimi/skills/` + `.cursor/skills/` 写入 symlink
- [ ] 现有单 working_set 测试继续通过
- [ ] `deck link --dry-run` 展示所有目标路径
- [ ] README 中 "fans out to 6 platforms" 可以改回真话

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260518212223198)

- Detail 1
- Detail 2
```

## 备注
