# Thin-Skill References 生成模式

## 核心原则

**只有配套 npm Starter 包的 skill 才有 CLI 入口，才需要 `--help` 和 `references/COMMANDS.md`。**

纯文档 skill（只有 SKILL.md + references/ + scripts/，无 npm 包）没有 CLI，build 时不会生成 `COMMANDS.md`。

## Skill 类型与 References 的关系

| 类型 | 例子 | 形态 | CLI 入口 | references/COMMANDS.md |
|------|------|------|----------|------------------------|
| **Tool skill** | deck, creator, cortex | Starter 包 + Skill 层 | `src/cli.ts` | ✅ build 时自动生成 |
| **纯文档 skill** | scribe, onboarding, red-green-release | Skill 层 only | 无 | ❌ 不生成（预期行为） |
| **自定义 runner** | arena | Skill 层的 `.ts` 脚本 | `scripts/arena-cli.ts` | ❌ 不生成（非标准入口） |

## Build-time Help Capture 机制

`lythoskill build` 在变量替换后、SKILL.md 验证前执行：

```
bun packages/<name>/src/cli.ts --help
        ↓ stdout
skill/references/COMMANDS.md
        ↓ build 复制
skills/<name>/references/COMMANDS.md
```

### 行为

- **成功**：COMMANDS.md 包含当前准确的命令参考（SSOT = CLI 代码）
- **失败**：优雅降级，catch 静默跳过，不阻塞 build
- **前提**：`cli.ts` 必须正确处理 `--help` 或 `-h` 标志

## CLI `--help` 规范检查清单

创建新的 tool skill 时，`cli.ts` 必须满足：

- [ ] `case '--help':` 和 `case '-h':` 在 `switch` 的最前面（先于业务命令）
- [ ] 打印 help 后 `process.exit(0)`
- [ ] `default` 分支打印 usage 并 `process.exit(1)`
- [ ] `--help` 分支不依赖外部资源（不读取配置文件、不连接数据库、不执行扫描）

### 反例：Curator 的 `--help` 漏洞

```ts
// ❌ 错误：--help 走到 else 分支，执行了扫描
const cmd = args[0]
if (cmd === 'query') {
  runQuery(args.slice(1))
} else {
  runCurator(args)  // --help 被当作 poolPath 处理
}
```

修复：

```ts
// ✅ 正确：--help 在最前面拦截
if (cmd === '--help' || cmd === '-h') {
  printUsage(0)
}
if (cmd === 'query') {
  runQuery(args.slice(1))
} else {
  runCurator(args)
}
```

## 声明式 Help 辅助（推荐）

使用 `src/help.ts` 将命令定义与格式化分离：

```ts
const HELP_CONFIG = {
  binName: 'lythoskill-deck',
  description: 'Declarative skill deck governance',
  commands: [
    { name: 'link', description: 'Sync working set with skill-deck.toml' },
    { name: 'validate', description: 'Validate deck configuration', args: '[deck.toml]' },
  ],
  options: [
    { flag: '--deck <path>', description: 'Specify skill-deck.toml path' },
  ],
}

console.log(formatHelp(HELP_CONFIG))
```

优点：
- 命令结构是数据，易于扩展
- build-time capture 的输出格式统一
- 未来可提炼为跨 skill 共享的 util

## 何时需要手动维护 references

以下情况，references 内容需要手写（无法从 `--help` 生成）：

1. **纯文档 skill**（无 CLI）：references 是唯一的结构化文档
2. **复杂 schema**：如 `skill-deck.toml` 的 TOML 结构、front-matter 字段规范
3. **多平台差异**：Claude Code vs Kimi CLI vs OpenAI Codex 的路径差异

这些手动 references 放在 `skill/references/` 下，build 时直接复制到 `skills/<name>/references/`。

## 与 ADR-4 的关系

本模式是 ADR-4（Template Variable Substitution and CLI Help Delegation）的延伸：

- ADR-4：SKILL.md 只保留意图，命令细节委托给 CLI `--help`
- 本模式：CLI `--help` 的输出被 build 捕获为 `references/COMMANDS.md`，供离线场景读取

两者共同确保：**任何时刻，命令参考只有一个真相源（CLI 代码），但派生格式覆盖所有使用场景（在线 `--help`、离线 references、SKILL.md 高层指引）**。
