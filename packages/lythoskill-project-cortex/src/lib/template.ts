/**
 * Markdown templates for Task, Epic, and ADR.
 * Zero external files — all templates are hardcoded strings.
 */

export function createTaskTemplate(id: string, title: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `# ${id}: ${title}

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| backlog | ${today} | Created |

## 背景与目标
<!-- 填写背景：为什么需要这个任务？解决什么问题？ -->

## 需求详情
- [ ] 需求1
- [ ] 需求2

## 技术方案
<!-- 填写实现方案、关键决策、参考资源 -->

## 验收标准
- [ ] 标准1
- [ ] 标准2

## 进度记录
<!-- 执行时更新，带时间戳 -->

## 关联文件
- 修改:
- 新增:

## Git 提交信息建议
\`\`\`
feat(scope): description (${id})

- Detail 1
- Detail 2
\`\`\`

## 备注
`;
}

export function createEpicTemplate(id: string, title: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `# ${id}: ${title}

> ${title}

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| active | ${today} | Created |

## 背景故事
<!-- 填写需求来源：触发事件、问题描述、目标价值 -->

## 需求树

### 主题A #backlog
- **触发**:
- **需求**:
- **实现**:
- **产出**:
- **验证**:

## 技术决策

| ADR | 标题 | 状态 |
|-----|------|------|

## 关联任务

| 任务 | 状态 | 描述 |
|------|------|------|

## 经验沉淀

## 归档条件
- [ ] 所有任务完成
- [ ] 验证通过
`;
}

export function createAdrTemplate(id: string, title: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `# ${id}: ${title}

## Status History
<!-- machine-parseable table: directory = current status, last row = latest record -->

| Status | Date | Note |
|--------|------|------|
| proposed | ${today} | Created |

## 背景
<!-- 问题描述和上下文 -->

## 决策驱动
-

## 选项

### 方案A
**优点**:
-

**缺点**:
-

### 方案B

## 决策
**选择**: 方案X

**原因**:

## 影响
- 正面:
- 负面:
- 后续:

## 相关
- 关联 ADR:
- 关联 Epic:
`;
}
