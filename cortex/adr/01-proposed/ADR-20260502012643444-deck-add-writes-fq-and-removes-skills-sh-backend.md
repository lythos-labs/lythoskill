# ADR-20260502012643444: `deck add` 写入 FQ + 删除 `--via skills.sh` 后端

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-05-02 | Source review of `add.ts:121-152` 暴露 5 处 bug |

## Context

`packages/lythoskill-deck/src/add.ts` 的 `deck add` 命令当前支持两个下载 backend：

1. **git clone**（默认）：clone 到 `<library>/<host>/<owner>/<repo>/`，验证 SKILL.md，写入 deck.toml
2. **`--via skills.sh`**：调用 vercel-labs/skills 的 `npx skills add` CLI，再尝试发现下载结果

源码审查（`add.ts:121-152`）发现 skills.sh backend 存在 5 处缺陷：

| # | 位置 | 问题 |
|---|------|------|
| 1 | `add.ts:127` | 调用 `npx skills add` 时未传 `parsed.skill`，导致 `--skill` 子选择能力失效 |
| 2 | `add.ts:131` | 使用 `-g` 全局 flag → vercel-labs/skills 写入 `~/.claude/skills/`（agent working set），与 lythoskill 的 library/working-set 分层冲突 |
| 3 | `add.ts:135-148` | 通过对比命令前后 `~/.claude/skills/` 的 readdir 快照来「猜」新装了什么——非确定性，多并发或预先存在条目时崩 |
| 4 | `add.ts:150` | 写入 deck.toml 时使用 bare `skillName`（违反 ADR-20260502012643244） |
| 5 | 整体 | 错误处理路径未覆盖 npx 退出非 0、SKILL.md 缺失、clone 失败等异常 |

进一步调研：

- **vercel-labs/skills 没有公开的 programmatic API**——CLI-only，内部通过 obuild 编译，不暴露稳定 import 入口（pre-compaction WebSearch 已确认）
- **能力与 git clone 完全重叠**：vercel-labs/skills 做的是 fetch GitHub repo + 复制 skills/ 目录到本地。这正是 lythoskill-deck 的 git clone path 已经实现的逻辑

skills.sh backend 的存在因此是「在已有工具上套一层更重的外壳」反模式（参见 ADR-20260502012643544 中 Maven 早期前端 wrapper 的反例）。User 的判断："这玩意很可能是 agent 手搓面条快速实现的结果。"

## 决策驱动

- 4 个 bug 集中在一个分支 → 删除该分支 = 一次性消除 4 个 bug
- 与 ADR-20260502012643244 (FQ-only) 联动：deck add 必须写 FQ，不能写 bare name
- 单一下载链路 = 单一异常路径 = 更小的维护表面
- 反对在 vercel-labs/skills 这种 CLI-only 包之上构建 wrapper，与 ADR-20260502012643544 立场一致

## Options Considered

### Option A: 修复 skills.sh backend 的 5 个 bug — Rejected
逐项修：传 `parsed.skill`、不用 `-g` flag、改用稳定的下载结果探测、写 FQ、补全错误处理。

- **Pros**: 保留「与 vercel-labs/skills 互操作」作为 marketing point
- **Cons**: vercel-labs/skills 内部为 obuild 产物，绑定其内部行为脆弱；该工具更新时 wrapper 必须跟进；与 git clone 能力 100% 重叠，无独占价值

### Option B: 删除 `--via skills.sh` 分支，git clone 是唯一下载路径 — Selected
`deck add` 解析输入后：

1. 解析 FQ locator（`host.tld/owner/repo/skill` 或 `host.tld/owner/repo`）
2. 计算 clone 目标：`<library>/<host>/<owner>/<repo>/`
3. 若目标已存在且为有效 git repo，跳过 clone
4. 否则 `git clone <url> <target>`
5. 验证 `SKILL.md` 存在（standalone）或 `skills/<skill>/SKILL.md` 存在（monorepo）
6. 写入 deck.toml 的 `[innate|tool|combo].skills` 列表，必为 FQ 字符串

vercel-labs/skills 用户的迁移路径：先手动 `npx skills add owner/repo`（写到 `~/.claude/skills/`），再手动复制到 library 后 `deck add <fq>`。或者更简单：直接 `deck add github.com/owner/repo/skill`，跳过 vercel-labs/skills。

## Decision

采用 Option B。

具体变更：

1. 删除 `add.ts:121-152` 整段 skills.sh backend
2. 删除 `--via skills.sh` 命令行 flag
3. 删除 README / SKILL.md 中关于 skills.sh backend 的描述
4. 在 README 「Comparison」段落补一句：「为什么不集成 vercel-labs/skills？因为它的能力与本工具的 git clone path 重叠（参见 ADR-20260502012643444）」
5. `deck add` 的输出 deck.toml 字符串遵循 ADR-20260502012643244（FQ-only）

## Consequences

### Positive
- 4 个 bug 一次性消失
- `add.ts` 简化约 30 行
- 单一下载链路，behavioral surface 更小
- 与 ADR-20260502012643544（反对 wrapper-style 包管理器）立场自洽

### Negative
- 失去「与 vercel-labs/skills 互操作」的 marketing point —— 但实测中该路径 4/5 bug 命中率几乎不可用
- 已有依赖 `--via skills.sh` 的脚本需要更新（公开使用案例不存在，因为该路径在多数场景下不工作）

### 后续
1. 同期与 ADR A/B 落地：`add.ts` 简化 + `findSource` 简化 + bootstrap 脚本
2. README 更新「Comparison」段落（参考 ADR-20260502012643544 的 Further Reading 入口）
3. 考虑做 `deck add --interactive`（CLI 内交互式选择 GitHub repo + skill subdir），完全不需要 vercel-labs/skills 中转

## Related
- ADR-20260502012643244（FQ-only locator）— deck add 写入的字符串必须 FQ
- ADR-20260502012643544（Skills as Flat Controllers）— 反对在已有工具之上做 wrapper
- ADR-20260423130348396（port skill manager into lythoskill ecosystem as deck governance）— 本 ADR 是该决策的延续
