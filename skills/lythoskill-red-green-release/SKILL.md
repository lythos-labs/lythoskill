---
name: lythoskill-red-green-release
description: |
  红绿测试协作发布流程 — 强调用户验收、PR 归档和可回滚的前端项目迭代管理。

  使用场景：
  1. 功能开发/修复过程中，用户说"还有哪里不对"需要继续修改
  2. 用户说"我认为测试通过"、"LGTM"、"对了"、"就是这样"表示验收通过
  3. 需要创建带时间戳的 PR patch 文件（pr-<timestamp>-{desc}.sh）供 review
  4. 自动归档机制：执行后 patch 自动归档到 archived-patches/

  触发词："LGTM"、"对了"、"就是这样"、"我觉得ok"、"打tag"、"rollback"、"改坏了"

type: standard
---

# 红绿测试协作发布流程

## 核心原则

1. **用户验收驱动** — 必须等用户明确说"通过/LGTM/ok"才打 tag
2. **PR 归档** — 每个版本创建带时间戳的 patch 文件，执行后自动归档
3. **可回滚** — 每次修改前确保之前成果已提交，可随时 rollback

## 完整 Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: 规划（Plan Mode）                                   │
│  - 理解需求，创建 Plan 文件                                   │
│  - 用户确认设计思路                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: 创建 PR（Dry-run）                                  │
│  - 创建 pr-<timestamp>-{desc}.sh                             │
│  - 包含自归档逻辑                                             │
│  - 用户 review，确认"可以应用"                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: 应用 & 测试                                         │
│  - 执行 patch（自动备份 + 归档）                              │
│  - 重启服务，用户测试                                         │
│  - 如有问题，回到 Phase 2 创建新 patch                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: 验收 & 归档（用户说 LGTM/ok）                        │
│  - git add -A                                                 │
│  - git commit -m "{desc}"                                   │
│  - git tag -a {tag} -m "{desc}"                             │
│  - patch 已自动归档到 archived-patches/                       │
└─────────────────────────────────────────────────────────────┘
```

## PR 文件规范

### 命名格式

```
pr-<timestamp>-{description}.sh
```

示例：
- `pr-20260424-error-handling.sh`
- `pr-20260424-115823-mobile-layout.sh`
- `pr-20260425-dashboard-redesign.sh`

**命名约束**：
- `description` 必须描述"这次修改了什么"
- **禁止**使用 `final` / `done` / `fix` / `ok` 等预设成功的词。这些词会鼓励 LLM 在验证通过前就假定"这次一定能行"，跳过 red-green 测试步骤。

### 目录结构

```
project/
├── pr-20260424-error-handling.sh  # 当前待应用的 patch
├── archived-patches/              # 执行后自动归档
│   ├── pr-20260422-mobile-player.sh
│   ├── pr-20260423-fullscreen.sh
│   ├── pr-20260424-error-handling.sh
│   └── route.ts.20260423.bak      # 备份文件（时间戳）
```

### Patch 文件模板

```bash
#!/bin/bash
# PR: 20260424-{描述}

# 1. 创建归档目录
mkdir -p archived-patches

# 2. 备份当前版本（用于回滚）
cp src/xxx.ts "archived-patches/xxx.ts.$(date +%Y%m%d).bak"

# 3. 应用修改（声明式整体替换）
cat > src/xxx.ts << 'CODE'
# 新代码 — 完整文件内容
CODE

# 4. 自归档：复制到 archived-patches/ 并删除自身
cp "$0" "archived-patches/$(basename $0)"
rm "$0"

echo "✅ $(basename $0) 已应用并归档到 archived-patches/"
```

## 详细步骤

### Phase 1: 规划（Plan Mode）

1. 理解用户需求
2. 创建 Plan 文件（如需要）
3. 描述问题、方案、实施步骤
4. 用户确认设计思路

### Phase 2: 创建 PR

1. 创建 patch 文件：`pr-<timestamp>-{desc}.sh`
2. 包含：
   - 备份逻辑
   - 代码修改（声明式整体替换）
   - 自归档逻辑
3. 展示给用户 review
4. 等待确认"可以应用"

### Phase 3: 应用 & 测试

执行 patch：
```bash
bash pr-20260424-error-handling.sh
```

执行后会：
- 备份原文件到 `archived-patches/`
- 应用新代码（声明式整体替换）
- 自动归档 patch 文件
- 删除原 patch 文件

然后：
- 重启服务
- 用户测试
- 如有问题，创建新 patch 修复

### Phase 4: 验收 & Tag

**明确的验收信号：**
- "我认为测试通过"
- "LGTM"
- "对了"
- "就是这样"
- "我觉得ok"
- "可以打tag了"

听到后执行：
```bash
git add -A
git commit -m "{变更摘要}

- {详细变更点1}
- {详细变更点2}"

git tag -a {tag} -m "{变更摘要}"
```

## 回滚（Rollback）

当用户说"改坏了"时：

```bash
# 1. 查看归档目录
ls archived-patches/

# 2. 找到备份文件恢复
cp archived-patches/xxx.ts.20260423.bak src/xxx.ts

# 3. 或回滚到指定 tag
git reset --hard <tag>

# 4. 清理缓存
rm -rf .next node_modules/.cache

# 5. 重启
npm run dev
```

## 归档与追溯

### 规则
- patch 之间是**偏序关系**（DAG），不是语义依赖
- 时间戳自然排序，无需人工维护语义版本含义
- 归档目录 `archived-patches/` 中的文件列表就是项目变更历史

### 格式
```
pr-20260424-115823-error-handling.sh
pr-20260425-092145-mobile-layout.sh
```

## 典型对话流程

### 场景 1：正常迭代
```
用户：回放接口报错不友好
Agent：进入 Plan Mode，创建 Plan
用户：确认设计
Agent：创建 pr-20260424-error-handling.sh
用户：可以应用
Agent：执行 patch，重启
用户：测试，还有问题
Agent：创建 pr-20260424-error-handling-fix.sh
用户：对了/LGTM
Agent：git commit，打 tag 20260424-error-handling
```

### 场景 2：查看归档
```
用户：看看之前改了什么
Agent：ls archived-patches/
     pr-20260422-mobile-player.sh
     pr-20260423-fullscreen.sh
     pr-20260424-error-handling.sh
```

## 关键检查点

| 阶段 | 检查点 | 用户确认 |
|------|--------|----------|
| Plan | 设计思路 | "确认设计" |
| PR | patch 内容 | "可以应用" |
| 应用 | 功能测试 | "通过/LGTM" |
| 归档 | commit + tag | 完成 |

## 注意事项

1. **绝不自动打 tag** — 必须等用户明确说"ok/LGTM"
2. **每个迭代一个 patch** — 命名带时间戳，便于追溯
3. **自动归档** — 执行后 patch 自动归档，保持目录整洁
4. **备份原文件** — 每个 patch 都要备份，便于回滚
5. **禁止预设成功的词** — patch 描述里不要用 `final` / `done` / `fix`，避免跳过验证
