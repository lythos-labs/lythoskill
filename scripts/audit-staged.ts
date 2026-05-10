#!/usr/bin/env bun
/**
 * audit-staged — Agent QA audit for staged changes.
 *
 * Usage:
 *   bun scripts/audit-staged.ts              # advisory mode: P0 blocks, P1/P2 warn
 *   bun scripts/audit-staged.ts --strict     # all P0+P1 block
 *   bun scripts/audit-staged.ts --dry-run    # show what would run, don't execute
 *
 * Architecture:
 *   1. git diff --cached → extract changed files + diff content
 *   2. arena single --deck <qa-deck> --brief "<audit prompt + diff>" --player kimi
 *   3. Parse output for P0/P1/P2 findings
 *   4. Exit 0 (clean) or 1 (block)
 *
 * Dependencies: bun, git, lythoskill-arena
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ARENA_CLI = join(import.meta.dirname!, '..', 'packages', 'lythoskill-arena', 'src', 'cli.ts');
const QA_DECK = join(import.meta.dirname!, '..', 'playground', 'qa-audit-2026-05-10', 'skill-deck.toml');
const PROJECT_ROOT = join(import.meta.dirname!, '..');
const ARENA_OUT = join(import.meta.dirname!, '..', 'playground', 'qa-audit-2026-05-10', 'arena-output');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const dryRun = args.includes('--dry-run');

// ── Step 1: Collect staged changes ────────────────────────────────
const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' })
  .trim().split('\n').filter(Boolean);

if (stagedFiles.length === 0) {
  console.log('✅ No staged changes to audit');
  process.exit(0);
}

// Limit: only audit code files, skip binaries/lockfiles/docs
const codeFiles = stagedFiles.filter(f => /\.(ts|tsx|js|jsx|toml|yaml|yml|json|sh)$/.test(f));
if (codeFiles.length === 0) {
  console.log('✅ No code files in staged changes (skipping audit)');
  process.exit(0);
}

// Get the actual diff content (truncated to avoid overflow)
let diffContent = '';
try {
  diffContent = execSync('git diff --cached -- ' + codeFiles.join(' '), {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });
} catch {
  console.log('⚠️  Could not read diff — auditing files only');
}

// Truncate diff to reasonable size for agent context
const MAX_DIFF = 30000;
const diffPreview = diffContent.length > MAX_DIFF
  ? diffContent.slice(0, MAX_DIFF) + `\n... (${diffContent.length - MAX_DIFF} more bytes truncated)`
  : diffContent;

const fileList = codeFiles.slice(0, 30).join('\n');
const briefing = [
  `QA 审计 staged changes (${codeFiles.length} files):`,
  '',
  '变更文件:',
  fileList,
  '',
  'Diff 内容:',
  '```diff',
  diffPreview,
  '```',
  '',
  '要求:',
  '- 检查安全漏洞（注入、密钥泄露、不安全依赖、XSS）',
  '- 检查架构违规（跨包边界、接口不一致、CLI 约定违反）',
  '- 检查死代码和未使用导出',
  '- 每个发现标注严重级别: P0(阻塞)/P1(警告)/P2(建议)',
  '- 每个发现标注文件和行号',
  '- 仅报告真实问题，不报告误报',
  '- 如果没有发现问题，明确说"未发现需要阻塞的问题"',
].join('\n');

console.log(`🔍 Agent QA Audit — ${codeFiles.length} staged file(s)`);
console.log(`   mode: ${strict ? 'strict (P0+P1 block)' : 'advisory (P0 blocks)'}`);
console.log(`   files: ${codeFiles.slice(0, 5).join(', ')}${codeFiles.length > 5 ? ` +${codeFiles.length - 5} more` : ''}`);

if (dryRun) {
  console.log('\n📋 Would run:');
  console.log(`   arena single --deck ${QA_DECK} --player kimi --project ${PROJECT_ROOT}`);
  console.log(`   --brief "<audit prompt + diff (${diffPreview.length} chars)>"`);
  console.log(`   --out ${ARENA_OUT}`);
  process.exit(0);
}

// ── Step 2: Run arena single ─────────────────────────────────────
console.log('\n🤖 Spawning QA agent...\n');

const arenaCmd = [
  'bun', 'run', ARENA_CLI, 'single',
  '--deck', QA_DECK,
  '--player', 'kimi',
  '--project', PROJECT_ROOT,
  '--out', ARENA_OUT,
  '--brief', briefing,
].join(' ');

if (dryRun) {
  console.log(arenaCmd);
  process.exit(0);
}

let exitCode = 0;
try {
  execSync(arenaCmd, {
    encoding: 'utf-8',
    stdio: 'inherit',
    timeout: 300_000, // 5 minutes
    cwd: PROJECT_ROOT,
  });
} catch (e: any) {
  exitCode = e.status ?? 1;
}

// ── Step 3: Parse findings ────────────────────────────────────────
// After arena completes, try to parse output for P0/P1 counts
try {
  const outputDir = join(ARENA_OUT, 'single');
  const files = execSync(`ls -t "${outputDir}" 2>/dev/null || echo ""`, { encoding: 'utf-8' }).trim();
  if (files) {
    const latest = files.split('\n')[0];
    const reportPath = join(outputDir, latest, 'report.md');
    try {
      const report = readFileSync(reportPath, 'utf-8');
      const p0Count = (report.match(/P0[:\s]/g) || []).length;
      const p1Count = (report.match(/P1[:\s]/g) || []).length;

      console.log(`\n📊 Audit findings: P0=${p0Count}, P1=${p1Count}`);

      if (strict && (p0Count > 0 || p1Count > 0)) {
        console.log('❌ Strict mode: P0 or P1 findings block commit');
        process.exit(1);
      } else if (p0Count > 0) {
        console.log('⚠️  P0 findings detected — review before pushing');
        process.exit(1);
      } else {
        console.log('✅ No blocking findings');
      }
    } catch {
      console.log('⚠️  Could not parse audit report (arena may have failed)');
    }
  }
} catch {
  // Parsing is best-effort
}

process.exit(exitCode);
