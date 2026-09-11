import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkflowConfig } from '../types.js';
import { read } from '../lib/status-history.js';

interface ColumnDef {
  key: string;
  label: string;
  wipLimit: number | null;
}

interface ColumnStats {
  column: string;
  count: number;
  avgAgeDays: number | null;
  wipLimit: number | null;
  atLimit: boolean;
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

function extractFirstDate(content: string): Date | null {
  // First data row of the canonical Status History table — the shape definition lives in
  // `lib/status-history.ts`, shared with `probe.ts` and the writer (`move.ts`).
  const rows = read(content);
  if (rows.length === 0) return null;
  const parsed = new Date(rows[0].date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function calculateAvgAge(files: string[]): number | null {
  if (files.length === 0) return null;

  const now = new Date();
  let totalDays = 0;
  let validCount = 0;

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const firstDate = extractFirstDate(content);
      if (firstDate) {
        const days = (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
        totalDays += days;
        validCount++;
      }
    } catch {
      // Skip unreadable files
    }
  }

  if (validCount === 0) return null;
  return Math.round(totalDays / validCount);
}

export function showFlow(config: WorkflowConfig): void {
  const columns: ColumnDef[] = [
    { key: 'backlog', label: 'backlog', wipLimit: null },
    { key: 'inProgress', label: 'in-progress', wipLimit: 5 },
    { key: 'review', label: 'review', wipLimit: 3 },
    { key: 'completed', label: 'completed', wipLimit: null },
  ];

  const stats: ColumnStats[] = [];

  for (const col of columns) {
    const subdirKey = col.key as keyof typeof config.taskSubdirs;
    const dir = join(config.tasksDir, config.taskSubdirs[subdirKey]);
    const files = scanDir(dir, 'TASK-');
    const avgAge = calculateAvgAge(files);

    const atLimit = col.wipLimit !== null && files.length >= col.wipLimit;

    stats.push({
      column: col.label,
      count: files.length,
      avgAgeDays: avgAge,
      wipLimit: col.wipLimit,
      atLimit,
    });
  }

  console.log('\n📊 Cumulative Flow (tasks)\n');
  console.log(`${'Column'.padEnd(12)} ${'Count'.padStart(6)} ${'Avg Age'.padStart(10)} ${'WIP Limit'.padStart(10)} ${'Status'.padStart(8)}`);
  console.log('-'.repeat(52));

  for (const s of stats) {
    const avgStr = s.avgAgeDays !== null ? `${s.avgAgeDays}d` : '-';
    const wipStr = s.wipLimit !== null ? `${s.wipLimit}` : (s.column === 'backlog' ? '∞' : '-');
    const status = s.atLimit ? '⚠️' : (s.column === 'backlog' || s.column === 'completed' ? '-' : '✅');
    console.log(`${s.column.padEnd(12)} ${String(s.count).padStart(6)} ${avgStr.padStart(10)} ${wipStr.padStart(10)} ${status.padStart(8)}`);
  }

  // Pull signal
  const inProgress = stats.find(s => s.column === 'in-progress');
  const review = stats.find(s => s.column === 'review');

  if (inProgress && inProgress.atLimit) {
    console.log(`\n⚠️  in-progress at WIP limit (${inProgress.wipLimit}). Stop pulling from backlog.`);
  } else if (review && review.atLimit) {
    console.log(`\n⚠️  review at WIP limit (${review.wipLimit}). Focus on clearing review.`);
  } else {
    console.log('\n✅ Pull signal: in-progress and review both have capacity.');
  }

  console.log('');
}
