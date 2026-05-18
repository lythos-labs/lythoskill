# TASK-20260518130219922: Curator reproduce.sh: scan → tag → query → audit full IoC verification

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| completed | 2026-05-18 | Closed via trailer |

Refs: EPIC-20260518125955940 | See ADR-20260518123403810 §Decision item 6, ADR-20260518024500631

## 背景与目标

EPIC-20260518024809887 确立了 reproduce.sh IoC 模式——zero-knowledge subagent 独立运行脚本验证功能。Curator 需要通过 reproduce.sh 覆盖 scan → tag → query → audit 完整流程，确保新心智下的 curator 端到端可用。

## 需求详情
- [ ] 创建 `showcase/curator-mvp/reproduce.sh`
- [ ] 脚本内容（IoC 模式——zero-knowledge subagent 可独立执行）：
  1. **Setup**：创建临时冷池目录，放入至少 2 个样本 SKILL.md（一个带 niche、一个不带）
  2. **Scan**：`curator scan <tmp-cold-pool>` → 验证 SQLite/REGISTRY.json 生成
  3. **Query**：`curator query --name <skill>` → 验证返回结果
  4. **Tag**：`curator tag <skill> --niche "test.niche"` → 验证写入
  5. **Re-scan**：再次 scan → 验证 niche 未被覆盖
  6. **Audit**：`curator audit` → 验证 0 空 niche 违规
  7. **Legacy audit**：`curator audit --legacy` → 验证 legacy pattern 检测（样本中含废弃引用）
  8. **Cleanup**：清理临时目录
- [ ] 脚本开头注释包含：用途、前置条件、预期输出、清理说明
- [ ] 所有步骤有明确的 PASS/FAIL 输出
- [ ] 对齐 EPIC-20260518024809887 的 reproduce.sh 格式约定

## 技术方案

**文件**:
- 新增: `showcase/curator-mvp/reproduce.sh`

**样本 SKILL.md 设计**:
```
# Sample 1: clean skill (no niche, no legacy)
---
name: test-skill-clean
description: A clean test skill with no custom fields
---

# Sample 2: skill with legacy reference (to test legacy audit)
---
name: test-skill-legacy
description: This skill references skills.sh marketplace
---
...body mentioning skills.sh...
```

**reproduce.sh 结构**:
```bash
#!/usr/bin/env bash
set -euo pipefail

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# 1. Setup sample cold pool
# 2. Scan
# 3. Query
# 4. Tag
# 5. Re-scan (verify merge)
# 6. Audit (structural)
# 7. Legacy audit
# 8. Report

echo "✅ reproduce.sh PASSED"
```

## 验收标准
- [ ] `bash reproduce.sh` 全部 PASS（exit code 0）
- [ ] Zero-knowledge subagent 能独立运行并理解输出
- [ ] 覆盖 scan → tag → query → audit → legacy audit 完整链路
- [ ] Re-scan 后 niche 未被覆盖（merge 策略验证）
- [ ] Audit 输出 0 空 niche 违规
- [ ] Legacy audit 正确检测到样本中的废弃引用
- [ ] 脚本执行后无残留文件（trap cleanup 正常工作）

## 进度记录

## 关联文件
- 新增: `showcase/curator-mvp/reproduce.sh`
- 参考: `showcase/` 中已有的 reproduce.sh 示例

## Git 提交信息建议
```
test(curator): add reproduce.sh for scan → tag → query → audit IoC verification (TASK-20260518130219922)

- Cover full curator MVP workflow: scan, query, tag, re-scan, audit, legacy audit
- Zero-knowledge subagent compatible (IoC pattern)
- Aligned with EPIC-20260518024809887 reproduce.sh convention
```

## 备注
- 这是本 epic 的最后一个任务——依赖主题A-D全部完成
- reproduce.sh 也是 arena 验证的测试脚本——同一个脚本既验证功能，又作为 arena agent BDD 的输入
- showcase/ 目录约定参考 project_showcase_dir_for_committed_demo_artifacts.md
