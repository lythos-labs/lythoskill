# TASK-20260503152001333: Adopt alias-as-key dict schema for skill entries

## Status History
| terminated | 2026-05-03 | Superseded by alias-as-key dict schema (Decision D in ADR-20260503152000411) |<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created per ADR-20260503152000411 Decision A |
| backlog (revised) | 2026-05-03 | Schema 从 array-of-tables 切到 alias-as-key dict;ADR Decision A 已修订(方案 D selected) |

## 背景与目标

ADR-20260503152000411 Decision A(修订版)决定把 `skill-deck.toml` 的 skill 条目从 string array 改为 **alias-as-key dict**(`[<type>.skills.<alias>]`),其中 alias 是 first-class TOML key,承担 **role / job description** 角色,与 `path`(implementation)解耦。

**关键心智(ADR Decision A)**:
- `alias = role`(JD,short name);`path = implementation`(当前选定的 skill 实现)
- `deck.toml` 读作"卡组需要哪些角色,目前由谁实现",而非"我装了哪些 skill"
- alias 重复 → TOML parser 直接抛错,deck CLI **不需自己写 collision 检测逻辑**(thin layer + 成熟基建)
- object body 装 `role` / `why_in_deck` 等 rationale 字段,把"卡组治理"做成显式写作面
- 留 `why_in_template` / `contenders` 字段占位,为后续 template 系统 + arena 对接(超出本 task scope)
- 与 Maven `dependencyManagement`、npm `dependencies` 同构

本 task 落地 schema 与解析器的同步,以及对存量 deck.toml 的迁移工具。

## 需求详情
- [ ] 新建 `packages/lythoskill-deck/src/parse-deck.ts`,接受 alias-as-key dict 形式
- [ ] 每条 entry 形如 `[<type>.skills.<alias>]`,object body 含:
  - `path`(必填,FQ form 或 `localhost/<name>`)
  - `role`(可选,string,role/JD 描述)
  - `why_in_deck`(可选,string,项目层 rationale)
- [ ] zod schema 用 `passthrough()` 模式,允许未知字段存在但不验证(forward-compat:后续 ADR 加 `why_in_template` / `contenders` / `expires` / `pin` / `hash_lock` 时不必改本 schema)
- [ ] alias collision:同 type 内由 TOML parser 兜底;跨 type 由 deck CLI 合并校验
- [ ] 兼容期:仍解析 string-array,但打 deprecation warning(指引到 `deck migrate-schema`)
- [ ] `schema.ts` 中新增 `SkillEntrySchema`(zod)+ 导出 TS 类型(只含 `path` / `role?` / `why_in_deck?`,**不含 `as`** —— alias 由外层 key 表达;**不含**未来扩展字段 —— passthrough 兜底)
- [ ] 新增 `deck migrate-schema` 命令:读现有 deck.toml,把 string array 转成 `[<type>.skills.<alias>]` section,alias = `basename(path)`,backup 原文件到 `skill-deck.toml.bak.<ts>`,幂等(已转换则 no-op + 报告)
- [ ] `--dry-run` 打印 diff 而不写盘
- [ ] BDD 单元测试:旧 deck(string array)/ 新 deck(alias-keyed dict)/ 混合(两段并存) 各一组场景

## 技术方案
- `@iarna/toml` 原生支持嵌套 dot-keyed table,parse 出来就是 `{ <type>: { skills: { <alias>: { path, role?, ... } } } }`
- 兼容路径:if entry is string → 在内存里转换为 `{ alias: basename(path), path }`,标 deprecation tag
- migrate 工具:用 `parse → 转换 → stringify` 三步,backup + 写盘
- alias 推断:`basename(path)` —— path 末段(skills/<name> 时取 name;直接 host/owner/repo 时取 repo)
- 校验:v0.8.x 解析时 emit warning to stderr;v1.0 改为 throw
- **forward-compat 策略**:`SkillEntrySchema = z.object({...}).passthrough()` —— 未知字段不报错,直接保留在 parsed 对象,后续 ADR 在自己 scope 里加严

## 验收标准
- [ ] 旧 deck.toml(string-array)能 parse 出等价 alias-keyed dict + 打 warning
- [ ] 新 deck.toml(alias-as-key dict)能 parse,字段类型正确(path / role? / why_in_deck?)
- [ ] 混合形式能 parse(过渡兼容)
- [ ] 同 type 内 alias 重复:TOML parser 抛错,error message 指明哪个 alias 冲突
- [ ] 跨 type 同 alias:deck CLI 校验抛错(stderr 友好提示用 `--as` 指定别名)
- [ ] `deck migrate-schema` 把当前项目 `skill-deck.toml`(8 条 string entries)转成 dict 形态 + 备份原件
- [ ] `--dry-run` 输出可读 diff
- [ ] zod schema 拒掉不合法 entry(空 path、非 FQ 形)
- [ ] zod schema 接受未知字段(passthrough 验证) —— 可后续测一条带 `expires = "..."` 的 entry,parse 不报错

## 进度记录
<!-- 执行时更新,带时间戳 -->
- 2026-05-03 16:2X — task 卡 schema 决策修订(方案 B → 方案 D);用户进一步反馈引出 role/JD 心智 + 双向 why 设计;TDD red phase 即将开始

## 关联文件
- 修改: `packages/lythoskill-deck/src/link.ts`、`packages/lythoskill-deck/src/schema.ts`、`packages/lythoskill-deck/src/cli.ts`、`packages/lythoskill-deck/skill/SKILL.md`
- 新增: `packages/lythoskill-deck/src/parse-deck.ts`、`packages/lythoskill-deck/src/migrate-schema.ts`、`packages/lythoskill-deck/test/scenarios/parse-old-string-array.ts`、`packages/lythoskill-deck/test/scenarios/parse-new-alias-dict.ts`、`packages/lythoskill-deck/test/scenarios/parse-mixed.ts`

## Git 提交信息建议
```
feat(deck): alias-as-key dict schema + migrate-schema (TASK-20260503152001333)

- Parse [<type>.skills.<alias>] entries with `path` + `role?` + `why_in_deck?` + future fields
- alias = role / path = implementation; TOML parser handles alias collision
- Backward-compat: string-array still parsed with deprecation warning
- Add `deck migrate-schema` for one-shot conversion (string-array → dict)
- Implements ADR-20260503152000411 Decision A (revised, 方案 D)
```

## 备注
- ADR-20260503152000411 Decision A(修订版,方案 D selected;含 role/JD 心智 + 双向 why 扩展线)
- 不要破坏 `[deck]`、`[innate]`、`[tool]` 等 section 头部的格式
- `localhost/<name>` 也走同样的 entry shape
- `role` / `why_in_deck` 是 dict 形态独有的便利字段;本 task 实现后立刻可用
- `why_in_template` / `contenders` 留 schema 占位,**本 task 不写入路径**,由后续 ADR / task 承接
