# TASK-20260503152002342: Implement alias resolution and collision detection in deck link

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created per ADR-20260503152000411 Decision A + B (link 部分) |

## 背景与目标

ADR-20260503152000411 钉死 `deck link` 的契约:**纯 idempotent reconciler**,把 `.claude/skills/` 顶层只填成 flat symlink `<alias>/ → <cold-pool 物理路径>`,不允许跨层副作用。本 task 是 link 端落地——alias 解析、collision 检测、非 symlink 实体备份+移除。

需要兼容当前项目里残留的 deep vendor 树(`.claude/skills/github.com/<owner>/<repo>/skills/<name>/`),link 一跑应被识别为非 symlink 实体,backup 到 `.claude/skills.bak.<ts>.tar.gz` 后移除,然后 materialize 出 flat symlink。

## 需求详情
- [ ] resolver:对每条 entry 计算 (cold-pool 物理路径, 解析 alias)
  - alias = explicit `as` 字段 或 `basename(path)` 默认
- [ ] collision detection:跨 type(innate + tool + combo + transient)合并所有 alias,同名 = 报错
  - 错误信息列出冲突条目的 `path` 和当前 alias,建议加 `as`
- [ ] working-set materializer:`.claude/skills/<alias>/` 创建 symlink → cold-pool 路径
- [ ] 顶层非 symlink 实体(目录、普通文件)→ 备份 + 移除(沿用现有 backup 逻辑)
  - 包括当前残留的 `github.com/` 真目录
- [ ] 已存在的 symlink:目标错 → recreate;目标对 → no-op
- [ ] 失败模式:cold pool 缺 path → 报错并跳过(给 actionable 提示用 `deck add`)
- [ ] `lstatSync` 而非 `existsSync`(已知 gotcha,SKILL.md 已记)

## 技术方案
- 在 `link.ts` 主循环里:解析新 schema → 计算 alias → 校验 collision → reconcile
- alias collision 在解析阶段一次性校验,fail-fast
- backup 大小 > 100MB 时 refuse(沿用现有约束)
- lock 文件 `skill-deck.lock` 字段:每条 LinkedSkill 记录 `alias` + `path`(扩 `LinkedSkillSchema`)

## 验收标准
- [ ] 当前 `.claude/skills/github.com/...` 真目录在 link 后被 backup + 移除
- [ ] 9 条 declared skill(per `skill-deck.toml`)全部以 flat symlink 出现在 `.claude/skills/<alias>/`
- [ ] harness 重新 scan 时 9 个全部可见
- [ ] alias collision(同 basename 不加 `as`)→ link refuse,exit non-zero,提示加 `as`
- [ ] cold pool 路径未被任何环节修改(go-module 路径稳定)
- [ ] re-run link 是 no-op(idempotent)

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改: `packages/lythoskill-deck/src/link.ts`、`packages/lythoskill-deck/src/schema.ts`(`LinkedSkillSchema` 加 alias 字段)
- 测试: `packages/lythoskill-deck/test/link.test.ts`,BDD 由 TASK-20260503152006435 落地

## Git 提交信息建议
```
feat(deck): alias resolution + collision detection in link reconciler (TASK-20260503152002342)

- Resolve alias from `as` or basename(path)
- Reject same-alias entries across all types with actionable error
- Materialize flat symlinks at .claude/skills/<alias>/
- Implements ADR-20260503152000411 Decision A + B (link)
```

## 备注
- 依赖 TASK-20260503152001333(schema 解析必须先到位)
- collision 检测的错误格式可参考 link.ts 已有的 Ambiguous 错误
