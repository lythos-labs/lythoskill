# TASK-20260519205953163: deck remove does not clean up also_link_to targets

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-19 | Created |
| in-progress | 2026-05-19 | Started |
| completed | 2026-05-19 | Closed via trailer |

## 背景与目标

`deck remove` 只从主 `working_set` 删符号链接，不清理 `also_link_to` 目标。这违反了 deny-by-default 原则 — remove 应该是跨所有目标的扇出操作。

**发现方式**: Agent BDD `also-link-to-bdd` 场景，零知识子代理在 remove 后验证 `.agents/skills` 和 `.kimi/skills` 时发现 skill-a 符号链接仍存在。

**根因**: `remove.ts` L91-98 只对 `WORKING_SET`（主目标）操作。未读取 `also_link_to`，未遍历其他目标。

对比 `link.ts` L428-438 的正确行为：先收束主 target，再循环所有 `also_link_to` target。

## 需求详情

- [ ] `deck remove` 删除主 working_set 的符号链接（已有行为）
- [ ] `deck remove` 删除所有 `also_link_to` 目标的符号链接（新增）
- [ ] 每个目标的删除成功/失败单独报告
- [ ] 向后兼容：无 `also_link_to` 时行为不变

## 技术方案

`remove.ts` 需要：
1. 从 deck.toml 读取 `also_link_to`（参考 `link.ts` L183-186 的解析方式）
2. 对 `also_link_to` 中的每个 target，执行与 L91-98 相同的 `rmSync` 删除
3. 输出与 `link.ts` 一致：`also_link_to: <path>` 标签 + 删除结果

改动量：~15 行，只改 `remove.ts`。

## 验收标准

- [ ] `deck remove` 后，主 working_set 和所有 also_link_to 目标中的 skill 符号链接均被删除
- [ ] 无 `also_link_to` 时行为不变（向后兼容）
- [ ] Agent BDD `also-link-to-bdd/reproduce.sh` 零知识运行，PHASE 2 全部 PASS
- [ ] `bun test packages/lythoskill-deck/src/remove.test.ts` 通过
- [ ] `bun test packages/lythoskill-deck/src/link.test.ts` 通过（无回归）

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-deck/src/remove.ts`
- 新增:

## Git 提交信息建议
```
fix(deck): remove cleans up also_link_to targets (TASK-20260519205953163)

- Read also_link_to from skill-deck.toml in remove.ts
- Delete symlinks from all targets, not just primary working_set
```

## 备注
