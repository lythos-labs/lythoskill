# TASK-20260527222535526: Site path narrative audit and rewrite — align with path convention, preserve multi-platform, EN+ZH sync

## Status History

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-05-27 | Created from EPIC-20260527212032856 T1 |
| in-progress | 2026-05-27 | Started |
| review | 2026-05-27 | Deliverables committed |
| completed | 2026-05-27 | Closed via trailer |

## 背景与目标

T2 (path-convention sweep) 已建立 `cortex/wiki/01-patterns/path-convention.md`。Site 当前存在路径叙事矛盾：默认路径 `.claude/skills` 被呈现为唯一选择，忽略了项目对 `.agents/skills`、`.cursor/skills` 等多平台的支持。本任务重写 `site/` 全站路径叙事，确保与代码 ground truth 和 path convention 一致。

## 需求详情

- [ ] 修复 `site/index.md`：quick-start TOML 示例加平台可配置注释
- [ ] 修复 `site/zh/index.md`：ZH 同步
- [ ] 修复 `site/architecture.md`：示意图和文字中的 working_set 描述 genericize
- [ ] 修复 `site/zh/architecture.md`：ZH 同步
- [ ] 修复 `site/guide/index.md`：TOML 示例加注释，CLI 命令格式检查
- [ ] 修复 `site/zh/guide/index.md`：ZH 同步
- [ ] 检查 `site/philosophy.md` + `site/zh/philosophy.md`：是否有路径相关描述需要调整
- [ ] 确保 EN 和 ZH 严格同步（同一位置、同一含义、同一格式）

## 技术方案

1. 读取 `cortex/wiki/01-patterns/path-convention.md` 作为规范依据
2. 逐文件 audit：标记所有 `working_set`、`.claude/skills`、`.agents/skills` 出现位置
3. 分类处理：
   - 默认示例：保留 `.claude/skills`，但加注释 `# default; change per platform`
   - 架构描述：genericize 为 "working set (default `.claude/skills/`, configurable)"
   - 对比表：已正确，保持
4. 重写后 EN→ZH 对照验证

## 验收标准

- [ ] 全站 8 个文件无路径叙事矛盾
- [ ] 所有用户可见 TOML 示例包含平台可配置注释或相邻说明
- [ ] 架构描述不暗示 `.claude/skills` 是唯一路径
- [ ] EN 和 ZH 内容同步（同一文件结构、同一信息点）
- [ ] `git diff site/` 可被解释：每个修改都有明确的 path-convention 依据
- [ ] VitePress dev server 启动无 YAML parsing 错误

## 进度记录

## 关联文件
- 修改: `site/index.md`, `site/zh/index.md`, `site/architecture.md`, `site/zh/architecture.md`, `site/guide/index.md`, `site/zh/guide/index.md`, `site/philosophy.md`, `site/zh/philosophy.md`
- 新增: (none)

## Git 提交信息建议
```
ref(site): align path narrative with path-convention.md — multi-platform working_set, EN+ZH sync (TASK-20260527222535526)

- Default .claude/skills presented with configurability note
- Architecture description genericized (not "sole location")
- Guide quick-start TOML adds platform comment
- EN and ZH versions synchronized
```

## 备注

Refs: EPIC-20260527212032856 T1, TASK-20260527212829974 (path-convention)
Blocked by: T2 (completed)
