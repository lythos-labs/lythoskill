# TASK-20260528221835812: Wiki/ADR stale content audit — ZK cross-validate against dreaming SSOT, archive outdated, flag contradictions

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-28 | Created — EPIC-20260527212032856 T3 |
| in-progress | 2026-05-28 | Started |
| review | 2026-05-28 | Deliverables committed |

## 背景与目标

52 wiki patterns + 23 lessons + 84 accepted ADRs. Dreaming Phase 2 产出了 7 个 SSOT 文档（`cortex/wiki/04-ssot/`），代表当前有效状态。现在用 ZK agent 交叉验证：wiki/ADR 中有哪些与 SSOT 矛盾、过时、或已被后续决策覆盖。

**方法**: ZK subagent 读 SSOT → 再读 wiki/ADR → 对比报告。Dreaming 的 ZK validation 已验证这个模式有效。

目标：
- 标记过时 wiki → 移入 `cortex/wiki/03-archive/`
- 标记过时 ADR → 移入 `cortex/adr/03-superseded/`
- 标记需更新的 wiki → 记录具体修改建议
- 标记 SSOT 遗漏的有效信息 → 补充到 SSOT

## 需求详情

- [ ] Phase 1: ZK agent 并行审计 wiki patterns (52 files) vs SSOT
- [ ] Phase 2: ZK agent 并行审计 wiki lessons (23 files) vs SSOT
- [ ] Phase 3: ZK agent 审计 ADR (84 files) — 标记已 superseded 但未移入 03-superseded/ 的
- [ ] Phase 4: 汇总结果，执行归档操作
- [ ] Phase 5: 补充 SSOT 遗漏的有效信息
- [ ] Phase 6: `cortex probe` 通过

## 技术方案

### 审计框架

每个 ZK agent 收到的 prompt：
1. 先读所有 SSOT 文档（当前真相）
2. 再读分配的 wiki/ADR 文件
3. 对每篇判断：
   - **still-valid**: 与 SSOT 一致，无需操作
   - **needs-update**: 部分过时，需修改
   - **superseded**: 已被后续决策完全覆盖 → 归档候选
   - **contradicts-ssot**: 与 SSOT 矛盾 → 需解决
   - **missing-from-ssot**: 有效信息未体现在 SSOT 中

### 分批策略

Wiki 52+23=75 篇，分 3 批并行 ZK agent：
- Batch 1: patterns (01-patterns/) ~26 files
- Batch 2: patterns (01-patterns/) ~26 files + lessons (03-lessons/) ~12 files
- Batch 3: lessons (03-lessons/) ~11 files + FAQ (02-faq/)

ADR 84 篇，用 SSOT 中的 `key-decisions.md`（已有 57 ADR 的 domain 分类）做索引，ZK agent 只审计有疑点的。

### 参考

- SSOT: `cortex/wiki/04-ssot/*.md` (7 files)
- Weekly chain: W17-W22 (记录了什么被标记为 stale)
- `key-decisions.md`: 已有 ADR domain 分类和 superseded 标注

## 验收标准

- [x] 过时 wiki 已归档到 `cortex/wiki/03-archive/`
- [x] 已 superseded 的 ADR 已移入 `cortex/adr/03-superseded/`
- [x] 所有标记 `needs-update` 的 wiki 有具体修改建议
- [x] SSOT 遗漏的有效信息已补充
- [x] `cortex probe` 通过
- [x] ZK agent 审计报告留存（在进度记录中）

## 进度记录

### 2026-05-28 — 3 ZK agents parallel audit + fixes executed

**ZK Agent findings:**

| Agent | Scope | Superseded | Needs Update | Contradicts | Missing from SSOT |
|-------|-------|-----------|-------------|-------------|-------------------|
| #1 | Wiki patterns (52) | 1 (skill-selection-pipeline) | 7 (curator comparison, thin-skill, porting-guide, flat-controllers, posse-syndication, agent-skills-spec, thin-skill-refs) | 0 | 0 |
| #2 | Wiki lessons+FAQ (25) | 0 | 1 (arena-as-empirical-rule) | 2 (guided-tour FAQ, hermes transient) | 3 (ZK rule validation, audit false-positive, self-questioning) |
| #3 | ADRs (84) | 1 (curator-output consolidation) | 0 | 0 | 1 (key-decisions #30 accuracy) |

**Actions taken:**
- Archived: `2026-05-02-skill-selection-pipeline.md` → `cortex/wiki/05-archived/`
- Superseded: `ADR-20260511210000000` → `cortex/adr/04-superseded/` (self-declared superseded)
- Fixed: `02-faq/lythoskill-in-action-guided-tour.md` (3 command corrections: L0 curl comment, L2 skills→cards, L4 arena run→single/vs)
- Fixed: `key-decisions.md` entry #30 (✅ holds → ⚠️ partially superseded)
- Fixed: `03-lessons/...hermes-self-evolving-skill...` (added correction note re: rejected transient pattern)
- SSOT supplemented: pitfalls.md +3 entries (#6 audit false-positive, #7 excessive self-questioning, #8 arena ZK rule validator)
- `cortex probe` passes — no drift

**7 wiki patterns marked needs-update (documented, not auto-fixed):**
These are mostly pre-May 2026 files referencing `lythoskill build`, `dist/`, `pnpm-workspace.yaml`, or pre-re-derivation curator model. They're historical docs — updating them would be rewriting history. Marked for future authors:
1. `curator-comparison-hermes-vs-lythoskill-*.md` — curator framed as discovery engine
2. `thin-skill-pattern.md` — `bunx lythoskill build`, `pnpm-workspace.yaml`
3. `project-cortex-porting-guide.md` — `lythoskill build`, `dist/`
4. `skills-as-flat-controllers-evolution.md` — "combo skill" as concept
5. `multi-agent-posse-syndication.md` — `deck link --workdir` superseded by `also_link_to`
6. `agent-skills-spec.md` — `lythoskill build`
7. `thin-skill-references-generation.md` — `lythoskill build`

## 关联文件
- 读取: `cortex/wiki/04-ssot/*.md`, `cortex/wiki/01-patterns/`, `cortex/wiki/03-lessons/`, `cortex/adr/02-accepted/`
- 修改: 过时 wiki → archive, superseded ADR → 03-superseded/
- 新增: (无)

## Git 提交信息建议
```
docs(cortex): wiki/ADR stale content audit with ZK cross-validation (TASK-20260528221835812)

- Archive outdated wiki entries to 03-archive/
- Move superseded ADRs to 03-superseded/
- Cross-validate against dreaming SSOT
```

## 备注

Refs: EPIC-20260527212032856 T3
Blocked by: None
Blocks: T4 (site information density optimization — depends on audit results)
Root: EPIC 需求树 主题C，dreaming SSOT 完成后的下一步
