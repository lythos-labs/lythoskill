# TASK-20260827141405220: Fix version synchronization: npm, GitHub tags/releases, and site display

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-08-27 | Created |

## Background & Goals

当前项目存在多处版本信息不一致，影响可审计性与外部用户信任：

1. **npm 版本 = `0.17.3`**（根 `package.json` 及已发布包）。
2. **GitHub tags 只到 `v0.9.18`**，落后 npm 7 个 minor 版本。
3. **GitHub Releases 只到 `v0.7.0`**，且标记为 Latest，严重过时。
4. **GitHub Pages 站点**（https://lythos-labs.github.io/lythoskill/）没有任何版本、commit hash 或“最后更新于/最后发布于”时间显示，无法让访问者确认站点对应哪个源码版本。
5. 发布流程（`scripts/publish.sh`）可能未 push tags 或创建 GitHub Releases，需要审计并补齐。

目标：建立 npm / Git tags / GitHub Releases / 站点显示 四者一致的版本同步机制，并在站点展示当前版本、commit short hash 与人类可读的“最后更新于/最后发布于”时间，便于持续发布时自查。

## Requirements

- [ ] 在站点 footer 或 nav 显示：当前 npm 版本（如 `v0.17.3`）、构建时 Git commit short hash、人类可读的最后更新时间（如 `2026-08-27`）。
- [ ] 站点构建脚本/配置自动读取根 `package.json` 版本、`git rev-parse --short HEAD` 与当前日期，无需手工维护。
- [ ] 审计 `scripts/publish.sh`，确认发布时是否 push tags / 创建 GitHub Releases；如缺失则补齐。
- [ ] 将历史 npm 版本 `0.17.3` 对应的 tag 与 GitHub Release 补齐（或按用户决策处理）。
- [ ] 发布 SOP（AGENTS.md / release-auth-workflow）更新，确保未来发布“版本四同步”。

## Technical Approach

1. **站点注入版本/commit/日期**：修改 `site/.vitepress/config.*`，在 VitePress `themeConfig.footer` 增加动态文本。构建前通过脚本将 `package.json.version`、`git rev-parse --short HEAD` 和当前日期写入 VitePress 配置或环境变量。
2. **构建脚本增强**：在 `site/package.json` 的 `docs:build` 或 CI `site-build` job 中，先执行版本注入脚本，再跑 `vitepress build`。
3. **发布流程审计**：阅读 `scripts/publish.sh` 与 `packages/lythoskill-creator/src/bump.ts`，定位 tag/release 相关逻辑。
4. **历史 tag/release 补齐**：若用户同意，对当前 HEAD 打 `v0.17.3` tag 并创建 GitHub Release（或从 npm 反查对应 commit）。
5. **文档更新**：更新 `packages/lythoskill-creator/skill/references/release-auth-workflow.md` 与根 `AGENTS.md` 相关段落。

## Acceptance Criteria

- [ ] 访问 https://lythos-labs.github.io/lythoskill/ 能在页面底部看到 `v0.17.3`、类似 `5100370` 的 commit short hash 与 `Last updated: 2026-08-27`。
- [ ] 本地 `bun run docs:build`（或等价命令）不依赖手工输入即可生成带版本信息的站点。
- [ ] `git ls-remote --tags origin` 包含 `v0.17.3`（或用户指定的处理方式）。
- [ ] `gh release list` 显示 `v0.17.3` 且为 Latest（或用户指定的处理方式）。
- [ ] 发布 SOP 文档明确“push 前/后必须同步 tags 与 releases”。

## Progress Log

- 2026-08-27 — Task created. Audited current state: npm `0.17.3`, GitHub tags `v0.9.18`, GitHub Releases `v0.7.0`, site shows no version metadata.
- 2026-08-27 — Implemented site version metadata injection: `site/scripts/inject-version.ts`, `site/.vitepress/config.ts` footer (EN + ZH), `site/package.json` build script, CI workflows updated.
- 2026-08-27 — Created dedicated GitHub release script `scripts/publish-github-release.sh` (separate from npm `publish.sh` per user feedback).
- 2026-08-27 — Updated release SOP `packages/lythoskill-creator/skill/references/release-auth-workflow.md` with canonical order: test → bump → commit → publish → push → tag/release, citing `daily/2026-07-31.md` historical decision.

## Related Files
- Modified:
- Added:

## Git Commit Message
```
feat(scope): description (TASK-20260827141405220)

- Detail 1
- Detail 2
```

## Notes
