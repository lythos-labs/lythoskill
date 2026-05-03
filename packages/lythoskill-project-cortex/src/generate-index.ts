#!/usr/bin/env bun
/**
 * 生成项目索引页面
 * 类似 Hexo 的归档功能
 * 适配时间戳 ID 格式 (PREFIX-yyyyMMddHHmmssSSS)
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkflowConfig } from './types.js';

interface TaskInfo {
  id: string;
  title: string;
  status: string;
  file: string;
}

interface EpicInfo {
  id: string;
  title: string;
  status: 'active' | 'done' | 'suspended' | 'archived';
  file: string;
}

interface AdrInfo {
  id: string;
  title: string;
  status: string;
  file: string;
}

// 时间戳 ID 正则: PREFIX- followed by 17 digits
const TS_PATTERN = /\d{17}/;

// 解析 Markdown 文件提取标题
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].replace(/TASK-\d{17}:|EPIC-\d{17}:|ADR-\d{17}:/, '').trim() : 'Untitled';
}

// 读取任务
function scanTasks(config: WorkflowConfig): TaskInfo[] {
  const tasks: TaskInfo[] = [];
  const dirs = [
    config.taskSubdirs.backlog,
    config.taskSubdirs.inProgress,
    config.taskSubdirs.review,
    config.taskSubdirs.completed,
    config.taskSubdirs.suspended,
    config.taskSubdirs.terminated,
    config.taskSubdirs.archived,
  ];

  for (const dir of dirs) {
    try {
      const files = readdirSync(join(config.tasksDir, dir))
        .filter(f => f.endsWith('.md') && f.startsWith('TASK-') && TS_PATTERN.test(f));

      for (const file of files) {
        const content = readFileSync(join(config.tasksDir, dir, file), 'utf-8');
        const id = file.match(/TASK-\d{17}/)?.[0] || '';
        const title = extractTitle(content);

        tasks.push({ id, title, status: dir, file });
      }
    } catch {
      // 目录不存在
    }
  }

  return tasks.sort((a, b) => a.id.localeCompare(b.id));
}

// 读取 Epic
function scanEpics(config: WorkflowConfig): EpicInfo[] {
  const epics: EpicInfo[] = [];

  const epicDirEntries: Array<{ subdir: string; status: EpicInfo['status'] }> = [
    { subdir: config.epicSubdirs.active, status: 'active' },
    { subdir: config.epicSubdirs.done, status: 'done' },
    { subdir: config.epicSubdirs.suspended, status: 'suspended' },
    { subdir: config.epicSubdirs.archived, status: 'archived' },
  ];

  for (const { subdir, status } of epicDirEntries) {
    if (!subdir) continue;
    try {
      const files = readdirSync(join(config.epicsDir, subdir))
        .filter(f => f.endsWith('.md') && f.startsWith('EPIC-') && TS_PATTERN.test(f));

      for (const file of files) {
        const content = readFileSync(join(config.epicsDir, subdir, file), 'utf-8');
        const id = file.match(/EPIC-\d{17}/)?.[0] || '';
        const title = extractTitle(content);

        epics.push({ id, title, status, file });
      }
    } catch {
      // 目录不存在
    }
  }

  return epics.sort((a, b) => a.id.localeCompare(b.id));
}

// 读取 ADR
function scanAdrs(config: WorkflowConfig): AdrInfo[] {
  const adrs: AdrInfo[] = [];
  const statusMap: Record<string, string> = {};

  // 扫描各状态目录
  for (const dir of [config.adrSubdirs.accepted, config.adrSubdirs.rejected, config.adrSubdirs.superseded]) {
    try {
      const files = readdirSync(join(config.adrDir, dir))
        .filter(f => f.endsWith('.md') && f.startsWith('ADR-') && TS_PATTERN.test(f));

      for (const file of files) {
        const id = file.match(/ADR-\d{17}/)?.[0] || '';
        statusMap[id] = dir;
      }
    } catch {
      // 目录不存在
    }
  }

  // 读取所有 ADR 文件（根目录 + 子目录）
  const allAdrDirs = [
    config.adrDir,
    join(config.adrDir, config.adrSubdirs.proposed),
    join(config.adrDir, config.adrSubdirs.accepted),
    join(config.adrDir, config.adrSubdirs.rejected),
    join(config.adrDir, config.adrSubdirs.superseded),
  ];

  for (const dir of allAdrDirs) {
    try {
      const files = readdirSync(dir)
        .filter(f => f.endsWith('.md') && f.startsWith('ADR-') && TS_PATTERN.test(f));

      for (const file of files) {
        const content = readFileSync(join(dir, file), 'utf-8');
        const id = file.match(/ADR-\d{17}/)?.[0] || '';
        const title = extractTitle(content);
        const status = statusMap[id] || config.adrSubdirs.proposed;

        adrs.push({ id, title, status, file });
      }
    } catch {
      // 目录不存在
    }
  }

  return adrs.sort((a, b) => a.id.localeCompare(b.id));
}

// 生成索引
function generateIndex(config: WorkflowConfig) {
  const tasks = scanTasks(config);
  const epics = scanEpics(config);
  const adrs = scanAdrs(config);

  const taskStats = {
    backlog: tasks.filter(t => t.status === config.taskSubdirs.backlog).length,
    inProgress: tasks.filter(t => t.status === config.taskSubdirs.inProgress).length,
    review: tasks.filter(t => t.status === config.taskSubdirs.review).length,
    completed: tasks.filter(t => t.status === config.taskSubdirs.completed).length,
    suspended: tasks.filter(t => t.status === config.taskSubdirs.suspended).length,
    terminated: tasks.filter(t => t.status === config.taskSubdirs.terminated).length,
  };

  const content = `# Project Index

> 自动生成于 ${new Date().toLocaleString('zh-CN')}

## 📊 概览

| 类型 | 总数 | 活跃/完成 |
|------|------|----------|
| Tasks | ${tasks.length} | 进行中: ${taskStats.inProgress}, 待验收: ${taskStats.review}, 已完成: ${taskStats.completed} |
| Epics | ${epics.length} | 活跃: ${epics.filter(e => e.status === 'active').length}, 已完成: ${epics.filter(e => e.status === 'done').length}, 悬置: ${epics.filter(e => e.status === 'suspended').length}, 已归档: ${epics.filter(e => e.status === 'archived').length} |
| ADRs | ${adrs.length} | 已接受: ${adrs.filter(a => a.status === config.adrSubdirs.accepted).length} |

---

## 📋 Epics

### 进行中

${epics.filter(e => e.status === 'active').map(e => `- **${e.id}**: ${e.title}`).join('\n') || '_无_'}

### 已完成

${epics.filter(e => e.status === 'done').map(e => `- ✅ **${e.id}**: ${e.title}`).join('\n') || '_无_'}

### 悬置

${epics.filter(e => e.status === 'suspended').map(e => `- ⏸️ **${e.id}**: ${e.title}`).join('\n') || '_无_'}

### 已归档

${epics.filter(e => e.status === 'archived').map(e => `- ~~${e.id}~~: ${e.title}`).join('\n') || '_无_'}

---

## 📄 Tasks

### 待办 (${taskStats.backlog})

${tasks.filter(t => t.status === config.taskSubdirs.backlog).map(t => `- [ ] **${t.id}**: ${t.title}`).join('\n') || '_无_'}

### 进行中 (${taskStats.inProgress})

${tasks.filter(t => t.status === config.taskSubdirs.inProgress).map(t => `- 🔄 **${t.id}**: ${t.title}`).join('\n') || '_无_'}

### 待验收 (${taskStats.review})

${tasks.filter(t => t.status === config.taskSubdirs.review).map(t => `- 🔍 **${t.id}**: ${t.title}`).join('\n') || '_无_'}

### 已完成 (${taskStats.completed})

${tasks.filter(t => t.status === config.taskSubdirs.completed).map(t => `- ✅ ~~${t.id}~~: ${t.title}`).join('\n') || '_无_'}

### 悬置 (${taskStats.suspended})

${tasks.filter(t => t.status === config.taskSubdirs.suspended).map(t => `- ⏸️ **${t.id}**: ${t.title}`).join('\n') || '_无_'}

### 终止 (${taskStats.terminated})

${tasks.filter(t => t.status === config.taskSubdirs.terminated).map(t => `- 🛑 ~~${t.id}~~: ${t.title}`).join('\n') || '_无_'}

---

## 🏛️ ADRs

${adrs.map(a => {
  const statusEmoji = {
    [config.adrSubdirs.accepted]: '✅',
    [config.adrSubdirs.rejected]: '❌',
    [config.adrSubdirs.superseded]: '📦',
    [config.adrSubdirs.proposed]: '🤔'
  }[a.status] || '⬜';
  return `- ${statusEmoji} **${a.id}** (${a.status}): ${a.title}`;
}).join('\n')}

---

*此文件由 generate-index.ts 自动生成*
`;

  writeFileSync('INDEX.md', content);
  console.log('✅ Generated INDEX.md');
}

// 生成 Wiki 索引
function generateWikiIndex(config: WorkflowConfig) {
  try {
    const patterns = readdirSync(join(config.wikiDir, config.wikiSubdirs.patterns)).filter(f => f.endsWith('.md'));
    const faqs = readdirSync(join(config.wikiDir, config.wikiSubdirs.faq)).filter(f => f.endsWith('.md'));
    const lessons = readdirSync(join(config.wikiDir, config.wikiSubdirs.lessons)).filter(f => f.endsWith('.md'));

    const content = `# Wiki Index

## 📚 Patterns (${patterns.length})

${patterns.map(p => `- [${p.replace('.md', '')}](./${config.wikiSubdirs.patterns}/${p})`).join('\n')}

## ❓ FAQ (${faqs.length})

${faqs.map(f => `- [${f.replace('.md', '')}](./${config.wikiSubdirs.faq}/${f})`).join('\n')}

## 📖 Lessons (${lessons.length})

${lessons.map(l => `- [${l.replace('.md', '')}](./${config.wikiSubdirs.lessons}/${l})`).join('\n')}

---

*自动生成*
`;

    writeFileSync(join(config.wikiDir, 'INDEX.md'), content);
    console.log(`✅ Generated ${join(config.wikiDir, 'INDEX.md')}`);
  } catch {
    console.log('⚠️  Wiki directory not found');
  }
}

export { generateIndex, generateWikiIndex };
