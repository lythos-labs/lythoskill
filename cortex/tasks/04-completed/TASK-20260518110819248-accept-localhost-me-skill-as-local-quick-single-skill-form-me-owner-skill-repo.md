# TASK-20260518110819248: localhost/<skill> quick form for personal skills

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| in-progress | 2026-05-18 | Implemented |
| review | 2026-05-18 | Tests pass |
| completed | 2026-05-18 | 21/21 pass |
| in-progress | 2026-05-18 | Started |
| review | 2026-05-18 | Deliverables committed |
| completed | 2026-05-18 | Done |

## 背景与目标
`localhost/skill-x` (2 segments) 被 FQ parser 拒绝——"Bare names rejected"。但本地单 skill 场景极其常见，不应该要求 `localhost/owner/repo` 的完整三层。用户直觉会写 `localhost/<skill-name>`。

实现：`localhost/<skill>` → 内部映射为 owner=me, repo=<skill>。`localhost/me/<skill>` (3 segments) 也能工作——向后兼容。

## 需求详情
- [x] parseLocator 接受 `localhost/<skill>` (2 segments) → owner='me', repo='<skill>'
- [x] 向后兼容：`localhost/owner/repo[/skill]` (3+ segments) 不受影响
- [x] 更新注释文档
- [x] 更新测试：旧 "rejected" 测试 → 新 "shorthand" 测试
- [x] 更新 reproduce.sh demo 使用 `localhost/skill-x`

## 技术方案
`parse-locator.ts`: 当 `isLocalhost && parts.length === 2` 时，owner='me', repo=parts[1]。不需要新字段，Locator 接口不变。

## 验收标准
- [x] `parseLocator('localhost/my-skill')` → `{ host:'localhost', owner:'me', repo:'my-skill', skill:null }`
- [x] `parseLocator('localhost/me/my-skill')` → 仍正常工作 (3 segments, backward compat)
- [x] 21/21 tests pass
- [x] reproduce.sh demo 可用 `localhost/skill-x` 简写

## 关联文件
- 修改: `packages/lythoskill-cold-pool/src/parse-locator.ts`
- 修改: `packages/lythoskill-cold-pool/src/parse-locator.test.ts`
