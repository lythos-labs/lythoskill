import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { WorkflowConfig } from '../types.js';

interface ProbeResult {
  file: string;
  type: 'task' | 'epic' | 'adr';
  expectedStatus: string;
  lastHistoryLine: string | null;
  hasHistorySection: boolean;
  match: 'ok' | 'mismatch' | 'missing-history' | 'unclear';
  suggestion: string;
}

function scanDir(dir: string, prefix: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDir(fullPath, prefix));
    } else if (entry.name.endsWith('.md') && entry.name.startsWith(prefix)) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractStatusHistory(content: string): { lines: string[]; hasSection: boolean; singleStatus: string | null } {
  // 1. 优先查找 ## Status History section
  const sectionMatch = content.match(/##\s+Status\s+History\s*\n([\s\S]*?)(?=\n##\s+|\n#{1,2}\s|$)/i);
  if (sectionMatch) {
    const sectionContent = sectionMatch[1];
    const lines = sectionContent.split('\n').map(l => l.trim());

    // 1a. 尝试解析 Markdown 表格（第一列 = Status）
    const tableStatuses: string[] = [];
    let inTable = false;
    for (const line of lines) {
      if (line.startsWith('|')) {
        inTable = true;
        // 跳过分隔行 |---|---|
        if (/^\|[-\s|]+\|$/.test(line)) continue;
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length > 0 && cells[0].toLowerCase() !== 'status') {
          tableStatuses.push(cells[0]);
        }
      } else if (inTable && !line.startsWith('|')) {
        break;
      }
    }
    if (tableStatuses.length > 0) {
      return { lines: tableStatuses, hasSection: true, singleStatus: null };
    }

    // 1b. 回退到列表格式
    const listItems = lines
      .filter(l => l.startsWith('- ') || l.startsWith('* '))
      .map(l => l.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean);
    return { lines: listItems, hasSection: true, singleStatus: null };
  }

  // 2. 兼容旧格式 ## Status（单行状态）
  const statusMatch = content.match(/##\s+Status\s*\n\s*(\S[^\n]*)/i);
  if (statusMatch) {
    const status = statusMatch[1].trim();
    return { lines: [status], hasSection: true, singleStatus: status };
  }

  return { lines: [], hasSection: false, singleStatus: null };
}

function inferStatusFromPath(
  filePath: string,
  config: WorkflowConfig
): { type: 'task' | 'epic' | 'adr'; statusKey: string; statusLabel: string } | null {
  for (const [key, subdir] of Object.entries(config.taskSubdirs)) {
    if (filePath.includes(join(config.tasksDir, subdir))) {
      return { type: 'task', statusKey: key, statusLabel: subdir };
    }
  }
  for (const [key, subdir] of Object.entries(config.epicSubdirs)) {
    if (filePath.includes(join(config.epicsDir, subdir))) {
      return { type: 'epic', statusKey: key, statusLabel: subdir };
    }
  }
  for (const [key, subdir] of Object.entries(config.adrSubdirs)) {
    if (filePath.includes(join(config.adrDir, subdir))) {
      return { type: 'adr', statusKey: key, statusLabel: subdir };
    }
  }
  return null;
}

function checkMatch(expectedKey: string, lastHistory: string | null): { match: ProbeResult['match']; suggestion: string } {
  if (!lastHistory) {
    return {
      match: 'missing-history',
      suggestion: 'Status History 为空或无记录，无法验证。请人工确认真实状态并补充历史。',
    };
  }

  const normalized = lastHistory.toLowerCase();
  const expected = expectedKey.toLowerCase().replace(/-/g, ' ');

  // 直接包含期望状态
  if (normalized.includes(expected)) {
    return { match: 'ok', suggestion: '' };
  }

  // 初始状态允许 "Created"
  const initialStates = ['backlog', 'active', 'proposed'];
  if (initialStates.includes(expectedKey) && normalized.includes('created')) {
    return { match: 'ok', suggestion: '' };
  }

  // 检测是否包含其他明确状态词
  const statusKeywords = [
    'backlog', 'in progress', 'in-progress', 'review', 'completed', 'suspended',
    'terminated', 'archived', 'active', 'proposed', 'accepted', 'rejected', 'superseded',
  ];
  const detectedOther = statusKeywords.filter(
    s => s !== expected && normalized.includes(s)
  );

  if (detectedOther.length > 0) {
    return {
      match: 'mismatch',
      suggestion: `Status History 最后记录 "${lastHistory}" 与目录状态 "${expectedKey}" 不一致。请人工确认真实状态，然后决定：移动文件到正确目录，或更新 Status History。`,
    };
  }

  return {
    match: 'unclear',
    suggestion: `Status History 最后记录 "${lastHistory}" 无法明确对应目录状态 "${expectedKey}"。请人工确认真实状态。`,
  };
}

function probeFiles(files: string[], config: WorkflowConfig, type: 'task' | 'epic' | 'adr'): ProbeResult[] {
  const results: ProbeResult[] = [];

  for (const file of files) {
    const inferred = inferStatusFromPath(file, config);
    if (!inferred) continue;

    const content = readFileSync(file, 'utf-8');
    const { lines, hasSection, singleStatus } = extractStatusHistory(content);
    const lastHistoryLine = singleStatus ?? (lines.length > 0 ? lines[lines.length - 1] : null);

    const { match, suggestion } = checkMatch(inferred.statusKey, lastHistoryLine);

    results.push({
      file: relative(process.cwd(), file),
      type,
      expectedStatus: inferred.statusKey,
      lastHistoryLine,
      hasHistorySection: hasSection,
      match,
      suggestion,
    });
  }

  return results;
}

function printResults(results: ProbeResult[], label: string): void {
  const issues = results.filter(r => r.match !== 'ok');

  console.log(`\n${label}:`);

  if (results.length === 0) {
    console.log('  (none)');
    return;
  }

  for (const r of results) {
    const icon = r.match === 'ok' ? '✅' : r.match === 'mismatch' ? '❌' : r.match === 'missing-history' ? '⚠️' : '❓';
    console.log(`  ${icon} ${r.file}`);
    if (r.match !== 'ok') {
      console.log(`     → ${r.suggestion}`);
    }
  }

  if (issues.length > 0) {
    console.log(`\n  ⚠️  ${issues.length} 个问题需人工确认`);
  }
}

export function probeStatus(config: WorkflowConfig): void {
  console.log('\n🔍 Probing status consistency...\n');
  console.log('Rule: Directory location is the source of truth.');
  console.log('Status History inside files should reflect the latest move.\n');

  const taskFiles = [
    ...scanDir(join(config.tasksDir, config.taskSubdirs.backlog), 'TASK-'),
    ...scanDir(join(config.tasksDir, config.taskSubdirs.inProgress), 'TASK-'),
    ...scanDir(join(config.tasksDir, config.taskSubdirs.review), 'TASK-'),
    ...scanDir(join(config.tasksDir, config.taskSubdirs.completed), 'TASK-'),
    ...scanDir(join(config.tasksDir, config.taskSubdirs.suspended), 'TASK-'),
    ...scanDir(join(config.tasksDir, config.taskSubdirs.terminated), 'TASK-'),
    ...scanDir(join(config.tasksDir, config.taskSubdirs.archived), 'TASK-'),
  ];

  const epicFiles = [
    ...scanDir(join(config.epicsDir, config.epicSubdirs.active), 'EPIC-'),
    ...scanDir(join(config.epicsDir, config.epicSubdirs.archived), 'EPIC-'),
  ];

  const adrFiles = [
    ...scanDir(join(config.adrDir, config.adrSubdirs.proposed), 'ADR-'),
    ...scanDir(join(config.adrDir, config.adrSubdirs.accepted), 'ADR-'),
    ...scanDir(join(config.adrDir, config.adrSubdirs.rejected), 'ADR-'),
    ...scanDir(join(config.adrDir, config.adrSubdirs.superseded), 'ADR-'),
  ];

  const taskResults = probeFiles(taskFiles, config, 'task');
  const epicResults = probeFiles(epicFiles, config, 'epic');
  const adrResults = probeFiles(adrFiles, config, 'adr');

  printResults(taskResults, '📄 Tasks');
  printResults(epicResults, '📋 Epics');
  printResults(adrResults, '🏛️  ADRs');

  const allIssues = [...taskResults, ...epicResults, ...adrResults].filter(r => r.match !== 'ok');

  console.log('\n' + '─'.repeat(50));
  if (allIssues.length === 0) {
    console.log('✅ All clear! No inconsistencies found.');
  } else {
    console.log(`⚠️  Found ${allIssues.length} issue(s) requiring human confirmation.`);
    console.log('   Please review the items above and decide:');
    console.log('   - Move file to correct directory, OR');
    console.log('   - Update Status History inside the file.');
  }
  console.log('');
}
