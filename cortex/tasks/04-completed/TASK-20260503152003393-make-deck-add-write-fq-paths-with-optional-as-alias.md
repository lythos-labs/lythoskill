# TASK-20260503152003393: Make deck add write FQ paths with optional as-alias

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created per ADR-20260503152000411 Decision A + B (add 部分) |
| completed | 2026-05-03 | Closed via trailer |

## 背景与目标

`packages/lythoskill-deck/src/add.ts` line 184 当前在 deck.toml 里写 bare `skillName`,违反 ADR-20260502012643244(FQ-only locator),且没有 alias 机制。ADR-20260503152000411 决定:add 写 `[[<type>.skills]]` block,`path` 字段填 FQ,可选 `as`,必须做 alias collision 预检查。

cold pool 路径(line 102 `targetDir = join(coldPool, host, owner, repo)`)本来就走 go-module 形,这部分不动。

## 需求详情
- [ ] 删除 line 184 的 bare-name 写法
- [ ] 改为构造 `{ path: <FQ>, as?: <alias> }` 对象,append 到对应 `[[<type>.skills]]` array
- [ ] CLI 选项:
  - `--as <alias>`:显式 alias(默认 = `basename(path)`)
  - `--type <innate|tool|combo|transient>`:目标 section,默认 `tool`
- [ ] alias 冲突预检查:解析现有 deck.toml,若新 entry 的 alias 与已有重名 → 退出 + 提示加 `--as`
- [ ] cold pool 路径写入逻辑(go-module 形)保持不变(line 102 已对)
- [ ] `--via skills.sh` 路径同样升级 alias 流程(line 122-152 检测新建目录的逻辑要改,免得污染 working set 顶层)
- [ ] 尾随调用 `link` 流程不变

## 技术方案
- 重写 `addSkill()` 中"写 deck.toml"那段(line 180-197)
- 新增 helper:`buildSkillEntry(parsed: ParsedLocator, opts: { as?, type? }) → SkillEntry`
- alias 预检查复用 TASK-20260503152002342 的 collision 检测函数
- `--via skills.sh` 后 detect to `~/.claude/skills/<x>` 那段改为 detect to cold pool(避免误把 working set 当成"已下载"信号)

## 验收标准
- [ ] `deck add github.com/foo/bar/baz`(无 `--as`)→ 写入 `[[tool.skills]]\npath = "github.com/foo/bar/baz"`
- [ ] `deck add github.com/foo/bar/baz --as baz-foo`(冲突时)→ 写入 `path = ".../baz"\nas = "baz-foo"`
- [ ] alias collision 时 add 退出 non-zero,提示加 `--as`
- [ ] `--type innate` 把条目写到 `[[innate.skills]]`
- [ ] cold pool 路径仍是 `<cold_pool>/<host>/<owner>/<repo>/`
- [ ] 尾随 link 把新 skill flat symlink 起来

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-deck/src/add.ts`、`packages/lythoskill-deck/src/cli.ts`(注册 `--as`、`--type` 选项)
- 测试: `packages/lythoskill-deck/test/add.test.ts`

## Git 提交信息建议
```
feat(deck): add writes FQ paths and supports --as alias (TASK-20260503152003393)

- Replace bare-name write at line 184 with [[<type>.skills]] block
- Add `--as <alias>` and `--type <innate|tool|combo|transient>` flags
- Pre-check alias collisions; refuse with actionable hint
- Implements ADR-20260503152000411 Decision A + B (add)
```

## 备注
- 依赖 TASK-20260503152001333(parser)+ TASK-20260503152002342(collision detector)
- 同时还清掉 ADR-20260502012643244 的 "deck add 写 FQ" 未结尾巴
