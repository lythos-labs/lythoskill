# TASK-20260518130212342: Audit rule realignment: drop empty-niche violation, add legacy pattern check

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| completed | 2026-05-18 | Closed via trailer |

Refs: EPIC-20260518125955940 | See ADR-20260518123403810 §Decision item 3

## 背景与目标

ADR 决策：空 niche 不再是违规。Audit 只检查结构性错误（路径不存在、`name` 缺失、SKILL.md 不可解析）。同时新增 legacy pattern check——grep SKILL.md body 中的已知废弃模式，让 audit 从噪音变信号。

当前 `cli.ts` `runAudit()` 第 582-587 行有 `emptyNiches` 检查，标记所有 niche 为 `[]`/NULL/空字符串的技能为违规。主流技能 100% 触发——纯噪音。

## 需求详情
- [ ] 移除 `runAudit()` 中 `emptyNiches` 检查（第 582-587 行）
- [ ] 移除 audit 输出中与空 niche 相关的错误信息
- [ ] 新增 `LEGACY_PATTERNS` 常量：已知废弃模式列表
  - `skills.sh` — 旧 Vercel marketplace 引用
  - `deck status sh` — 废弃 shell 命令
  - `HANDOFF.md` — 旧 handoff 路径（现为 daily/YYYY-MM-DD.md）
  - `deck update` — 已重命名为 `refresh`
  - `sm_niche` — 已重命名为 `deck_niche`（但 deck_niche 本身也在本 epic 被移除）
- [ ] 新增 `checkLegacyPatterns()` 函数：读取 SKILL.md body → 对每个 pattern 做 grep → 返回命中的 pattern 列表
- [ ] `runAudit()` 调用 `checkLegacyPatterns()` → 输出 `legacy_issues: [{skill, pattern}]`
- [ ] 保留现有结构性检查：路径存在、`name` 非空、SKILL.md 可解析
- [ ] 可选（scope creep guard）：`--legacy` flag 控制是否跑 legacy check，默认 true

## 技术方案

**修改文件**:
- `packages/lythoskill-curator/src/cli.ts`: `runAudit()` 函数

**实现要点**:
```typescript
const LEGACY_PATTERNS = [
  { pattern: /skills\.sh/i, message: 'references deprecated skills.sh marketplace; use agent WebSearch + curator add' },
  { pattern: /deck\s+status\s+sh/i, message: 'references removed deck status sh command' },
  { pattern: /HANDOFF\.md/i, message: 'references deprecated HANDOFF.md; use daily/YYYY-MM-DD.md' },
  { pattern: /deck\s+update/i, message: 'references deprecated deck update; use deck refresh' },
];

function checkLegacyPatterns(skillBody: string, skillName: string): LegacyIssue[] {
  return LEGACY_PATTERNS
    .filter(lp => lp.pattern.test(skillBody))
    .map(lp => ({ skill: skillName, pattern: lp.message }));
}
```

**Audit 输出格式**:
```
✅ Structural: 45 pass, 0 fail
⚠️  Legacy: 3 issues found
  - skill/xxx: references deprecated skills.sh marketplace
```

## 验收标准
- [ ] 冷池 scan 后 `curator audit` 输出 0 空 niche 违规
- [ ] `curator audit` 仍检测：路径不存在、name 缺失、SKILL.md 不可解析
- [ ] `curator audit` 检测到 legacy pattern 时正确报告 skill name + pattern
- [ ] 无可检测 legacy pattern 时 audit 报告 0 legacy issues
- [ ] Dormancy test：干净技能（无 legacy pattern）audit 输出不包含 "legacy" 关键词

## 进度记录

## 关联文件
- 修改: `packages/lythoskill-curator/src/cli.ts`
- 修改: `packages/lythoskill-curator/src/cli.test.ts` (更新 audit 测试)

## Git 提交信息建议
```
fix(curator): realign audit rules — drop empty-niche, add legacy pattern detection (TASK-20260518130212342)

- Remove emptyNiches violation check (mainstream skills never have niche)
- Add LEGACY_PATTERNS constant and checkLegacyPatterns()
- Audit now reports structural issues + legacy pattern hits
- Structural checks preserved: path, name, parseable
```

## 备注
- 与主题A（niche 来源改造）有依赖：先完成 niche → tag 迁移，再移除空 niche audit
- Dormancy test 模式参考 memory/feedback_dormancy_property_test_for_fallbacks.md
