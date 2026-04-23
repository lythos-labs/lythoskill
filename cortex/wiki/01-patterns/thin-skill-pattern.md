# Pattern: Thin Skill Pattern

> 参考 ADR-20260423101938000 | 状态: ✅ 已验证

## 问题

Agent skills 的开发态和发布态需求矛盾：

- **开发态**需要 monorepo、测试、lint、类型检查——开发体验敏感
- **发布态**需要极简目录（SKILL.md + 薄脚本）——context window 敏感

社区已有发布标准（OpenAI Codex, Microsoft Agent Framework, Skilldex），但缺少从开发态到发布态的 **build pipeline**。

## 解决方案

采用三层分离架构，把"重"的沉淀到包管理器，"轻"的保留在 skill 层：

```
┌─────────────────────────────────────────────────────────────┐
│                    THIN SKILL PATTERN                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   开发态 (Monorepo)              发布态 (Thin Directory)     │
│                                                             │
│   ┌─────────────────┐           ┌──────────────────────┐   │
│   │ packages/       │           │ my-skill/            │   │
│   │   core-lib/     │  publish  │   SKILL.md           │   │
│   │   (npm/pip)     │ ────────► │   scripts/           │   │
│   │                 │           │     run.sh           │   │
│   │ skills/         │  build    │       ↓              │   │
│   │   my-skill/     │ ────────► │   bunx @scope/lib    │   │
│   │     SKILL.md    │           │   references/        │   │
│   │     scripts/    │           └──────────────────────┘   │
│   │     __tests__/  │                                        │
│   └─────────────────┘                                        │
│                                                             │
│   Starter (包) = Spring Service    Skill = Spring Controller │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 三层定义

| 层级 | 职责 | 发布方式 | 类比 |
|------|------|----------|------|
| **Starter** | 依赖治理 + CLI 入口 | npm/pip publish | SStarter |
| **Package** | 实现逻辑 | npm/pip publish | Service |
| **Skill** | 意图描述 + 薄脚本路由 | `lythoskill build` → dist/ | Controller |

### 为什么这样分

1. **版本治理复用**: npm/pip 已经解决了 diamond dependency，不需要重复建设
2. **Skill 层 immutable**: 只要接口不变，底层包可以热更新而 skill 不需要升级
3. **Content-addressable**: 可以 `bunx foo@sha256:abc123` 固定版本
4. **Context window 最优**: 发布态只有 SKILL.md + 几行脚本，符合 progressive disclosure

### Progressive Disclosure

发布态 skill 的加载是渐进的：

1. **Advertise** (~100 tokens): frontmatter 让 agent 知道"能做什么"
2. **Load** (< 5000 tokens): SKILL.md 让 agent 知道"怎么调用"
3. **Read**: 需要时读 references/
4. **Run**: 执行时调用 scripts/ → `bunx` → 实际包

任何多余的开发文件（测试、源码、配置）都会浪费前两层珍贵的 token 预算。

## 使用方式

```bash
# 开发态：monorepo 工作
├── packages/my-skill/      # 实现层（npm 包）
├── skills/my-skill/        # skill 层（SKILL.md + scripts）
└── pnpm-workspace.yaml

# 发布态：build 后输出
bunx lythoskill build my-skill
# → dist/my-skill/
#   ├── SKILL.md
#   └── scripts/
```

## 边界与反模式

| 反模式 | 说明 |
|--------|------|
| **Fat Skill** | 把源码、依赖全塞进 skill 目录。导致 context window 膨胀，版本治理重复 |
| **全新 Registry** | 为 skills 自建包管理器。Maven WAR/EAR 的历史教训 |
| **Skill 里写实现** | SKILL.md 里塞大量代码。应该只描述意图，实现交给 npm/pip 包 |

## 生态兼容性

- ✅ OpenAI Codex Skills
- ✅ Microsoft Agent Framework
- ✅ Skilldex (arXiv:2604.16911)
- ✅ skills.sh 分发平台

## 相关

- ADR-20260423101938000: Thin Skill Pattern 决策记录
- EPIC-20260423102000000: lythoskill MVP 实现
