# 常见项目类型识别

## 类型 1: Daily Notes 型

**特征：**
- 有 `daily/` 目录
- 有 `skills/dev-logging/`
- AGENTS.md 提到 "Daily Notes"、"外化记忆"

**复盘重点：**
- 读最新 daily note
- 关注 ADR（架构决策）
- 关注 Pitfalls（坑点）
- 关注 Next 计划

## 类型 2: 红绿发布型

**特征：**
- 有 `skills/red-green-release/`
- 有 `archived-patches/` 目录
- 有 `pr-v*.sh` 文件

**复盘重点：**
- 看 archived-patches/ 了解历史版本
- 看最新 pr-v*.sh 了解当前变更
- 知道版本号规则

## 类型 3: 文档驱动型

**特征：**
- 有 `docs/` 目录（VitePress/Docusaurus 风格）
- 有 `docs/guide/`、`docs/api/`

**复盘重点：**
- 读 docs/guide/ 了解使用方式
- 读 docs/api/ 了解接口

## 类型 4: 纯代码型

**特征：**
- 无 AGENTS.md
- 无 daily/
- 只有 README.md 和代码

**复盘重点：**
- 读 README.md
- 读 package.json 了解技术栈
- 快速浏览目录结构
