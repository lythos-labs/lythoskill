# TASK-20260423124059766: Define and implement lythos naming conventions and publish path

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | 2026-04-23 | Created |

## 背景与目标

lythos（λίθος，希腊语"石头"）是本项目的品牌标识。lythoskill 是 lythos 生态下的 skill 脚手架工具。

生态扩展需要统一的品牌标识和发布路径，否则：
- 不同开发者会创建冲突的 npm 包名
- Agent 无法通过统一前缀识别官方 skill
- 发布流程混乱，版本号不可追溯

当前发布路径仅在 `AGENTS.md` 中以计划段落存在，内容如下：

> **发布路径（计划中）**
> - npm scope: `@lythos/*`
> - PyPI prefix: `lythos-*`
> - Skill 前缀: `lythoskill-*`

这三个约定目前没有任何实际注册或发布验证。本 Task 的目标是把这段"计划"变成可执行的规范：确认名称可用性、文档化、完成首次发布验证。

## 需求详情

### 1. npm scope: `@lythos/*`
- [ ] 检查 npm registry 上 `@lythos` scope 是否已被占用
- [ ] 如未被占用，注册/保留该 scope（需要 npm 账号和组织设置）
- [ ] 更新 `packages/lythoskill/package.json` 和 `packages/lythoskill-project-cortex/package.json` 的 name 字段为 scoped 格式（如 `@lythos/lythoskill`）
- [ ] 在 AGENTS.md 或 Wiki 中记录 npm 发布流程

### 2. PyPI prefix: `lythos-*`
- [ ] 检查 PyPI 上 `lythos` 相关包名是否冲突
- [ ] 确认未来 Python starter 的命名规则（如 `lythos-cli`）
- [ ] 在 AGENTS.md 中补充 PyPI 发布路径说明

### 3. Skill 前缀: `lythoskill-*`
- [ ] 确认现有 skill（`lythoskill-creator`, `lythoskill-project-cortex`）符合前缀规范
- [ ] 定义第三方 skill 的命名建议（如 `lythoskill-<domain>-<action>`）
- [ ] 在 AGENTS.md 中记录命名规范

### 4. 文档化
- [ ] 新建或更新 Wiki page：`cortex/wiki/01-patterns/naming-conventions.md`
- [ ] 内容必须包含：scope 定义、前缀规则、示例、反例

## 技术方案

**名称检查工具**：
- npm: `npm view @lythos/lythoskill` 或 `npm search @lythos`
- PyPI: `curl https://pypi.org/pypi/lythos-cli/json`（404 即未占用）
- 无需引入外部依赖，使用 curl 或 npm CLI 即可

**Scoped package 迁移示例**：

当前 SKILL.md 中的调用格式：
```bash
bunx lythoskill init <project-name>
bunx lythoskill-project-cortex task "Fix login bug"
```

Scoped 后的新格式：
```bash
bunx @lythos/lythoskill init <project-name>
bunx @lythos/project-cortex task "Fix login bug"
```

需要同步修改的文件：
- `packages/lythoskill/package.json` 的 `name` 字段
- `packages/lythoskill-project-cortex/package.json` 的 `name` 字段
- 所有 `skills/*/SKILL.md` 中引用的 `bunx <package>` 命令
- `skills/*/scripts/*.sh` 中的 `bunx` 调用

## 验收标准

- [ ] `@lythos` npm scope 已注册或确认可用性
- [ ] PyPI `lythos-*` 前缀确认无冲突
- [ ] `packages/` 下所有包的 `package.json` name 字段已更新为 scoped 格式
- [ ] `skills/` 下所有 skill 的 `SKILL.md` 中 `bunx <package>` 调用已同步更新
- [ ] `cortex/wiki/01-patterns/naming-conventions.md` 存在且内容自包含
- [ ] 至少一个包完成首次 npm publish（或确认 publish 流程无误）

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- **修改**: `packages/lythoskill/package.json`
- **修改**: `packages/lythoskill-project-cortex/package.json`
- **修改**: `skills/lythoskill-creator/SKILL.md`
- **修改**: `skills/lythoskill-project-cortex/SKILL.md`
- **创建**: `cortex/wiki/01-patterns/naming-conventions.md`
- **参考**: `AGENTS.md`（发布路径段落）

## Git 提交信息建议
```
feat(docs): define lythos naming conventions and publish path (TASK-20260423124059766)

- Register/verify @lythos npm scope
- Update package.json to scoped names
- Sync SKILL.md bunx references
- Add naming-conventions wiki page

Refs: EPIC-20260423102000000
```

## 备注

- 优先级: Low（当前项目可本地运行，发布是锦上添花）
- 阻塞: 无
- 注意：npm scope 注册可能需要付费组织账号，如不可行则改为确认可用性并在文档中标注
