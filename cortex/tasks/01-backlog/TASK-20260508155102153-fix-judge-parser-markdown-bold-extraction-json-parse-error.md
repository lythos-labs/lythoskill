# TASK-20260508155102153: Fix judge parser markdown bold extraction (** → JSON parse error)

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-08 | Created |

## 背景与目标

Arena 的 judge 在解析 agent 输出中的 verdict 时，agent 有时会使用 markdown bold 格式包裹结论（如 `**Verdict: PASS**`）。当前 parser 直接将包含 `**` 的文本传给 JSON.parse，导致 parse error，verdict 提取失败。

目标：修复 judge markdown parser，使其能正确预处理 markdown bold 标记，稳定提取 verdict。

## 需求详情

- [ ] 识别并剥离 verdict 行中的 markdown bold 标记（`**`）
- [ ] 支持 `**Verdict: PASS**`、`**PASS**`、`Verdict: **PASS**` 等变体
- [ ] 不破坏现有非 bold 格式的 verdict 解析
- [ ] 支持 markdown italic（`*`）作为次要场景

## 技术方案

- 在 judge 的 verdict 提取逻辑中增加预处理步骤：用正则 `/\*\*(.*?)\*\*/g` 提取 bold 内容
- 或直接 `replace(/\*\*/g, '')` 去除所有 bold 标记后再解析
- 优先在 `packages/lythoskill-arena/src/comparative-judge.ts` 修复，同步检查 `packages/lythoskill-test-utils/src/judge.ts`

## 验收标准

- [ ] `**Verdict: PASS**` 正确解析为 `PASS`
- [ ] `**Verdict: FAIL**` 正确解析为 `FAIL`
- [ ] 无 `**` 包裹的原有格式继续正常工作
- [ ] 新增回归测试覆盖 markdown bold case
- [ ] arena 现有 judge 测试全部通过

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件

- 修改: `packages/lythoskill-arena/src/comparative-judge.ts`
- 修改: `packages/lythoskill-test-utils/src/judge.ts`
- 新增/修改: judge 相关测试文件

## Git 提交信息建议

```
fix(arena): judge parser handles markdown bold wrapping (TASK-20260508155102153)

- Strip ** markers from verdict lines before JSON.parse
- Regression test for **Verdict: PASS** format
- Existing non-bold verdicts unaffected

Closes: TASK-20260508155102153
```

## 备注

此 bug 在 arena agent-run 测试中已实际触发（cookie recipe 场景产出正确，但 judge parser 因 `**` 标记报错）。修复后直接提升 arena 稳定性。
