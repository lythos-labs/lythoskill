# Pattern: Thin Skill Monorepo

## Problem

Agent skill 的开发态和发布态需求冲突：开发需要完整的 monorepo 体验（依赖管理、测试、类型检查），发布需要极致轻量（SKILL.md + 薄脚本层）。

## Solution

三层分离架构：

```
Starter (packages/<name>/)     → npm/pip publish → 依赖治理 + CLI 入口
Skill   (skills/<name>/)       → dist/           → 意图描述 + bunx 调用
Dist    (dist/<name>/)         → release         → 对 agent 的最终产物
```

## How It Works

1. **Starter** 管理所有依赖，暴露 CLI entry point
2. **Skill** 的 SKILL.md 完全不知道依赖存在，只调用 `bunx <starter> <command>`
3. **Build** 过滤 dev 文件，验证 frontmatter，输出 dist/

## Example

```bash
# 开发态 (monorepo)
pnpm exec my-starter validate    # workspace link

# 发布态 (dist)
bunx my-starter validate         # npm registry
```

同一接口，不同解析方式。

## When to Use

- Skill 逻辑复杂到需要 `pip install` 或 `npm install`
- 多个 skill 共享同一套依赖/工具链
- 需要 CI/CD 测试和类型检查

## When NOT to Use

- Skill 是单个 Python 脚本 + stdlib 即可（保持 self-contained）
- 零外部依赖时，thin skill  overhead 不值得
