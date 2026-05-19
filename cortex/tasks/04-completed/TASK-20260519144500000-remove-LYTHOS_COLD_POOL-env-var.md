# TASK-20260519144500000: Remove `LYTHOS_COLD_POOL` environment variable

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-19 | Created from env var audit |
| completed | 2026-05-19 | Code removed, ADR accepted |

## 背景与目标

`LYTHOS_COLD_POOL` 是早期脚手架阶段引入的环境变量，用于覆盖 cold pool 默认路径。deck.toml 标准化后，`cold_pool` 字段 + `--pool` CLI flag 已覆盖全部使用场景，该环境变量成为 dead config。

## 执行内容

- [x] 移除 `packages/lythoskill-cold-pool/src/cold-pool.ts` 中的 `process.env.LYTHOS_COLD_POOL`
- [x] 移除 `packages/lythoskill-cold-pool/src/cli.ts` 中的 env var fallback
- [x] ADR-20260519144500000 accepted

## 关联提交

```
<commit-hash> chore(cold-pool): remove LYTHOS_COLD_POOL env var
```

## 关联 ADR

- ADR-20260519144500000: Remove `LYTHOS_COLD_POOL` Environment Variable
