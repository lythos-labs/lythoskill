# TASK-20260518172921265: arena CLI single defaults output to CWD, leaks into project dir

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-18 | Created |
| completed | 2026-05-18 | Closed via trailer |

## 背景与目标

Arena CLI `single` 模式在未指定 `--out` 时，默认输出到 CWD 下的 `./agent-output-<timestamp>/`。Arena 自己的 skill 文档明确声明 "experiments run in /tmp, never in committed directories"，但 CLI 默认行为违背了这条规则。用户今天跑 kimi single 测试时，`agent-output-2026-05-18T09-18-31/` 泄漏到了项目根目录。

目标：默认输出路径改为 `/tmp`，CWD 写入需显式指定。

## 需求详情
- [ ] `single` 命令在不指定 `--out` 时默认输出到 `/tmp/arena-output-<timestamp>/`
- [ ] `--out` 显式指定路径时尊重用户选择（含相对路径到 CWD）
- [ ] 不影响 `prepare-workdir` 的 `--out` 行为（始终需要显式路径）
- [ ] 如果用户指定了 `--out .` 或 `--out ./subdir`，打印 warning 提醒这是 committed 目录

## 技术方案

修改 CLI `single` 命令的 `--out` 默认值逻辑。当前推测为 `./agent-output-<timestamp>` 或类似硬编码默认值。改为 `path.join(os.tmpdir(), 'arena-output-<timestamp>')`。

涉及文件：`packages/lythoskill-arena/src/cli/single.ts`（或等效入口）。

## 验收标准
- [ ] `arena single --deck ./deck.toml --brief "test"` 输出到 `/tmp/arena-output-*`
- [ ] `arena single --deck ./deck.toml --brief "test" --out ./my-output` 输出到 `./my-output/`
- [ ] `arena single --deck ./deck.toml --brief "test" --out .` 输出到 CWD 并打印 warning

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
```
feat(scope): description (TASK-20260518172921265)

- Detail 1
- Detail 2
```

## 备注
