# lythoskill — AGENTS.md

> 本文档面向 AI coding agent。阅读者被假设对该项目一无所知。

---

## 项目概述

**lythoskill** 是一个自举的 thin-skill 单体仓库（monorepo）脚手架工具。

它解决的核心矛盾：AI agent skill 的**开发态**需要完整的 monorepo 体验（依赖管理、测试、类型检查），而**发布态**需要极致轻量（仅 SKILL.md + 薄脚本层，context window 敏感）。

lythoskill 自身就是用 lythoskill 模式创建的——它是自己的第一个用户（self-bootstrap）。

---

## 技术栈

| 层级 | 选择 |
|------|------|
| 运行时 | **Bun** |
| 语言 | **TypeScript** |
| 模块系统 | **ESM-only** (`"type": "module"`) |
| 包管理器 | **pnpm** workspaces |
| 外部依赖 | **零** — 仅使用 Node.js 内置模块 (`node:fs`, `node:path`) |

关键配置：
- `tsconfig.json` 中 `moduleResolution` 必须为 `"bundler"`（支持 `import ... with { type: "json" }`）
- `types` 包含 `"bun-types"`
- 目标 `"esnext"`，模块 `"esnext"`

---

## 项目结构

```
lythoskill/
├── package.json              # 根 workspace 配置（private: true）
├── pnpm-workspace.yaml       # pnpm 工作区：packages/*
├── AGENTS.md                 # 本文件
│
├── packages/
│   └── lythoskill/           # 核心脚手架工具（npm 可发布包）
│       ├── package.json      # bin: { "lythoskill": "./src/cli.ts" }
│       ├── tsconfig.json
│       └── src/
│           ├── cli.ts        # CLI 入口：init / build 命令路由
│           ├── init.ts       # `lythoskill init <name>` — 生成新项目
│           ├── build.ts      # `lythoskill build <skill>` — 构建技能到 dist/
│           └── templates.ts  # 所有模板字符串（package.json、tsconfig、SKILL.md 等）
│
├── skills/
│   └── lythoskill-creator/   # 本项目的 skill 层
│       └── SKILL.md          # 对 agent 可见的技能描述 + 使用脚本
│
└── cortex/                   # 项目治理文档（project-cortex 工作流）
    ├── INDEX.md              # 目录索引与统计
    ├── adr/accepted/         # 架构决策记录（ADR）
    ├── epics/active/         # 需求史诗（Epic）
    ├── tasks/completed/      # 执行任务（Task）
    └── wiki/patterns/        # 模式文档（Wiki）
```

---

## 架构：Thin Skill Pattern（三层分离）

```
Starter (packages/<name>/)   → npm/pip publish → 依赖治理 + CLI 入口
Skill   (skills/<name>/)     → lythoskill build → 意图描述 + bunx 调用
Dist    (dist/<name>/)       → release         → 对 agent 的最终产物
```

1. **Starter**：管理所有依赖，暴露 CLI entry point。agent 不直接读这里的代码。
2. **Skill**：仅包含 `SKILL.md` + `scripts/`。脚本通过 `bunx <starter> <command>` 调用已发布的包。`SKILL.md` 不知道依赖的存在。
3. **Dist**：`build` 命令过滤 dev 文件、验证 frontmatter 后的输出目录。

类比：
- Skill ≈ Spring Controller（路由层，接口契约）
- npm/pip 包 ≈ Spring Service（实现层，自由演进）
- Starter ≈ Spring Boot Starter（BOM + CLI 入口）

---

## 构建与运行命令

所有命令均从项目根目录执行，使用 `bunx` 运行：

```bash
# 初始化一个新 lythoskill 项目
bunx lythoskill init <project-name>

# 构建指定 skill 到 dist/（过滤测试文件、验证 frontmatter）
bunx lythoskill build <skill-name>
```

构建行为细节：
- 读取 `skills/<skill-name>/`
- 要求目录内存在 `SKILL.md` 且必须以 `---` YAML frontmatter 开头
- 过滤排除：`__tests__`、`node_modules`、`.DS_Store`、`.test.ts`、`.spec.ts` 等
- 输出到 `dist/<skill-name>/`

本项目自身暂无测试框架或 lint 配置。验证方式：手动执行 `bunx lythoskill init <name>` 和 `bunx lythoskill build lythoskill-creator` 检查产物。

---

## 代码风格规范

1. **ESM-only**：禁止 `require()`。读取 JSON 使用：
   ```typescript
   import pkg from '../package.json' with { type: 'json' }
   ```

2. **内置模块前缀**：一律使用 `node:` 前缀（`node:fs`, `node:path`）。

3. **零外部依赖**：核心包不安装任何 npm 依赖。Bun 内置 API 足够。

4. **模板字符串中的反引号**：如果生成的内容包含代码块（含 `` ` ``），使用 **fence variable trick**：
   ```typescript
   const fence = '`'.repeat(3)  // => '```'
   ```
   避免在模板字符串中转义反引号。

5. **CLI 风格**：使用 `process.argv.slice(2)` 解析，简单 `switch` 路由，无 CLI 框架。

6. **文件权限**：生成的 shell 脚本需显式 `chmodSync(path, 0o755)`。

---

## 开发工作流

### 修改代码后
直接运行验证，无编译步骤（Bun 原生运行 TypeScript）：
```bash
bun packages/lythoskill/src/cli.ts init my-test
bun packages/lythoskill/src/cli.ts build lythoskill-creator
```

### 发布路径（计划中）
- npm scope: `@lythos/*`
- PyPI prefix: `lythos-*`
- Skill 前缀: `lythoskill-*`

### 治理规范（Cortex）
项目使用 `project-cortex` 技能管理文档：
- **ADR**：重大架构决策（目录 `cortex/adr/accepted/`）
- **Epic**：需求史诗（目录 `cortex/epics/active/`）
- **Task**：具体执行任务（目录 `cortex/tasks/completed/`）
- **Wiki**：可复用模式（目录 `cortex/wiki/patterns/`）
- 文件命名：`ADR-NNN-title.md`, `EPIC-NNN-title.md`, `TASK-NNN-title.md`

---

## 安全与边界

- **禁止访问工作目录外文件**：所有 `fs` 操作均相对于 `process.cwd()` 或生成的项目根目录。
- **无网络请求**：工具本身不发起 HTTP 请求，纯本地文件系统操作。
- **构建过滤**：`build` 命令显式排除测试文件和 `node_modules`，防止 dev 依赖意外进入发布产物。
- **模板注入风险低**：模板内容均为硬编码字符串，不拼接用户输入到代码执行路径（仅用于文件名和项目名）。

---

## 快速参考

| 文件 | 职责 |
|------|------|
| `src/cli.ts` | 命令路由（init / build） |
| `src/init.ts` | 生成 10 文件项目模板 |
| `src/build.ts` | 复制 + 过滤 → dist/ |
| `src/templates.ts` | 所有字符串模板 |
| `skills/lythoskill-creator/SKILL.md` | Agent 可见的使用文档 |
