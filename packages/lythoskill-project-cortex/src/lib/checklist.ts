/**
 * Interactive 5-question epic checklist (per ADR-20260503003315478, option E).
 * Soft gate: agent / human can answer y/n; any "no" prints a hint but the
 * epic is still created with `checklist_completed: true` only if all 5 pass.
 *
 * Non-TTY fallback: skip with a synthesized reason; caller decides what to do
 * (we expose runChecklist() returning a result struct, the CLI is responsible
 * for translating non-TTY into "skipped").
 */

import { createInterface } from 'node:readline';

export interface ChecklistResult {
  completed: boolean;
  /** When false, this is the question that the operator answered "no" to. */
  failedQuestion?: string;
}

const QUESTIONS: Array<{ id: string; prompt: string }> = [
  {
    id: 'outcome',
    prompt: '1. Outcome 明确: 这个 epic 完成时, 能用一句话说出 "X 已交付" 吗? (y/n) ',
  },
  {
    id: 'closeable',
    prompt: '2. 可结案性: 完成判据是可观测的吗? (y/n) ',
  },
  {
    id: 'size',
    prompt: '3. 迭代尺寸: 预计在 1~3 周内可以收尾吗? (y/n) ',
  },
  {
    id: 'not-task',
    prompt: '4. 不是 task: 是否需要 ≥3 张 task 才能完成? (y/n) ',
  },
  {
    id: 'not-adr',
    prompt: '5. 不是 ADR: 是产出而不是决策吗? (y/n) ',
  },
];

export function isTTY(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export async function runChecklist(): Promise<ChecklistResult> {
  if (!isTTY()) {
    // Caller should treat this as "skip required"; we surface a sentinel.
    return {
      completed: false,
      failedQuestion: '(non-TTY: cannot prompt — pass --skip-checklist "<reason>")',
    };
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> =>
    new Promise(resolve => rl.question(q, ans => resolve(ans.trim().toLowerCase())));

  console.log('\n📋 Epic granularity checklist (5 questions, per ADR-20260503003315478):');
  console.log('   Answer y to pass. Any "n" → consider whether this should be a task or ADR.\n');

  try {
    for (const q of QUESTIONS) {
      const ans = await ask(q.prompt);
      if (ans !== 'y' && ans !== 'yes') {
        return { completed: false, failedQuestion: q.id };
      }
    }
    return { completed: true };
  } finally {
    rl.close();
  }
}
