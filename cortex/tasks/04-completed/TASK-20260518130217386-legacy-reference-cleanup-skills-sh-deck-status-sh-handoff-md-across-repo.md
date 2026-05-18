# TASK-20260518130217386: Legacy reference cleanup: skills.sh, deck status sh, HANDOFF.md across repo

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| completed | 2026-05-18 | Closed via trailer |

Refs: EPIC-20260518125955940 | See ADR-20260518123403810 §Decision item 6

## 背景与目标

ADR 决策：移除已知废弃引用——`skills.sh`（Vercel marketplace 旧引用）、`deck status sh`（废弃命令）、`HANDOFF.md`（旧 handoff 路径）。这些残留散布在 curator 代码、文档、SKILL.md 和可能的其他 lythoskill 包中。

注意：`skills.sh` 在部分文件中是正常引用（如 ADR 记录历史、`normalizeSkillsSh` 函数名），需要逐条判断是"废弃引用"还是"历史记录"。核心原则：**代码和活跃文档中移除功能性引用，ADR/历史记录保留**。

## 需求详情
- [ ] 全仓 grep `skills\.sh` → 列出所有匹配 → 逐条分类：废弃引用 / 历史记录 / 代码函数名
- [ ] 全仓 grep `deck status` → 同上
- [ ] 全仓 grep `HANDOFF\.md` → 同上
- [ ] 功能性引用替换或删除：
  - curator SKILL.md/references 中 `skills.sh` → "agent WebSearch + gh CLI"
  - 代码注释中 `deck status sh` → 移除
  - 文档中 `HANDOFF.md` → `daily/YYYY-MM-DD.md`
- [ ] `feed-adapters.ts`：删除或 thin out → 保留注释说明 "Feed concept survives as schema layer, not adapter code. See ADR-20260518123403810."
- [ ] 代码函数名 `normalizeSkillsSh`（`packages/lythoskill-deck/src/add.ts`）：保留——这是 `owner/repo` 语法糖的规范化函数，不是废弃引用
- [ ] 确认 CLAUDE.md / AGENTS.md 中的 handoff 路径引用是最新的

## 技术方案

**分类规则**:
| 匹配 | 判断 | 操作 |
|------|------|------|
| `normalizeSkillsSh` 函数 | ✅ 保留 — 是 `owner/repo` 语法糖 | 不修改 |
| ADR/wiki 中 `skills.sh 已被移除` | ✅ 保留 — 历史记录 | 不修改 |
| curator SKILL.md 中 `via skills.sh` | ❌ 废弃 — 应改为 agent WebSearch | 替换 |
| curator references 中 `skills.sh marketplace` | ❌ 废弃 | 替换为 agent SOP |
| 代码注释中 `deck status sh` | ❌ 废弃 | 移除 |
| 文档中 `HANDOFF.md` 路径 | ❌ 废弃 | `daily/YYYY-MM-DD.md` |
| `deck status` 作为当前有效命令 | ✅ 保留 — deck status 仍存在 | 不修改 |
| `deck status sh` 特指 shell 版本 | ❌ 废弃 | 移除 |

**执行步骤**:
1. `grep -rn "skills\.sh" --include="*.ts" --include="*.md" packages/ skills/ cortex/ daily/` → 分类
2. `grep -rn "deck status" --include="*.ts" --include="*.md" packages/ skills/` → 分类
3. `grep -rn "HANDOFF\.md" --include="*.md" packages/ skills/ cortex/ daily/` → 分类
4. 按分类结果逐文件修改
5. `feed-adapters.ts` 特殊处理：thin out + 注释

## 验收标准
- [ ] `curator audit --legacy` 对 lythoskill 自身技能输出 0 legacy issue
- [ ] `grep -rn "skills\.sh" packages/lythoskill-curator/` 无功能性引用（ADR/历史记录除外）
- [ ] `grep -rn "deck status sh" packages/` 0 结果
- [ ] `grep -rn "HANDOFF\.md" packages/ skills/` 0 结果（或仅为 CLAUDE.md 中说明 deprecated 的引用）
- [ ] `feed-adapters.ts` 已 thin out 或删除
- [ ] `normalizeSkillsSh` 函数未被误删

## 进度记录

## 关联文件
- 修改: `packages/lythoskill-curator/src/feed-adapters.ts`
- 修改: `packages/lythoskill-curator/skill/SKILL.md`
- 修改: `packages/lythoskill-curator/skill/references/` (如有)
- 修改: 其他含有废弃引用的文件（待 grep 后确定）

## Git 提交信息建议
```
chore(curator): clean legacy references — skills.sh, deck status sh, HANDOFF.md (TASK-20260518130217386)

- Remove/replace functional references to deprecated patterns
- Thin out feed-adapters.ts with explanation comment
- Preserve ADR/historical records and normalizeSkillsSh function
```

## 备注
- 本任务在主题A-C之后执行——先完成心智改造，再清理废弃引用
- `normalizeSkillsSh` 函数名不需要重命名——它是 `owner/repo` 语法糖，功能有效
- 如果 `feed-adapters.ts` 完全删除，确保 CLI 命令注册中无引用
