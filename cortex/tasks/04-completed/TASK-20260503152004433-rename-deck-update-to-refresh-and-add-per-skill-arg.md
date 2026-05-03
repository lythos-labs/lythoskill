# TASK-20260503152004433: Rename deck update to refresh and add per-skill arg

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created per ADR-20260503152000411 Decision B (refresh + update deprecation) |
| completed | 2026-05-03 | Closed via trailer |

## 背景与目标

当前 `deck update` 实际操作的是 cold pool(`git pull` declared skills),不动 deck.toml。但命名让用户(以及压缩后的 agent)以为它"更新 deck.toml",造成认知错位。ADR-20260503152000411 Decision B 决定改名 `update → refresh`,语义贴合;同时支持单 skill 参数,精细化操作。

## 需求详情
- [ ] 把 `update.ts` 内逻辑重命名为 `refresh`(可保留文件名或新增 `refresh.ts`)
- [ ] 新接口 `refresh [<fq|alias>]`:无参 = 所有 declared;有参 = 单条
- [ ] 单条:解析 FQ 或 alias → 找到 cold pool 路径 → `git pull`
- [ ] 完成后调 `link`(因为 git pull 后 SKILL.md 等可能变,working set symlink 不需要改但 lock 文件要更新)
- [ ] **不动 deck.toml**(强不变量)
- [ ] `deck update` 仍可用作 alias to `refresh`,带 deprecation warning(单行,提示用 `refresh`),v1.0.0 删
- [ ] CLI help / SKILL.md 同步更新

## 技术方案
- `cli.ts` 注册 `refresh` 命令,`update` 注册为 deprecated alias
- `refresh.ts`:接 `--all`(默认行为)和 positional `<fq|alias>` 两种入口
- 单条解析:复用 schema 的 alias resolver(TASK-20260503152002342),把 alias 转回 path
- `git pull` 失败 → 报错但不影响其他 skill(批量模式)
- skip `localhost/*` skills(沿用现行规则)

## 验收标准
- [ ] `deck refresh`(无参)= `deck update` 旧行为
- [ ] `deck refresh github.com/foo/bar/baz` = 仅对该路径执行 `git pull`
- [ ] `deck refresh tdd-foo` = 通过 alias 解析到 path 后 `git pull`
- [ ] `deck update`(任何形式)仍工作,但 stderr 打 deprecation warning
- [ ] deck.toml 在任何分支下都不被改写(diff 验证)
- [ ] cold pool 路径稳定,go-module 形不被改

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-deck/src/update.ts`(或重命名)、`packages/lythoskill-deck/src/cli.ts`、`packages/lythoskill-deck/skill/SKILL.md`
- 新增: `packages/lythoskill-deck/src/refresh.ts`(若选独立文件)

## Git 提交信息建议
```
feat(deck): rename update to refresh + per-skill arg (TASK-20260503152004433)

- New `refresh [<fq|alias>]` command; positional = single-skill
- `update` aliased to `refresh` with deprecation warning (removed in v1.0)
- Strict: refresh never modifies deck.toml
- Implements ADR-20260503152000411 Decision B
```

## 备注
- alias resolver 来自 TASK-20260503152002342
- per-skill arg 解锁的场景:CI 上只 refresh 某个有 hot-fix 的 skill,而不是全量 pull
