# TASK-20260518030349994: Phase 5 — deprecate parseAgentMd ## Judge regex

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |

## 背景与目标
reproduce.sh 成为标准后，移除 `parseAgentMd` 的 `## Judge` 正则提取。Judge criteria 来自 judge.md 或 arena.toml judge 字段——与 arena 已应用的修复一致（ADR-20260514050300）。

保留 Given/When/Then 解析——遗留 .agent.md 仍需要。

Refs: ADR-20260518024500631, ADR-20260514050300

## 需求详情
- [ ] `## Judge` 提取标注 `@deprecated`（JSDoc + 首次使用时 console.warn）
- [ ] 从现有 .agent.md 移除 `## Judge` section（替换为外部 judge.md）
- [ ] 验证 BDD runner 在外部 criteria 注入下仍正常
- [ ] 保留 Given/When/Then 解析（遗留场景需要）
- [ ] **不删除**——标记 deprecated，保留一个版本周期

## 技术方案
当前 parseAgentMd 做: `content.match(/## Judge\n([\s\S]*?)(?=\n## |$)/)`。标注 deprecated，加 warning。不删 Given/When/Then。

## 验收标准
- [ ] `## Judge` 正则提取标注 @deprecated
- [ ] 运行时 warning 在遇到 `## Judge` 时触发
- [ ] 所有现有 BDD 测试仍 pass（criteria 来自外部）
- [ ] 无新 scenario 使用 `## Judge`

## 关联文件
- 修改: `packages/lythoskill-test-utils/src/agent-bdd.ts`
- 参考: ADR-20260514050300
- Epic: EPIC-20260518024809887
