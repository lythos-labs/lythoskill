# TASK-20260503152001333: Adopt array-of-tables schema with as-alias for skill entries

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created per ADR-20260503152000411 Decision A |

## 背景与目标

ADR-20260503152000411 Decision A 决定把 `skill-deck.toml` 的 skill 条目从 string array 改为 array-of-tables(`[[<type>.skills]]`),以支持 `as` alias 字段、为 future 字段(`expires` / `pin` / `hash_lock`)留扩展位、并让 add / remove / refresh 等 CRUD 命令以块为单位操作。本 task 落地 schema 与解析器的同步,以及对存量 deck.toml 的迁移工具。

## 需求详情
- [ ] `link.ts`(或新文件 `parse-deck.ts`)接受 array-of-tables 形式
- [ ] 每条:`path`(必填,FQ)+ `as`(可选,默认 `basename(path)`)
- [ ] 兼容期:仍解析 string-array,但打 deprecation warning(指引到 `deck migrate-schema`)
- [ ] `schema.ts` 中新增 `SkillEntrySchema`(zod)+ 导出 TS 类型
- [ ] 新增 `deck migrate-schema` 命令:读现有 deck.toml,把 string array 转成 [[]] section,backup 原文件到 `skill-deck.toml.bak.<ts>`,幂等(已转换则 no-op + 报告)
- [ ] `--dry-run` 打印 diff 而不写盘
- [ ] 单元测试:旧 deck / 新 deck / 混合(string + 对象)各一组

## 技术方案
- `@iarna/toml` 原生支持 array-of-tables,parse 出来就是 `{ path, as? }[]`
- 兼容路径:if entry is string → 在内存里转换为 `{ path: entry }`,标 deprecation tag
- migrate 工具:用 `parse → 转换 → stringify` 三步,backup + 写盘
- 校验:v0.8.x 解析时 emit warning to stderr;v1.0 改为 throw

## 验收标准
- [ ] 旧 deck.toml(string-array)能 parse 出等价对象 + 打 warning
- [ ] 新 deck.toml(array-of-tables)能 parse,字段类型正确
- [ ] 混合形式能 parse(过渡兼容)
- [ ] `deck migrate-schema` 把当前项目 `skill-deck.toml` 转成新格式 + 备份原件
- [ ] `--dry-run` 输出可读 diff
- [ ] zod schema 拒掉不合法 entry(空 path、非 FQ 形)

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-deck/src/link.ts`、`packages/lythoskill-deck/src/schema.ts`、`packages/lythoskill-deck/src/cli.ts`、`packages/lythoskill-deck/skill/SKILL.md`
- 新增: `packages/lythoskill-deck/src/migrate-schema.ts`、`packages/lythoskill-deck/test/parse-deck.test.ts`

## Git 提交信息建议
```
feat(deck): array-of-tables schema with as-alias support (TASK-20260503152001333)

- Parse [[<type>.skills]] entries with `path` + optional `as`
- Backward-compat: string-array still parsed with deprecation warning
- Add `deck migrate-schema` for one-shot conversion
- Implements ADR-20260503152000411 Decision A
```

## 备注
- ADR-20260503152000411 Decision A
- 不要破坏 `[deck]`、`[innate]`、`[tool]` 等 section 头部的格式
- `localhost/<name>` 也走同样的 entry shape
