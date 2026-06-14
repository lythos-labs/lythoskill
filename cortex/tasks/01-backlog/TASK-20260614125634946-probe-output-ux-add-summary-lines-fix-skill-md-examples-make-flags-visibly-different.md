# TASK-20260614125634946: probe output UX: add summary lines, fix SKILL.md examples, make flags visibly different

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-06-14 | Created from ZK agent试用反馈 (agent-15) |

## Background & Goals

ZK agent试用probe后（agent-15）给出**5/10** overall rating，低于之前的9/10。原因是：试用后发现输出层面有多个UX问题，读文档时无法发现。

试用发现的真实问题（非理论推断）：

1. **SKILL.md "Output when consistent" 示例错误**：文档说输出 `✅ All documents consistent.`，但代码从不输出这行。文档与代码不匹配。
2. **`--active-only` 输出太空**：没问题时只打印 header + lane counts，没有"✅ No actionable items"确认。用户会怀疑是否运行成功。
3. **`--include-completed-empty-shells` 视觉上与默认模式无区别**：用户无法判断 flag 是否生效。
4. **默认模式无 issue count summary**：扫描250+文件但不告诉用户"扫描了多少，发现多少问题"。
5. **Coverage drift 输出不可见**：文档说检查了，但输出中没有任何相关提示。

## Requirements

- [ ] Fix SKILL.md "Output when consistent" example to match actual output（或修改代码输出summary）
- [ ] Add summary line to default mode: "✅ N documents checked, X inconsistencies, Y stale, Z empty shells"
- [ ] Add confirmation lines to `--active-only` when no issues: "✅ No stale items / ✅ No empty shells in active states"
- [ ] Make `--include-completed-empty-shells` visibly different: print "✅ No empty shells in completed/terminated/archived (checked N documents)"
- [ ] Document coverage drift behavior in SKILL.md（何时显示、何时静默）
- [ ] Run ZK agent试用验证：目标评分 7/10（当前5/10）

## Technical Approach

### 问题1: SKILL.md 示例错误

**当前文档**（SKILL.md lines 303-307）:
```
Output when consistent:
✅ All documents consistent.
```

**实际输出**（默认模式）:
```
📄 Tasks:
  ✅ file1
  ✅ file2
  ... (250+ lines)

🛤️  Epic lanes (active):
     main:      0
     emergency: 0
──────────────────────────────────────────────────
```

**修复选项**:
- **Option A** (推荐): 修改代码，在末尾添加 `✅ All documents consistent.`（当无问题时）。这更符合用户期望的 closure。
- **Option B**: 修改文档，示例匹配实际输出。

**决策**: 采用 **Option A**。理由：用户期望看到"all clear"确认，当前输出缺少 closure。修改代码比修改文档更能改善 UX。

### 问题2: `--active-only` 输出太空

**当前输出**（无问题时）:
```
🔎 Probing active items only (empty shells, staleness, drift, lane violations)...

🛤️  Epic lanes (active):
     main:      0
     emergency: 0
──────────────────────────────────────────────────
```

**期望输出**:
```
🔎 Probing active items only (empty shells, staleness, drift, lane violations)...

🛤️  Epic lanes (active):
     main:      0
     emergency: 0

✅ No stale backlog items
✅ No empty shells in active states
✅ No coverage drift detected
──────────────────────────────────────────────────
✅ No actionable issues found.
```

### 问题3: `--include-completed-empty-shells` 无可见差异

**当前行为**: 与默认模式输出完全相同（如果没有completed empty shells）。

**期望行为**: 即使没有completed empty shells，也打印确认：
```
📭 Empty shells (template not filled):
     ✅ No empty shells in completed/terminated/archived (checked 220 documents)
```

### 问题4: 默认模式 summary

**期望**: 在 `printProbeSummary` 末尾添加：
```typescript
io.log(`\n📊 Summary: ${totalChecked} documents checked, ${totalIssues} issues found.`);
```

### 问题5: Coverage drift 文档

**当前**: 文档说检查了，但输出中不可见。
**原因**: coverage drift 只在 `packages/*/test/scenarios/coverage-snapshot-*.md` 存在且 git log 有commits时才显示。
**修复**: 在 SKILL.md 添加说明："Coverage drift only appears when coverage snapshots exist and source files have changed since snapshot."

### Key File Paths

| 职责 | 路径 |
|------|------|
| 输出逻辑 | `packages/lythoskill-project-cortex/src/commands/probe.ts` — `printProbeSummary()` |
| 文档 | `packages/lythoskill-project-cortex/skill/SKILL.md` — "Output when consistent" 示例 |
| 测试 | `packages/lythoskill-project-cortex/src/commands/probe-execute.test.ts` — 更新预期输出 |

### Scope Boundaries

- **必达**: 添加 summary lines、修复 SKILL.md 示例、让 flags 有可见差异
- **可选**: 调整 emoji 或措辞
- **不做**: 添加新 flag（如 `--quiet`）
- **不做**: 改变 probe 核心逻辑
- **不做**: 改变 empty-shell 检测标准

## Acceptance Criteria

- [ ] ZK agent试用后评分 ≥ 7/10（当前5/10）。验证方法：spawn ZK subagent，给它 SKILL.md + AGENTS.md，让它运行 `cortex probe`、`cortex probe --active-only`、`cortex probe --include-completed-empty-shells`，然后回答5个问题（同agent-15的prompt）。评分≥7/10即通过。
- [ ] 默认模式输出包含 "✅ N documents checked, X issues found" summary
- [ ] `--active-only` 无问题时输出 "✅ No actionable issues" 确认
- [ ] `--include-completed-empty-shells` 与默认模式有可见差异
- [ ] SKILL.md "Output when consistent" 示例与实际输出匹配
- [ ] 所有测试 pass

## Progress Log
<!-- Update during execution, with timestamps -->

## Related Files
- Modified: `packages/lythoskill-project-cortex/src/commands/probe.ts`, `packages/lythoskill-project-cortex/skill/SKILL.md`
- Modified: `packages/lythoskill-project-cortex/src/commands/probe-execute.test.ts`

## Git Commit Message
```
fix(cortex): probe output UX — add summary lines, fix SKILL.md examples (TASK-20260614125634946)

- Add summary line to default mode: documents checked + issues count
- Add confirmation lines to --active-only when no issues found
- Make --include-completed-empty-shells visibly different from default
- Fix SKILL.md "Output when consistent" example to match actual output
- Document coverage drift behavior (only appears when snapshots exist)
```

## Notes
- ZK agent试用反馈（agent-15）是核心输入。理论分析无法发现这些输出层问题。
- 目标不是完美（10/10），是从5/10提升到7/10（可接受的UX）。
- Executor 应先运行 probe 观察当前输出，再修改。
