/**
 * Markdown templates for Task, Epic, and ADR.
 * Task / ADR remain hardcoded strings; Epic is rendered from
 * `packages/lythoskill-project-cortex/templates/epic.md` so it can carry
 * frontmatter (lane / checklist) + the workflowy callout out of band.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

export interface EpicTemplateOptions {
  lane: 'main' | 'emergency';
  checklistCompleted: boolean;
  checklistSkippedReason?: string;
  laneOverrideReason?: string;
}

/** Locate the epic template file packaged alongside this CLI. */
function findEpicTemplatePath(): string {
  // src/lib/template.ts -> .../lythoskill-project-cortex/templates/epic.md
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, '..', '..', 'templates', 'epic.md'),
    resolve(here, '..', 'templates', 'epic.md'),
    // Fallback: when run from monorepo root, project layout
    resolve(process.cwd(), 'packages', 'lythoskill-project-cortex', 'templates', 'epic.md'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `Epic template not found. Looked in: ${candidates.join(', ')}`
  );
}

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

export function createEpicTemplate(
  id: string,
  title: string,
  options: EpicTemplateOptions
): string {
  const today = new Date().toISOString().split('T')[0];
  const templatePath = findEpicTemplatePath();
  const raw = readFileSync(templatePath, 'utf-8');

  const skipLine = options.checklistSkippedReason
    ? `checklist_skipped_reason: ${escapeYamlScalar(options.checklistSkippedReason)}\n`
    : '';
  const overrideLine = options.laneOverrideReason
    ? `lane_override_reason: ${escapeYamlScalar(options.laneOverrideReason)}\n`
    : '';

  return raw
    .replaceAll('{{LANE}}', options.lane)
    .replaceAll('{{CHECKLIST_COMPLETED}}', options.checklistCompleted ? 'true' : 'false')
    .replaceAll('{{CHECKLIST_SKIPPED_REASON_LINE}}', skipLine)
    .replaceAll('{{LANE_OVERRIDE_REASON_LINE}}', overrideLine)
    .replaceAll('{{ID}}', id)
    .replaceAll('{{TITLE}}', title)
    .replaceAll('{{DATE}}', today);
}

/** Quote a YAML scalar if it contains special characters. */
function escapeYamlScalar(value: string): string {
  // Simple heuristic: if the string is plain ASCII without YAML-significant chars, leave it alone.
  if (/^[\w一-龥][\w\s一-龥.,;()/+\-]*$/.test(value)) {
    return value;
  }
  // Otherwise, double-quote and escape backslash + double quote.
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
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
