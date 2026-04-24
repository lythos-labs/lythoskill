# ADR-20260424113917838: red-green-release heredoc migration patch design

## Status History

| Status | Date | Note |
|--------|------|------|
| proposed | 2026-04-24 | Created |

## 背景

在 AI 辅助开发中，agent 直接修改代码文件存在三个问题：

1. **不可 review**：agent 直接 `Edit` 文件，用户没有机会在应用前查看完整变更
2. **不可追溯**：修改散落在多轮对话中，没有一个统一的变更记录
3. **不可协作**：修改只在当前 agent session 中有效，无法让外部系统（web chat、另一个 agent、人类）参与生成 patch

传统的方案是 agent 生成 diff 或直接修改。但 diff 是**命令式**的（一步步修改），容易因上下文漂移而产生错误应用。

## 决策驱动

- **Flyway 迁移心智**：数据库迁移的核心洞察——用声明式 SQL 定义期望状态，而非命令式修改指令
- **Plan mode 对接**：用户验收前的 patch 应该沉淀在项目目录中，而非 agent 的私有记忆
- **分布式协作**：patch 的来源可以是 web chat、repomix、另一个 agent 或人类——来源无关，格式统一
- **确定性运维**：heredoc 整体替换是 idempotent 的，sed 替换不是

## 选项

### 方案A：sed / 命令式修改

agent 用 `sed` 或 `Edit` 工具逐步修改文件。

**优点**:
- 对现有文件改动小，只改需要改的部分
- 看起来"高效"

**缺点**:
- 上下文漂移导致 sed 匹配失败或改错位置
- 不是 idempotent，重复执行会出错
- 不可 review：用户看不到完整最终状态
- 不可协作：无法让外部系统生成 patch
- agent 私有空间里的一系列 Edit 操作，项目目录里留不下痕迹

### 方案B：heredoc / 声明式整体替换

每个 patch 是一个自包含的 shell 脚本，用 `cat > file << 'EOF'` 声明文件的期望状态。

**优点**:
- **声明式**：定义"文件应该长什么样"，而非"如何一步步修改"
- **Idempotent**：重复执行结果一致（覆盖写同一内容）
- **可 review**：patch 文件本身展示了完整最终状态
- **可协作**：任何系统都能生成 heredoc patch（web chat、repomix、人类手写）
- **沉淀在项目里**：patch 是项目目录中的实体文件，git tracked
- **和 plan mode 自然对接**：plan → patch 文件 → review → apply

**缺点**:
- 对大型文件的改动会重复写出未变更的部分
- 需要 touch + chmod +x 的额外步骤

## 决策

**选择**: 方案B（heredoc 声明式整体替换）

**原因**:

1. **Flyway 类比**：数据库迁移为什么用 `CREATE TABLE` 而不是 `ALTER TABLE` 序列？因为声明式定义了期望状态，不受当前状态影响。项目文件的 patch 同理——heredoc 写出完整文件 = `CREATE OR REPLACE`。

2. **分布式协作流验证**：
   ```
   web chat → 生成 heredoc patch → 用户复制
      ↓
   本地 shell: touch pr-20260424-xxx.sh → chmod +x → nano 粘贴
      ↓
   bash pr-20260424-xxx.sh → 应用 & 归档
   ```
   这个流程已经在实践中跑通。patch 来源可以是任何地方，格式统一即可。

3. **与 plan mode 对接**：agent 在 plan mode 中生成 patch 文件 → 用户 review patch 内容 → 确认后执行。patch 存在于项目目录中，不是 agent 的记忆片段。

4. **版本号用时间戳**：patch 之间是**偏序关系**（DAG），不是语义依赖。时间戳自然排序，无需人工维护 `x.y.z` 的语义含义。归档目录 `archived-patches/` 中的文件列表就是项目的变更历史。

## 影响

- 正面:
  - patch 可 review、可追溯、可回滚
  - 支持跨 agent / 跨平台的分布式协作
  - 和 plan mode 形成自然的"计划 → patch → 验收 → 归档"闭环
  - 减少 sed 类命令式修改引入的奇怪 bug

- 负面:
  - 大型文件的 patch 体积较大（写完整文件而非 diff）
  - 需要用户习惯"先生成 patch 文件再执行"的节奏

- 后续:
  - 在 SKILL.md 中将版本号格式从 `v{x.y.z}` 改为时间戳格式
  - 明确 patch 的"migration"心智：每个 patch 是项目状态的一次声明式迁移
  - **Patch 命名约束**：slug 描述"这次修改了什么"，禁止使用 `final` / `done` / `fix` 等预设成功的词。这些词会鼓励 LLM 在验证通过前就假定"这次一定能行"，跳过 red-green 测试步骤。
  - **复用 git commit graph 作为 DAG**：flyway 需要 `schema_version` 表记录哪些 migration 已执行，red-green-release 直接复用 git——归档目录存 patch 文件，git commit 存执行记录。回滚时 `git reset --hard <commit>` 即可，不需要额外维护状态表。
  - 考虑 patch 之间的依赖声明（类似 flyway 的 `V001` → `V002` 顺序）

## 相关

- 关联 ADR:
- 关联 Skill: lythoskill-red-green-release
- 关联实践: repomix 生成 patch、web chat → 本地 shell 工作流
