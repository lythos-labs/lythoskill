# TASK-20260518130214814: Rewrite curator SKILL.md: discovery SOP via agent+search, not curator as engine

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| completed | 2026-05-18 | Closed via trailer |

Refs: EPIC-20260518125955940 | See ADR-20260518123403810 §Decision items 4-5

## 背景与目标

ADR 决策：curator CLI 不承担推荐，推荐是 agent 的事。curator query = agent 的本地数据源。Curator SKILL.md 当前描述暗示它是 discovery 主入口——需要重写为 agent SOP：agent 如何组合 curator query + WebSearch + gh + 自身推理做完整的 discover → rank → recommend。

两个 SKILL.md 副本都需要更新：`packages/lythoskill-curator/skill/SKILL.md`（源模板）和构建产物。

## 需求详情
- [ ] 重写 `discover` / "discovery" 相关 section：
  - 旧：curator 是 discovery engine，按 niche/type 查询
  - 新：agent SOP — "先用 `curator query` 查本地有没有 → 再用 WebSearch/gh 找新的 → `curator add` 收录 → `curator tag` 标注"
- [ ] 添加 `curator tag` 的使用说明
- [ ] 添加 discovery SOP mermaid/flowchart：
  ```
  agent needs skill for X
    → curator query (local cache: "have X in cold pool?")
    → if found + QA data good → recommend with confidence
    → if not found or low confidence → WebSearch/gh explore
    → curator add <new-locator>
    → curator tag --niche "xxx" --qa "{...}"
  ```
- [ ] 移除 "discovery engine" 相关措辞
- [ ] 添加 fact-check + confidence evaluation SOP：
  - agent 如何交叉验证多个来源
  - 如何按来源过滤发现 bias
  - 如何输出结构化置信度评估
- [ ] 更新 trigger 描述（ALSO trigger when 部分）：添加 "curator query"、"curator tag"、"curator audit --legacy" 触发条件
- [ ] 更新 audit section：空 niche 不违规，legacy pattern check 说明
- [ ] 确认 `packages/lythoskill-curator/skill/references/` 中的文档同步更新

## 技术方案

**修改文件**:
- `packages/lythoskill-curator/skill/SKILL.md` — 源模板（修改后 build 会渲染到构建产物）

**关键改写区域**:
1. **Description**（frontmatter 后第一段）：curator = 策展者/买家秀 = 查卡器 + 备注 + 组卡审美
2. **Discovery SOP**（新 section）：agent 驱动的发现流程，curator query 是本地数据源
3. **Fact-check SOP**（新 section）：交叉验证、置信度评估、来源过滤
4. **Tag 命令**（新 section）：agent 如何标注技能
5. **Audit**（更新 section）：结构性检查 + legacy detection
6. **Trigger**（更新 ALSO trigger）：curator query/tag/audit 触发条件

**参考**:
- ADR-20260518123403810 §决策 — 完整的心智模型和动线图
- Arena SKILL.md — CLI = agent SOP 固化层的参考实现

## 验收标准
- [ ] SKILL.md 中无 "discovery engine" 措辞
- [ ] SKILL.md 包含完整的 discovery SOP（agent + curator query + WebSearch）
- [ ] SKILL.md 包含 fact-check + confidence evaluation SOP
- [ ] `curator tag` 命令有使用说明
- [ ] `curator audit` section 反映新规则
- [ ] Arena 验证：zero-knowledge subagent 读新 SKILL.md → 正确使用 curator + WebSearch 组合做 discovery

## 进度记录

## 关联文件
- 修改: `packages/lythoskill-curator/skill/SKILL.md`
- 修改: `packages/lythoskill-curator/skill/references/` (如有相关)
- 修改: `skills/lythoskill-curator/SKILL.md` (构建产物，由 build 自动更新)

## Git 提交信息建议
```
docs(curator): rewrite SKILL.md — agent-driven discovery SOP, not curator as engine (TASK-20260518130214814)

- Replace "discovery engine" framing with agent SOP
- Add discovery flowchart: curator query → WebSearch → add → tag
- Add fact-check and confidence evaluation SOP
- Add curator tag command documentation
- Update audit section: structural + legacy, no empty-niche
```

## 备注
- 依赖主题A（tag 命令）和主题B（audit 规则）先落地——SKILL.md 描述的是已实现的功能
- Arena 验证是最强验收标准——需要写 reproduce.sh（主题E）
