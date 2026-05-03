# TASK-20260503154354857: Bump actions/checkout to v5 for Node 24 compat

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-03 | Created — non-blocking deprecation flagged on CI run 25273343292 |

## 背景与目标

GitHub Actions runner annotation(2026-05-03 CI run 25273343292):

> Node.js 20 actions are deprecated. … `actions/checkout@v4` 跑在 Node 20 上,2026-06-02 起 GitHub 强制 Node 24,2026-09-16 把 Node 20 从 runner 删除。

当前 `.github/workflows/test.yml` 用 `actions/checkout@v4`。趁 deck 重构还没大动 CI 之前先把基础 action 升好,免得后续 task 上 CI 时撞这个 warning。

## 需求详情
- [ ] 把 `.github/workflows/test.yml` 里 `actions/checkout@v4` → `actions/checkout@v5`
- [ ] 检查 `oven-sh/setup-bun@v2` 是否同样 Node 20 → 若有 v3 则同步 bump,否则保持 v2
- [ ] CI 跑过一次确认无 annotation(或残留 warning 来自其他第三方 action)
- [ ] 顺手把 `bun-version` 显式 pin 一下(可选,讨论:是否避免再被 1.3.x 行为差异坑;不 pin 也行,声明 workspace dep 已解决核心问题)

## 技术方案
- 单文件改动:`.github/workflows/test.yml` line 13:`uses: actions/checkout@v5`
- 验证:push 后 `gh run view <id>` 看 ANNOTATIONS 段无 Node 20 警告
- 若 setup-bun 也需要 bump,看 https://github.com/oven-sh/setup-bun 的 release notes

## 验收标准
- [ ] CI 绿
- [ ] `gh run view <run-id>` 不再出现 "Node.js 20 actions are deprecated" annotation
- [ ] BDD 场景仍 12/12 pass

## 进度记录
<!-- 执行时更新,带时间戳 -->

## 关联文件
- 修改: `.github/workflows/test.yml`

## Git 提交信息建议
```
ci: bump actions/checkout to v5 for Node 24 (TASK-20260503154354857)

- Annotation: Node 20 actions deprecated 2026-06-02
- v4 → v5 keeps job working until then; v5 runs on Node 24
- No behavior change to BDD runner step
```

## 备注
- 非阻塞,但若 9 月前未处理,job 会在 runner 升级后跑不起来
- 顺序无关其他 deck 重构任务,可独立 ship
