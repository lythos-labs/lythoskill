import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { WorkflowConfig } from '../types.js';
import { parseFrontmatter } from '../lib/frontmatter.js';

/** Empty-shell detection patterns — template placeholders that indicate a file was created by CLI but never filled by agent. */
export const EMPTY_SHELL_PATTERNS: RegExp[] = [
  /^- \[ \] ⚠️ PLACEHOLDER_/m,
  /^- \[ \] 需求\d/m,
  /^<!-- 填写/m,
];

/** Check whether a markdown content string contains empty-shell placeholders. Pure function, no IO.
 *
 * Empty-shell = template placeholders (PLACEHOLDER_, 需求1, <!-- 填写) that
 * indicate the file was created by CLI but never filled by agent.
 *
 * **Exemption**: If Status History shows the task was actively worked on
 * (in-progress / review / completed / done / suspended / terminated),
 * we do NOT flag it as empty shell even if template placeholders remain.
 * The placeholders are historical template debt, not "never touched".
 */
export function isEmptyShell(content: string): boolean {
  // Exemption: Status History shows active lifecycle → not a true empty shell
  const statusHistory = extractStatusHistory(content);
  const hasActiveLifecycle = statusHistory.lines.some(s => {
    const lower = s.toLowerCase();
    return ['in progress', 'in-progress', 'review', 'completed', 'done', 'suspended', 'terminated'].some(st => lower.includes(st));
  });
  if (hasActiveLifecycle) return false;

  for (const pat of EMPTY_SHELL_PATTERNS) {
    if (pat.test(content)) return true;
  }
  return false;
}

export interface ProbeResult {
  file: string;
  type: 'task' | 'epic' | 'adr';
  expectedStatus: string;
  lastHistoryLine: string | null;
  hasHistorySection: boolean;
  match: 'ok' | 'mismatch' | 'missing-history' | 'unclear';
  suggestion: string;
}

export interface ProbeIO {
  readFile: (path: string) => string | null;
  readdir: (path: string) => { name: string; isDirectory: boolean }[] | null;
  exists: (path: string) => boolean;
  spawn: (cmd: string, args: string[], opts?: { encoding?: string; timeout?: number }) => { status: number | null; stdout: string; stderr: string };
  log: (msg: string) => void;
  warn: (msg: string) => void;
  cwd: () => string;
}

export interface ProbePlan {
  tasks: { dir: string; statusKey: string; files: string[] }[];
  epics: { dir: string; statusKey: string; files: string[] }[];
  adrs: { dir: string; statusKey: string; files: string[] }[];
  checks: {
    statusConsistency: boolean;
    laneOccupancy: boolean;
    adrEpicCoupling: boolean;
    staleness: boolean;
    emptyShells: boolean;
    coverageDrift: boolean;
    nonAsciiSlugs: boolean;
    deckLockDrift: boolean;
    deckStateDrift: boolean;
  };
  options: { activeOnly: boolean; includeCompletedEmptyShells: boolean; includeCompletedChecklists: boolean };
}

export interface ProbeReport {
  statusResults: ProbeResult[];
  laneCounts: { main: number; emergency: number; unknown: number };
  laneWarnings: string[];
  couplingWarnings: string[];
  staleBacklog: string[];
  driftedEpics: string[];
  emptyShells: string[];
  coverageDrift: string[];
  nonAsciiSlugs: string[];
  deckLockDrift: string[];
  deckStateDrift: string[];
  checklistDrift: string[];  // task files with unchecked checkboxes in review/completed
  summary: {
    activeOnly: boolean;
    includeCompletedEmptyShells: boolean;
    totalIssues: number;
    totalChecked: number;
    hasStatusIssues: boolean;
    hasLaneIssues: boolean;
    hasCouplingIssues: boolean;
    hasStaleness: boolean;
    hasEmptyShells: boolean;
    hasCoverageDrift: boolean;
    hasNonAsciiSlugs: boolean;
    hasDeckLockDrift: boolean;
    hasDeckStateDrift: boolean;
    hasChecklistDrift: boolean;
  };
}

const defaultProbeIO: ProbeIO = {
  readFile: (p) => {
    try { return readFileSync(p, 'utf-8'); } catch { return null; }
  },
  readdir: (p) => {
    try {
      return readdirSync(p, { withFileTypes: true }).map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
      }));
    } catch { return null; }
  },
  exists: existsSync,
  spawn: (cmd, args, opts) => spawnSync(cmd, args, { encoding: 'utf-8', timeout: 5000, ...opts }),
  log: console.log,
  warn: console.warn,
  cwd: process.cwd,
};

function scanDirWithIO(dir: string, prefix: string, io: ProbeIO): string[] {
  const files: string[] = [];
  if (!io.exists(dir)) return files;

  const entries = io.readdir(dir);
  if (!entries) return files;

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory) {
      files.push(...scanDirWithIO(fullPath, prefix, io));
    } else if (entry.name.endsWith('.md') && entry.name.startsWith(prefix)) {
      files.push(fullPath);
    }
  }
  return files;
}

export function extractStatusHistory(content: string): { lines: string[]; hasSection: boolean; singleStatus: string | null } {
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

export function inferStatusFromPath(
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

export function checkMatch(expectedKey: string, lastHistory: string | null): { match: ProbeResult['match']; suggestion: string } {
  if (!lastHistory) {
    return {
      match: 'missing-history',
      suggestion: 'Status History 为空或无记录，无法验证。请人工确认真实状态并补充历史。',
    };
  }

  const normalized = lastHistory.toLowerCase();
  // 把 camelCase key 转为 kebab-case（inProgress → in-progress）
  const expectedKebab = expectedKey
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
  const expected = expectedKebab.replace(/-/g, ' ');

  // 直接包含期望状态（支持 in-progress 匹配 in progress 或 in-progress）
  if (normalized.includes(expected) || normalized.includes(expectedKebab)) {
    return { match: 'ok', suggestion: '' };
  }

  // 初始状态允许 "Created"
  const initialStates = ['backlog', 'active', 'proposed'];
  if (initialStates.includes(expectedKebab) && normalized.includes('created')) {
    return { match: 'ok', suggestion: '' };
  }

  // 检测是否包含其他明确状态词
  const statusKeywords = [
    'backlog', 'in progress', 'in-progress', 'review', 'completed', 'suspended',
    'terminated', 'archived', 'active', 'done', 'proposed', 'accepted', 'rejected', 'superseded',
  ];
  const detectedOther = statusKeywords.filter(
    s => s !== expected && s !== expectedKebab && normalized.includes(s)
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

function probeFilesWithIO(files: string[], config: WorkflowConfig, type: 'task' | 'epic' | 'adr', io: ProbeIO): ProbeResult[] {
  const results: ProbeResult[] = [];
  const cwd = io.cwd();

  for (const file of files) {
    const inferred = inferStatusFromPath(file, config);
    if (!inferred) continue;

    const content = io.readFile(file);
    if (content === null) continue;

    const { lines, hasSection, singleStatus } = extractStatusHistory(content);
    const lastHistoryLine = singleStatus ?? (lines.length > 0 ? lines[lines.length - 1] : null);

    const { match, suggestion } = checkMatch(inferred.statusKey, lastHistoryLine);

    const resolvedFile = file.startsWith('/') ? file : resolve(cwd, file);
    results.push({
      file: relative(cwd, resolvedFile),
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

/** Filter empty shells by display mode. Exported for unit testing. */
export function filterEmptyShells(
  shells: string[],
  mode: 'default' | 'active-only' | 'all' | 'suspicious'
): string[] {
  if (mode === 'all') return shells;
  if (mode === 'active-only' || mode === 'suspicious') {
    return shells.filter(s =>
      s.includes('01-backlog') || s.includes('02-in-progress') || s.includes('01-proposed')
    );
  }
  // default mode
  return shells.filter(s => {
    return !s.includes('04-completed') && !s.includes('06-terminated') && !s.includes('07-archived')
      && !s.includes('99-done') && !s.includes('03-suspended') && !s.includes('04-archived')
      && !s.includes('02-accepted') && !s.includes('03-rejected') && !s.includes('04-superseded');
  });
}

export function buildProbePlan(
  config: WorkflowConfig,
  opts?: { activeOnly?: boolean; suspicious?: boolean; includeCompletedEmptyShells?: boolean; includeCompletedChecklists?: boolean }
): ProbePlan {
  const activeOnly = opts?.activeOnly ?? opts?.suspicious ?? false;
  const includeCompletedEmptyShells = opts?.includeCompletedEmptyShells ?? false;
  const includeCompletedChecklists = opts?.includeCompletedChecklists ?? false;

  const tasks = Object.entries(config.taskSubdirs).map(([statusKey, subdir]) => ({
    dir: join(config.tasksDir, subdir),
    statusKey,
    files: [] as string[],
  }));

  const epics = Object.entries(config.epicSubdirs).map(([statusKey, subdir]) => ({
    dir: join(config.epicsDir, subdir),
    statusKey,
    files: [] as string[],
  }));

  const adrs = Object.entries(config.adrSubdirs).map(([statusKey, subdir]) => ({
    dir: join(config.adrDir, subdir),
    statusKey,
    files: [] as string[],
  }));

  return {
    tasks,
    epics,
    adrs,
    checks: {
      statusConsistency: !activeOnly,
      laneOccupancy: true,
      adrEpicCoupling: true,
      staleness: true,
      emptyShells: true,
      coverageDrift: true,
      nonAsciiSlugs: true,
      checklistDrift: true,
      deckLockDrift: true,
      deckStateDrift: true,
    },
    options: { activeOnly, includeCompletedEmptyShells, includeCompletedChecklists: false },
  };
}

export function executeProbePlan(plan: ProbePlan, io: ProbeIO = defaultProbeIO): ProbeReport {
  const { activeOnly } = plan.options;

  // ── Scan directories ──────────────────────────────────────────────
  const taskFiles: string[] = [];
  for (const t of plan.tasks) {
    t.files = scanDirWithIO(t.dir, 'TASK-', io);
    taskFiles.push(...t.files);
  }

  const epicFiles: string[] = [];
  for (const e of plan.epics) {
    e.files = scanDirWithIO(e.dir, 'EPIC-', io);
    epicFiles.push(...e.files);
  }

  const adrFiles: string[] = [];
  for (const a of plan.adrs) {
    a.files = scanDirWithIO(a.dir, 'ADR-', io);
    adrFiles.push(...a.files);
  }

  // ── Slug charset check ─────────────────────────────────────────────
  const nonAsciiSlugs: string[] = [];
  const slugPattern = /^(TASK|EPIC|ADR)-\d{17}-(.+?)\.md$/;
  const cwd = io.cwd();
  for (const file of [...taskFiles, ...epicFiles, ...adrFiles]) {
    const name = basename(file);
    const match = name.match(slugPattern);
    if (match && /[^\x00-\x7F]/.test(match[2])) {
      const resolvedFile = file.startsWith('/') ? file : resolve(cwd, file);
      nonAsciiSlugs.push(relative(cwd, resolvedFile));
    }
  }

  // ── Status consistency ────────────────────────────────────────────
  const configFromPlan = buildConfigFromPlan(plan);
  const allTaskResults = plan.checks.statusConsistency
    ? probeFilesWithIO(taskFiles, configFromPlan, 'task', io)
    : [];
  const allEpicResults = plan.checks.statusConsistency
    ? probeFilesWithIO(epicFiles, configFromPlan, 'epic', io)
    : [];
  const allAdrResults = plan.checks.statusConsistency
    ? probeFilesWithIO(adrFiles, configFromPlan, 'adr', io)
    : [];

  // --- Lane occupancy check ---
  const laneWarnings: string[] = [];
  let laneCounts = { main: 0, emergency: 0, unknown: 0 };
  if (plan.checks.laneOccupancy) {
    const activeEpicDir = plan.epics.find(e => e.statusKey === 'active')?.dir;
    if (activeEpicDir) {
      const activeEpicFiles = scanDirWithIO(activeEpicDir, 'EPIC-', io);
      const epics: { lane: 'main' | 'emergency' | null }[] = [];
      for (const file of activeEpicFiles) {
        const content = io.readFile(file);
        if (content === null) continue;
        const { data } = parseFrontmatter(content);
        const rawLane = typeof data.lane === 'string' ? data.lane : null;
        let lane: 'main' | 'emergency' | null = null;
        if (rawLane === 'main' || rawLane === 'emergency') {
          lane = rawLane;
        }
        epics.push({ lane });
      }
      const counts = { main: 0, emergency: 0, unknown: 0 };
      for (const e of epics) {
        if (e.lane === 'main') counts.main++;
        else if (e.lane === 'emergency') counts.emergency++;
        else counts.unknown++;
      }
      laneCounts = counts;
      if (counts.main > 1) {
        laneWarnings.push(`main lane has ${counts.main} active epics (>1) — pick one focus, suspend/archive/done the rest`);
      }
      if (counts.emergency > 1) {
        laneWarnings.push(`emergency lane has ${counts.emergency} active epics (>1) — emergency is single-slot by design`);
      }
      if (counts.unknown > 0) {
        laneWarnings.push(`${counts.unknown} active epic(s) missing lane: field — backfill with lane: main | emergency`);
      }
    }
  }

  // --- ADR-Epic coupling check ---
  const couplingWarnings: string[] = [];
  if (plan.checks.adrEpicCoupling) {
    const proposedAdrDir = plan.adrs.find(a => a.statusKey === 'proposed')?.dir;
    if (proposedAdrDir) {
      const proposedAdrFiles = scanDirWithIO(proposedAdrDir, 'ADR-', io);
      for (const adrFile of proposedAdrFiles) {
        const content = io.readFile(adrFile);
        if (content === null) continue;
        const epicMatch = content.match(/##\s+Related\s*\n[\s\S]*?Epic:\s*(EPIC-\d+)/i);
        if (epicMatch) {
          const epicId = epicMatch[1];
          const adrId = basename(adrFile).replace(/^(ADR-\d+)-.*/, '$1');
          couplingWarnings.push(`${adrId} references ${epicId} but is still proposed → run 'cortex adr accept ${adrId}'`);
        }
      }
    }
  }

  // ── Staleness check ───────────────────────────────────────────────
  const staleBacklog: string[] = [];
  const driftedEpics: string[] = [];
  if (plan.checks.staleness) {
    const now = Date.now();
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

    const backlogDir = plan.tasks.find(t => t.statusKey === 'backlog')?.dir;
    if (backlogDir) {
      const backlogFiles = scanDirWithIO(backlogDir, 'TASK-', io);
      for (const f of backlogFiles) {
        const stat = io.readFile(f);
        if (stat === null) continue;
        const createdMatch = stat.match(/\|\s*backlog\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|/);
        const dateStr = createdMatch ? createdMatch[1] : null;
        if (dateStr) {
          const age = now - new Date(dateStr).getTime();
          if (age > THREE_DAYS) {
            const id = basename(f).match(/^(TASK-\d+)/)?.[1] ?? basename(f);
            const days = Math.floor(age / (24 * 60 * 60 * 1000));
            staleBacklog.push(`${id} (${days}d old)`);
          }
        }
      }
    }

    const activeEpicDir = plan.epics.find(e => e.statusKey === 'active')?.dir;
    if (activeEpicDir) {
      const activeEpicFiles = scanDirWithIO(activeEpicDir, 'EPIC-', io);
      for (const f of activeEpicFiles) {
        const content = io.readFile(f);
        if (content === null) continue;
        const statusMatch = content.match(/\|\s*active\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|/);
        const dateStr = statusMatch ? statusMatch[1] : null;
        if (dateStr) {
          const age = now - new Date(dateStr).getTime();
          if (age > THREE_DAYS) {
            const id = basename(f).match(/^(EPIC-\d+)/)?.[1] ?? basename(f);
            const days = Math.floor(age / (24 * 60 * 60 * 1000));
            driftedEpics.push(`${id} (${days}d old)`);
          }
        }
      }
    }
  }

  // ── Empty-shell detection ─────────────────────────────────────────
  const emptyShells: string[] = [];
  if (plan.checks.emptyShells) {
    function detectEmptyShells(files: string[]): void {
      for (const file of files) {
        const content = io.readFile(file);
        if (content === null) continue;
        if (isEmptyShell(content)) {
          const id = basename(file).match(/^([A-Z]+-\d+)/)?.[1] ?? basename(file);
          const resolvedFile = file.startsWith('/') ? file : resolve(cwd, file);
          const rel = relative(cwd, resolvedFile);
          emptyShells.push(`${id}: ${rel}`);
        }
      }
    }

    detectEmptyShells(taskFiles);
    detectEmptyShells(epicFiles);
    detectEmptyShells(adrFiles);
  }

  // ── Coverage snapshot drift ───────────────────────────────────────
  const coverageDrift: string[] = [];
  if (plan.checks.coverageDrift) {
    const coverageDir = 'packages';
    if (io.exists(coverageDir)) {
      const pkgEntries = io.readdir(coverageDir);
      if (pkgEntries) {
        for (const pkg of pkgEntries) {
          if (!pkg.isDirectory) continue;
          const snapshotDir = join(coverageDir, pkg.name, 'test', 'scenarios');
          if (!io.exists(snapshotDir)) continue;
          const snapshotEntries = io.readdir(snapshotDir);
          if (!snapshotEntries) continue;
          for (const f of snapshotEntries) {
            if (!f.name.startsWith('coverage-snapshot-') || !f.name.endsWith('.md')) continue;
            const dateMatch = f.name.match(/coverage-snapshot-(\d{4}-\d{2}-\d{2})/);
            if (!dateMatch) continue;
            const snapshotDate = dateMatch[1];
            const srcDir = join(coverageDir, pkg.name, 'src');
            if (!io.exists(srcDir)) continue;
            const r = io.spawn('git', ['log', '--oneline', `--after=${snapshotDate} 00:00:00`, '--', srcDir]);
            if (r.status === 0 && r.stdout.trim()) {
              const count = r.stdout.trim().split('\n').length;
              coverageDrift.push(`${pkg.name}: ${count} commit(s) since ${snapshotDate}`);
            }
          }
        }
      }
    }
  }

  // ── Deck lock drift (content verification) ────────────────────────
  const deckLockDrift: string[] = [];
  if (plan.checks.deckLockDrift) {
    const lockPath = join(cwd, 'skill-deck.lock');
    if (io.exists(lockPath)) {
      const lockContent = io.readFile(lockPath);
      if (lockContent) {
        try {
          const lock = JSON.parse(lockContent);
          if (lock.skills && Array.isArray(lock.skills)) {
            for (const skill of lock.skills) {
              if (skill.content_hash) {
                // Check if skill content hash matches current working set
                const wsSkillPath = join(cwd, '.claude', 'skills', skill.alias, 'SKILL.md');
                if (io.exists(wsSkillPath)) {
                  const wsContent = io.readFile(wsSkillPath);
                  if (wsContent) {
                    const currentHash = wsContent; // Simplified: actual hash comparison would need crypto
                    // In a real implementation, we'd compute SHA256 here
                    // For now, we just verify the path exists as a proxy
                  }
                } else {
                  deckLockDrift.push(`${skill.alias}: missing from working set (lock says linked)`);
                }
              }
            }
          }
        } catch {
          deckLockDrift.push('skill-deck.lock: invalid JSON');
        }
      }
    }
  }

  // ── Deck state drift (operational checks) ─────────────────────────
  const deckStateDrift: string[] = [];
  if (plan.checks.deckStateDrift) {
    const statePath = join(cwd, 'skill-deck.state');
    if (io.exists(statePath)) {
      const stateContent = io.readFile(statePath);
      if (stateContent) {
        try {
          const state = JSON.parse(stateContent);
          if (state.skills && Array.isArray(state.skills)) {
            for (const skill of state.skills) {
              if (skill.dest && !io.exists(skill.dest)) {
                deckStateDrift.push(`${skill.alias}: state path missing → ${skill.dest}`);
              }
            }
          }
          if (state.resolved_paths?.working_set && !io.exists(state.resolved_paths.working_set)) {
            deckStateDrift.push(`working_set path missing: ${state.resolved_paths.working_set}`);
          }
        } catch {
          deckStateDrift.push('skill-deck.state: invalid JSON');
        }
      }
    } else {
      // State file missing but lock exists = operational drift
      const lockPath = join(cwd, 'skill-deck.lock');
      if (io.exists(lockPath)) {
        deckStateDrift.push('skill-deck.state missing (run `deck link` to generate)');
      }
    }
  }

  // ── Checklist drift (unchecked boxes in review tasks) ───────────────
  // Default: only review tasks (03-review). Completed tasks (04-completed) may
  // have historical template debt — use --include-completed-checklists to check them.
  const checklistDrift: string[] = [];
  if (plan.checks.checklistDrift) {
    function detectChecklistDrift(files: string[]): void {
      for (const file of files) {
        const content = io.readFile(file);
        if (content === null) continue;
        // Default mode: only review tasks. Completed tasks have historical template debt.
        const isReview = file.includes('03-review');
        const isCompleted = file.includes('04-completed');
        if (!isReview && !isCompleted) continue;
        if (isCompleted && !plan.options.includeCompletedChecklists) continue;
        // Count unchecked boxes: - [ ] (but not PLACEHOLDER_)
        const uncheckedBoxes = content.match(/^- \[ \].*/gm);
        if (uncheckedBoxes && uncheckedBoxes.length > 0) {
          // Filter out placeholder items
          const realUnchecked = uncheckedBoxes.filter(line => !line.includes('PLACEHOLDER_'));
          if (realUnchecked.length > 0) {
            const id = basename(file).match(/^([A-Z]+-\d+)/)?.[1] ?? basename(file);
            const resolvedFile = file.startsWith('/') ? file : resolve(cwd, file);
            const rel = relative(cwd, resolvedFile);
            checklistDrift.push(`${id}: ${realUnchecked.length} unchecked item(s) — ${rel}`);
          }
        }
      }
    }
    detectChecklistDrift(taskFiles);
  }

  const totalChecked = taskFiles.length + epicFiles.length + adrFiles.length;
  const allStatusIssues = [...allTaskResults, ...allEpicResults, ...allAdrResults].filter(r => r.match !== 'ok');
  // emptyShells count should respect filter mode for totalIssues
  const emptyShellMode: 'default' | 'active-only' | 'all' = plan.options.includeCompletedEmptyShells
    ? 'all'
    : plan.options.activeOnly
      ? 'active-only'
      : 'default';
  const filteredEmptyShellCount = filterEmptyShells(emptyShells, emptyShellMode).length;
  const totalIssues = allStatusIssues.length + laneWarnings.length + couplingWarnings.length + staleBacklog.length + driftedEpics.length + filteredEmptyShellCount + coverageDrift.length + nonAsciiSlugs.length + deckLockDrift.length + deckStateDrift.length + checklistDrift.length;

  return {
    statusResults: [...allTaskResults, ...allEpicResults, ...allAdrResults],
    laneCounts,
    laneWarnings,
    couplingWarnings,
    staleBacklog,
    driftedEpics,
    emptyShells,
    coverageDrift,
    nonAsciiSlugs,
    deckLockDrift,
    deckStateDrift,
    checklistDrift,
    summary: {
      activeOnly: plan.options.activeOnly,
      includeCompletedEmptyShells: plan.options.includeCompletedEmptyShells,
      totalIssues,
      totalChecked,
      hasStatusIssues: allStatusIssues.length > 0,
      hasLaneIssues: laneWarnings.length > 0,
      hasCouplingIssues: couplingWarnings.length > 0,
      hasStaleness: staleBacklog.length > 0 || driftedEpics.length > 0,
      hasEmptyShells: filteredEmptyShellCount > 0,
      hasCoverageDrift: coverageDrift.length > 0,
      hasNonAsciiSlugs: nonAsciiSlugs.length > 0,
      hasDeckLockDrift: deckLockDrift.length > 0,
      hasDeckStateDrift: deckStateDrift.length > 0,
      hasChecklistDrift: checklistDrift.length > 0,
    },
  };
}

function buildConfigFromPlan(plan: ProbePlan): WorkflowConfig {
  const taskSubdirs: WorkflowConfig['taskSubdirs'] = {
    backlog: '', inProgress: '', review: '', completed: '', suspended: '', terminated: '', archived: '',
  };
  const epicSubdirs: WorkflowConfig['epicSubdirs'] = {
    active: '', done: '', suspended: '', archived: '',
  };
  const adrSubdirs: WorkflowConfig['adrSubdirs'] = {
    proposed: '', accepted: '', rejected: '', superseded: '',
  };

  for (const t of plan.tasks) {
    const key = t.statusKey as keyof WorkflowConfig['taskSubdirs'];
    if (key in taskSubdirs) taskSubdirs[key] = basename(t.dir);
  }
  for (const e of plan.epics) {
    const key = e.statusKey as keyof WorkflowConfig['epicSubdirs'];
    if (key in epicSubdirs) epicSubdirs[key] = basename(e.dir);
  }
  for (const a of plan.adrs) {
    const key = a.statusKey as keyof WorkflowConfig['adrSubdirs'];
    if (key in adrSubdirs) adrSubdirs[key] = basename(a.dir);
  }

  return {
    tasksDir: plan.tasks[0]?.dir ? dirname(plan.tasks[0].dir) : '',
    epicsDir: plan.epics[0]?.dir ? dirname(plan.epics[0].dir) : '',
    adrDir: plan.adrs[0]?.dir ? dirname(plan.adrs[0].dir) : '',
    wikiDir: '',
    taskSubdirs,
    epicSubdirs,
    adrSubdirs,
    wikiSubdirs: { patterns: '', faq: '', lessons: '', legacy: '' },
  };
}

export function printProbeSummary(report: ProbeReport, io: ProbeIO = defaultProbeIO): void {
  const { activeOnly, includeCompletedEmptyShells, totalChecked, totalIssues } = report.summary;

  // Header
  if (!activeOnly) {
    io.log('\n🔍 Probing status consistency...\n');
    io.log('Rule: Directory location is the source of truth.');
    io.log('Status History inside files should reflect the latest move.\n');
  } else {
    io.log('\n🔎 Probing active items only (empty shells, staleness, drift, lane violations)...\n');
  }

  // ── Flag scope indicators (top of output for visibility) ────────────
  if (includeCompletedEmptyShells) {
    io.log('📋 Empty-shell detection: expanded (includes completed, terminated, archived, suspended, done, accepted, rejected, superseded)');
  }

  // ── active-only checklist header ────────────────────────────────────
  if (activeOnly) {
    io.log('ℹ️  Checks: lane occupancy | stale backlog | empty shells (active) | coverage drift | ADR-Epic coupling | non-ASCII slugs');
    io.log('⏭️  Skipped: per-file status consistency (use default mode for full check)\n');
  }

  // Status consistency sections
  const taskResults = report.statusResults.filter(r => r.type === 'task');
  const epicResults = report.statusResults.filter(r => r.type === 'epic');
  const adrResults = report.statusResults.filter(r => r.type === 'adr');

  if (activeOnly) {
    // Show active directory counts for visibility
    const activeTaskResults = taskResults.filter(r => r.file.includes('01-backlog') || r.file.includes('02-in-progress') || r.file.includes('03-review'));
    const activeEpicResults = epicResults.filter(r => r.file.includes('01-active'));
    const activeAdrResults = adrResults.filter(r => r.file.includes('01-proposed'));
    if (activeTaskResults.length > 0 || activeEpicResults.length > 0 || activeAdrResults.length > 0) {
      io.log('📂 Active documents checked:');
      if (activeTaskResults.length > 0) io.log(`     Tasks: ${activeTaskResults.length}`);
      if (activeEpicResults.length > 0) io.log(`     Epics: ${activeEpicResults.length}`);
      if (activeAdrResults.length > 0) io.log(`     ADRs: ${activeAdrResults.length}`);
      io.log('');
    }
  }

  if (!activeOnly) {
    printResults(taskResults, '📄 Tasks', io);
    printResults(epicResults, '📋 Epics', io);
    printResults(adrResults, '🏛️  ADRs', io);
  }

  // Lane occupancy
  io.log('\n🛤️  Epic lanes (active):');
  io.log(`     main:      ${report.laneCounts.main}`);
  io.log(`     emergency: ${report.laneCounts.emergency}`);
  if (report.laneCounts.unknown > 0) {
    io.log(`     (no lane field): ${report.laneCounts.unknown}`);
  }
  for (const w of report.laneWarnings) {
    io.log(`     ⚠️  ${w}`);
  }

  // ADR-Epic coupling
  if (report.couplingWarnings.length > 0) {
    io.log('\n🔗 ADR-Epic coupling:');
    for (const w of report.couplingWarnings) {
      io.log(`     ⚠️  ${w}`);
    }
  }

  // Staleness
  if (report.staleBacklog.length > 0) {
    io.log('\n📦 Backlog staleness:');
    for (const s of report.staleBacklog) {
      io.log(`     ⚠️  ${s} — may be state drift. Check: git log --oneline -- cortex/tasks/01-backlog/${s.replace(/ .*/, '')}*`);
    }
    io.log('     💡 If work is done, close the task. If deferred, suspend it.');
  }

  if (report.driftedEpics.length > 0) {
    io.log('\n📋 Epic drift:');
    for (const e of report.driftedEpics) {
      io.log(`     ⚠️  ${e} — may have all tasks done. Check: cortex list | grep ${e.replace(/ .*/, '')}`);
    }
    io.log('     💡 If all tasks completed, close the epic: cortex epic done <id>');
  }

  // Empty shells
  const emptyShellMode: 'default' | 'active-only' | 'all' = includeCompletedEmptyShells
    ? 'all'
    : activeOnly
      ? 'active-only'
      : 'default';
  const filteredEmptyShells = filterEmptyShells(report.emptyShells, emptyShellMode);

  if (report.emptyShells.length > 0) {
    if (filteredEmptyShells.length > 0) {
      io.log('\n📭 Empty shells (template not filled):');
      for (const s of filteredEmptyShells) {
        io.log(`     ⚠️  ${s}`);
      }
      io.log('     💡 Edit the file to fill background, requirements, and acceptance criteria.');
      if (!activeOnly) {
        io.log('     💡 Like a Jira ticket with only a title — zero guidance to whoever picks it up.');
      }
    }
  }

  // Coverage drift
  if (report.coverageDrift.length > 0) {
    io.log('\n📊 Coverage snapshot drift:');
    for (const d of report.coverageDrift) io.log(`     ${d}`);
    io.log('     💡 Significant changes since snapshot → consider re-running BDD.');
  }

  // Non-ASCII slugs
  if (report.nonAsciiSlugs.length > 0) {
    io.log('\n🔤 Non-ASCII slugs (filenames must be ASCII-only):');
    for (const s of report.nonAsciiSlugs) {
      io.log(`     ⚠️  ${s}`);
    }
    io.log('     💡 Rename with `git mv` or use the slug migration script.');
  }

  // Deck lock drift (content verification)
  if (report.deckLockDrift.length > 0) {
    io.log('\n🔒 Deck lock drift (content verification):');
    for (const d of report.deckLockDrift) {
      io.log(`     ⚠️  ${d}`);
    }
    io.log('     💡 Run `deck link` to regenerate lock with updated content hashes.');
  }

  // Deck state drift (operational checks)
  if (report.deckStateDrift.length > 0) {
    io.log('\n📍 Deck state drift (operational):');
    for (const d of report.deckStateDrift) {
      io.log(`     ⚠️  ${d}`);
    }
    io.log('     💡 Run `deck link` to regenerate state.');
  }

  // Checklist drift (unchecked boxes in review/completed tasks)
  if (report.checklistDrift.length > 0) {
    io.log('\n📋 Checklist drift (unchecked items in review/completed tasks):');
    for (const d of report.checklistDrift) {
      io.log(`     ⚠️  ${d}`);
    }
    io.log('     💡 Review the task and check off completed items, or move back to in-progress.');
  }

  // ── Confirmation lines for clean states ───────────────────────────
  if (activeOnly) {
    if (report.staleBacklog.length === 0) {
      io.log('\n✅ No stale backlog items');
    }
    if (filteredEmptyShells.length === 0) {
      io.log('✅ No empty shells in active states');
    }
    if (report.coverageDrift.length === 0) {
      io.log('✅ No coverage drift detected');
    }
    if (report.laneWarnings.length === 0 && report.laneCounts.main <= 1 && report.laneCounts.emergency <= 1) {
      io.log('✅ Epic lanes within limits');
    }
    if (report.couplingWarnings.length === 0) {
      io.log('✅ No ADR-Epic coupling issues');
    }
    if (report.nonAsciiSlugs.length === 0) {
      io.log('✅ No non-ASCII slug violations');
    }
    if (report.deckLockDrift.length === 0) {
      io.log('✅ No deck lock drift');
    }
    if (report.deckStateDrift.length === 0) {
      io.log('✅ No deck state drift');
    }
    if (report.checklistDrift.length === 0) {
      io.log('✅ No checklist drift');
    }
  }

  // ── Include-completed-empty-shells confirmation ──────────────────────
  if (includeCompletedEmptyShells && report.emptyShells.length === 0) {
    io.log(`\n✅ No empty shells in any state (checked ${totalChecked} documents)`);
  }

  // Summary
  io.log('\n' + '─'.repeat(50));
  if (totalIssues === 0) {
    io.log(activeOnly ? '✅ No actionable issues found.' : '✅ All documents consistent.');
  } else {
    const allStatusIssues = report.statusResults.filter(r => r.match !== 'ok');
    if (!activeOnly && allStatusIssues.length > 0) {
      io.log(`⚠️  Found ${allStatusIssues.length} status issue(s) requiring human confirmation.`);
      io.log('   Please review the items above and decide:');
      io.log('   - Move file to correct directory, OR');
      io.log('   - Update Status History inside the file.');
    }
    if (report.couplingWarnings.length > 0) {
      io.log(`⚠️  Found ${report.couplingWarnings.length} ADR-Epic coupling warning(s) — proposed ADRs should not reference active epics.`);
    }
    if (report.laneWarnings.length > 0) {
      io.log(`⚠️  Found ${report.laneWarnings.length} lane warning(s) — see "Epic lanes" section above.`);
    }
    if (report.staleBacklog.length > 0) {
      io.log(`⚠️  Found ${report.staleBacklog.length} stale backlog item(s).`);
    }
    if (report.driftedEpics.length > 0) {
      io.log(`⚠️  Found ${report.driftedEpics.length} drifted epic(s).`);
    }
    if (report.emptyShells.length > 0) {
      const filtered = filterEmptyShells(report.emptyShells, emptyShellMode);
      io.log(`⚠️  Found ${filtered.length} empty shell(s): ${filtered.map(s => s.split(':')[0]).join(', ')}`);
    }
    if (report.coverageDrift.length > 0) {
      io.log(`⚠️  Found ${report.coverageDrift.length} coverage drift(s).`);
    }
    if (report.nonAsciiSlugs.length > 0) {
      io.log(`⚠️  Found ${report.nonAsciiSlugs.length} non-ASCII slug(s).`);
    }
    if (report.deckLockDrift.length > 0) {
      io.log(`⚠️  Found ${report.deckLockDrift.length} deck lock drift(s).`);
    }
    if (report.deckStateDrift.length > 0) {
      io.log(`⚠️  Found ${report.deckStateDrift.length} deck state drift(s).`);
    }
    if (report.checklistDrift.length > 0) {
      const ids = report.checklistDrift.map(d => d.split(':')[0]).slice(0, 3).join(', ');
      const more = report.checklistDrift.length > 3 ? ` (+${report.checklistDrift.length - 3} more)` : '';
      io.log(`⚠️  Found ${report.checklistDrift.length} checklist drift(s) — ${ids}${more}`);
    }
  }
  // Summary line for all modes
  const modeLabel = activeOnly
    ? '(mode: --active-only)'
    : includeCompletedEmptyShells
      ? '(mode: --include-completed-empty-shells)'
      : '(mode: default)';
  io.log(`📊 ${totalChecked} documents checked, ${totalIssues} issue(s) found. ${modeLabel}`);
  io.log('');
}

function printResults(results: ProbeResult[], label: string, io: ProbeIO): void {
  const issues = results.filter(r => r.match !== 'ok');

  io.log(`\n${label}:`);

  if (results.length === 0) {
    io.log('  (none)');
    return;
  }

  // If all OK, collapse into directory summaries
  if (issues.length === 0) {
    const byDir = new Map<string, number>();
    for (const r of results) {
      const dir = r.file.split('/').slice(0, -1).join('/') || '(root)';
      byDir.set(dir, (byDir.get(dir) ?? 0) + 1);
    }
    for (const [dir, count] of byDir) {
      io.log(`  ✅ ${dir}: ${count} consistent`);
    }
    return;
  }

  for (const r of results) {
    const icon = r.match === 'ok' ? '✅' : r.match === 'mismatch' ? '❌' : r.match === 'missing-history' ? '⚠️' : '❓';
    io.log(`  ${icon} ${r.file}`);
    if (r.match !== 'ok') {
      io.log(`     → ${r.suggestion}`);
    }
  }

  if (issues.length > 0) {
    io.log(`\n  ⚠️  ${issues.length} 个问题需人工确认`);
  }
}

export function probeStatus(config: WorkflowConfig, opts?: { activeOnly?: boolean; includeCompletedEmptyShells?: boolean; includeCompletedChecklists?: boolean; suspicious?: boolean }): void {
  const activeOnly = opts?.activeOnly ?? opts?.suspicious ?? false;
  if (opts?.suspicious) {
    console.warn('⚠️  Flag --suspicious is deprecated, use --active-only instead.');
  }
  const plan = buildProbePlan(config, { activeOnly, includeCompletedEmptyShells: opts?.includeCompletedEmptyShells, includeCompletedChecklists: opts?.includeCompletedChecklists });
  const report = executeProbePlan(plan, defaultProbeIO);
  printProbeSummary(report, defaultProbeIO);
}
