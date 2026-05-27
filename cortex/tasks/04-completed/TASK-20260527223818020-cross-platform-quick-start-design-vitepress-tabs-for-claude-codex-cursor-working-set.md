# TASK-20260527223818020: Cross-platform quick-start design — VitePress tabs for Claude/Codex/Cursor working_set

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-27 | Created from EPIC-20260527212032856 T5 |
| in-progress | 2026-05-27 | Started |
| completed | 2026-05-27 | Closed via trailer |

## 背景与目标

T1 已经把路径注释加到了 `site/guide/index.md` 的 TOML 示例中（`# Claude Code default; change for Cursor/Codex/etc.`），但注释方式对于新用户来说不够直观。本任务把 quick-start 升级成 VitePress 原生的 tab/code-group 切换形式，让 Claude Code、Codex、Cursor 用户各看到适合自己平台的配置，减少 copy-paste 后的修改成本。

## 需求详情

- [ ] 调研 VitePress tabs/code-group 支持（确认版本兼容性）
- [ ] 设计 `site/guide/index.md` 的 quick-start 多平台展示
- [ ] 设计 `site/index.md` 的 hero/quick-start TOML 多平台展示
- [ ] `site/zh/` 版本同步
- [ ] 确保移动端体验不崩（tabs 在窄屏下的表现）

## 技术方案

1. 检查 VitePress 版本和 tabs 插件支持
2. 如果 VitePress 支持 `::: tabs` 或 `::: code-group`：
   - `site/guide/index.md` Level 1 示例用 tabs 展示 3 个平台配置
   - `site/index.md` quick-start 用 tabs 展示
3. 如果不支持原生 tabs：
   - 方案 B：用折叠块 `::: details` 展示多平台
   - 方案 C：保持当前注释方式，但优化注释格式
4. ZH 版本同步

## 验收标准

- [ ] 新用户打开 Guide 页面，一眼能看到自己平台的配置（Claude Code / Codex / Cursor）
- [ ] 每个平台配置都是可以直接 copy-paste 的，不需要手动改路径
- [ ] `site/zh/guide/index.md` 有对应的中文 tabs/折叠块
- [ ] `site/index.md` 的 quick-start 也做了多平台优化（或至少保留清晰的注释）
- [ ] VitePress dev server 启动无错误，tabs 渲染正常
- [ ] 移动端 tabs 可正常切换

## 进度记录

## 关联文件
- 修改: `site/guide/index.md`, `site/zh/guide/index.md`, `site/index.md`, `site/zh/index.md`
- 新增: (none)

## Git 提交信息建议
```
feat(site): cross-platform quick-start with VitePress tabs (TASK-20260527223818020)

- Guide page: tabs for Claude Code / Codex / Cursor working_set configs
- Index page: platform-aware quick-start TOML
- ZH versions synchronized
```

## 备注

Refs: EPIC-20260527212032856 T5, TASK-20260527222535526 (T1)
