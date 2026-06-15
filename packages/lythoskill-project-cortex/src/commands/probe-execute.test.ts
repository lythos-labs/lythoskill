import { describe, it, expect } from "bun:test";
import {
  executeProbePlan,
  buildProbePlan,
  printProbeSummary,
  type ProbeIO,
  type ProbePlan,
  type ProbeReport,
} from "./probe.js";
import type { WorkflowConfig } from "../types.js";

function makeMockIO(files: Record<string, string>): ProbeIO {
  const logs: string[] = [];
  const warns: string[] = [];

  // Normalize all file paths to absolute under /project
  const absoluteFiles: Record<string, string> = {};
  for (const [key, value] of Object.entries(files)) {
    const absPath = key.startsWith("/") ? key : `/project/${key}`;
    absoluteFiles[absPath] = value;
  }

  const io: ProbeIO = {
    readFile: (path: string) => {
      const absPath = path.startsWith("/") ? path : `/project/${path}`;
      return absoluteFiles[absPath] ?? null;
    },
    readdir: (path: string) => {
      const absPath = path.startsWith("/") ? path : `/project/${path}`;
      const entries: { name: string; isDirectory: boolean }[] = [];
      for (const key of Object.keys(absoluteFiles)) {
        if (key.startsWith(absPath + "/")) {
          const rest = key.slice(absPath.length + 1);
          const firstSegment = rest.split("/")[0];
          if (firstSegment && !entries.find((e) => e.name === firstSegment)) {
            const isDir = rest.includes("/");
            entries.push({ name: firstSegment, isDirectory: isDir });
          }
        }
      }
      if (entries.length === 0) {
        const hasAnyFile = Object.keys(absoluteFiles).some((k) =>
          k.startsWith(absPath + "/")
        );
        if (!hasAnyFile && !absoluteFiles[absPath]) return null;
      }
      return entries;
    },
    exists: (path: string) => {
      const absPath = path.startsWith("/") ? path : `/project/${path}`;
      return (
        Object.keys(absoluteFiles).some((k) => k.startsWith(absPath + "/")) ||
        absPath in absoluteFiles
      );
    },
    spawn: () => ({ status: 0, stdout: "", stderr: "" }),
    log: (msg: string) => logs.push(msg),
    warn: (msg: string) => warns.push(msg),
    cwd: () => "/project",
  };

  // Attach logs/warns for test inspection
  (io as any)._logs = logs;
  (io as any)._warns = warns;
  return io;
}

function getLogs(io: ProbeIO): string[] {
  return (io as any)._logs ?? [];
}

const mockConfig: WorkflowConfig = {
  tasksDir: "cortex/tasks",
  epicsDir: "cortex/epics",
  adrDir: "cortex/adr",
  wikiDir: "cortex/wiki",
  taskSubdirs: {
    backlog: "01-backlog",
    inProgress: "02-in-progress",
    review: "03-review",
    completed: "04-completed",
    suspended: "05-suspended",
    terminated: "06-terminated",
    archived: "07-archived",
  },
  epicSubdirs: {
    active: "01-active",
    done: "02-done",
    suspended: "03-suspended",
    archived: "04-archived",
  },
  adrSubdirs: {
    proposed: "01-proposed",
    accepted: "02-accepted",
    rejected: "03-rejected",
    superseded: "04-superseded",
  },
  wikiSubdirs: {
    patterns: "01-patterns",
    faq: "02-faq",
    lessons: "03-lessons",
    legacy: "04-legacy",
  },
};

describe("executeProbePlan — with mock IO", () => {
  it("returns empty report when no files exist", () => {
    const plan = buildProbePlan(mockConfig);
    const io = makeMockIO({});
    const report = executeProbePlan(plan, io);

    expect(report.statusResults).toEqual([]);
    expect(report.laneWarnings).toEqual([]);
    expect(report.couplingWarnings).toEqual([]);
    expect(report.staleBacklog).toEqual([]);
    expect(report.driftedEpics).toEqual([]);
    expect(report.emptyShells).toEqual([]);
    expect(report.coverageDrift).toEqual([]);
    expect(report.nonAsciiSlugs).toEqual([]);
    expect(report.summary.totalIssues).toBe(0);
  });

  it("detects status mismatch via mock readFile", () => {
    const files: Record<string, string> = {
      "cortex/tasks/01-backlog/TASK-20260101000000001-test.md": `# Task\n\n## Status History\n\n| Status | Date | Note |\n|--------|------|------|\n| in-progress | 2026-01-01 | Started |\n`,
    };
    const plan = buildProbePlan(mockConfig);
    const io = makeMockIO(files);
    const report = executeProbePlan(plan, io);

    const issues = report.statusResults.filter((r) => r.match !== "ok");
    expect(issues.length).toBe(1);
    expect(issues[0].file).toBe("cortex/tasks/01-backlog/TASK-20260101000000001-test.md");
    expect(issues[0].match).toBe("mismatch");
    expect(issues[0].expectedStatus).toBe("backlog");
  });

  it("detects ok status when file matches directory", () => {
    const files: Record<string, string> = {
      "cortex/tasks/02-in-progress/TASK-20260101000000002-test.md": `# Task\n\n## Status History\n\n| Status | Date | Note |\n|--------|------|------|\n| in-progress | 2026-01-01 | Started |\n`,
    };
    const plan = buildProbePlan(mockConfig);
    const io = makeMockIO(files);
    const report = executeProbePlan(plan, io);

    const okResults = report.statusResults.filter((r) => r.match === "ok");
    expect(okResults.length).toBe(1);
    expect(okResults[0].expectedStatus).toBe("inProgress");
  });

  it("detects non-ASCII slugs", () => {
    const files: Record<string, string> = {
      "cortex/tasks/01-backlog/TASK-20260101000000003-测试.md": `# Task\n`,
    };
    const plan = buildProbePlan(mockConfig);
    const io = makeMockIO(files);
    const report = executeProbePlan(plan, io);

    expect(report.nonAsciiSlugs.length).toBe(1);
    expect(report.nonAsciiSlugs[0]).toBe("cortex/tasks/01-backlog/TASK-20260101000000003-测试.md");
  });

  it("detects empty shells", () => {
    const files: Record<string, string> = {
      "cortex/tasks/01-backlog/TASK-20260101000000004-test.md": `# Task\n\n## 需求详情\n- [ ] ⚠️ PLACEHOLDER_REQUIREMENT_1\n`,
    };
    const plan = buildProbePlan(mockConfig);
    const io = makeMockIO(files);
    const report = executeProbePlan(plan, io);

    expect(report.emptyShells.length).toBe(1);
    expect(report.emptyShells[0]).toContain("TASK-20260101000000004-test");
  });

  it("detects ADR-Epic coupling", () => {
    const files: Record<string, string> = {
      "cortex/adr/01-proposed/ADR-20260101000000005-test.md": `# ADR\n\n## Related\n\nEpic: EPIC-20260101000000006\n`,
    };
    const plan = buildProbePlan(mockConfig);
    const io = makeMockIO(files);
    const report = executeProbePlan(plan, io);

    expect(report.couplingWarnings.length).toBe(1);
    expect(report.couplingWarnings[0]).toContain("ADR-20260101000000005");
    expect(report.couplingWarnings[0]).toContain("EPIC-20260101000000006");
  });

  it("detects lane warnings from active epic frontmatter", () => {
    const files: Record<string, string> = {
      "cortex/epics/01-active/EPIC-20260101000000007-a.md": `---\nlane: main\n---\n# Epic A\n`,
      "cortex/epics/01-active/EPIC-20260101000000008-b.md": `---\nlane: main\n---\n# Epic B\n`,
    };
    const plan = buildProbePlan(mockConfig);
    const io = makeMockIO(files);
    const report = executeProbePlan(plan, io);

    expect(report.laneCounts.main).toBe(2);
    expect(report.laneCounts.emergency).toBe(0);
    expect(report.laneWarnings.length).toBe(1);
    expect(report.laneWarnings[0]).toContain("main lane has 2 active epics");
  });

  it("detects stale backlog tasks", () => {
    const oldDate = "2026-01-01"; // well over 3 days before 2026-06-14
    const files: Record<string, string> = {
      [`cortex/tasks/01-backlog/TASK-20260101000000009-test.md`]: `# Task\n\n## Status History\n\n| Status | Date | Note |\n|--------|------|------|\n| backlog | ${oldDate} | Created |\n`,
    };
    const plan = buildProbePlan(mockConfig);
    const io = makeMockIO(files);
    const report = executeProbePlan(plan, io);

    expect(report.staleBacklog.length).toBe(1);
    expect(report.staleBacklog[0]).toContain("TASK-20260101000000009");
  });

  it("skips status consistency when activeOnly mode", () => {
    const files: Record<string, string> = {
      "cortex/tasks/01-backlog/TASK-20260101000000010-test.md": `# Task\n\n## Status History\n\n| Status | Date | Note |\n|--------|------|------|\n| in-progress | 2026-01-01 | Started |\n`,
    };
    const plan = buildProbePlan(mockConfig, { activeOnly: true });
    const io = makeMockIO(files);
    const report = executeProbePlan(plan, io);

    expect(report.statusResults).toEqual([]);
    expect(report.summary.activeOnly).toBe(true);
  });

  it("still works with deprecated suspicious option", () => {
    const files: Record<string, string> = {
      "cortex/tasks/01-backlog/TASK-20260101000000010-test.md": `# Task\n\n## Status History\n\n| Status | Date | Note |\n|--------|------|------|\n| in-progress | 2026-01-01 | Started |\n`,
    };
    const plan = buildProbePlan(mockConfig, { suspicious: true } as any);
    const io = makeMockIO(files);
    const report = executeProbePlan(plan, io);

    expect(report.statusResults).toEqual([]);
    expect(report.summary.activeOnly).toBe(true);
  });

  it("does not call real filesystem or git", () => {
    const plan = buildProbePlan(mockConfig);
    let readFileCalled = false;
    let readdirCalled = false;
    let existsCalled = false;
    let spawnCalled = false;

    const io: ProbeIO = {
      readFile: () => {
        readFileCalled = true;
        return null;
      },
      readdir: () => {
        readdirCalled = true;
        return null;
      },
      exists: (path) => {
        existsCalled = true;
        // Return true for the plan directories so readdir gets called
        return plan.tasks.some((t) => path.includes(t.dir)) ||
          plan.epics.some((e) => path.includes(e.dir)) ||
          plan.adrs.some((a) => path.includes(a.dir));
      },
      spawn: () => {
        spawnCalled = true;
        return { status: 0, stdout: "", stderr: "" };
      },
      log: () => {},
      warn: () => {},
      cwd: () => "/project",
    };

    executeProbePlan(plan, io);
    expect(existsCalled).toBe(true);
    expect(readdirCalled).toBe(true);
    // readFile and spawn won't be called if no files exist
  });

  it("gracefully handles unreadable files (readFile returns null)", () => {
    const files: Record<string, string> = {
      "cortex/tasks/01-backlog/TASK-20260101000000011-test.md": `# Task\n`,
    };
    const plan = buildProbePlan(mockConfig);
    const io = makeMockIO(files);
    // Override to return null for specific file
    const originalReadFile = io.readFile;
    io.readFile = (path: string) => {
      if (path.includes("TASK-20260101000000011")) return null;
      return originalReadFile(path);
    };

    const report = executeProbePlan(plan, io);
    // Should not crash, just skip the unreadable file
    expect(report.statusResults.length).toBe(0);
  });
});

describe("printProbeSummary — output UX", () => {
  function makeReport(partial: Partial<ProbeReport> & { summary: ProbeReport["summary"] }): ProbeReport {
    return {
      statusResults: [],
      laneCounts: { main: 0, emergency: 0, unknown: 0 },
      laneWarnings: [],
      couplingWarnings: [],
      staleBacklog: [],
      driftedEpics: [],
      emptyShells: [],
      coverageDrift: [],
      nonAsciiSlugs: [],
      deckLockDrift: [],
      deckStateDrift: [],
      ...partial,
    };
  }

  it("default mode shows summary line with document count", () => {
    const io = makeMockIO({});
    const report = makeReport({
      summary: {
        activeOnly: false,
        includeCompletedEmptyShells: false,
        totalIssues: 0,
        totalChecked: 42,
        hasStatusIssues: false,
        hasLaneIssues: false,
        hasCouplingIssues: false,
        hasStaleness: false,
        hasEmptyShells: false,
        hasCoverageDrift: false,
        hasNonAsciiSlugs: false,
        hasDeckLockDrift: false,
        hasDeckStateDrift: false,
      },
    });
    printProbeSummary(report, io);
    const logs = getLogs(io);
    expect(logs.some(l => l.includes("✅ All documents consistent."))).toBe(true);
    expect(logs.some(l => l.includes("📊 42 documents checked, 0 issue(s) found."))).toBe(true);
  });

  it("default mode shows issue count when issues exist", () => {
    const io = makeMockIO({});
    const report = makeReport({
      statusResults: [
        { file: "a.md", type: "task", expectedStatus: "backlog", lastHistoryLine: "in-progress", hasHistorySection: true, match: "mismatch", suggestion: "move" },
      ],
      summary: {
        activeOnly: false,
        includeCompletedEmptyShells: false,
        totalIssues: 1,
        totalChecked: 10,
        hasStatusIssues: true,
        hasLaneIssues: false,
        hasCouplingIssues: false,
        hasStaleness: false,
        hasEmptyShells: false,
        hasCoverageDrift: false,
        hasNonAsciiSlugs: false,
        hasDeckLockDrift: false,
        hasDeckStateDrift: false,
      },
    });
    printProbeSummary(report, io);
    const logs = getLogs(io);
    expect(logs.some(l => l.includes("📊 10 documents checked, 1 issue(s) found."))).toBe(true);
  });

  it("active-only mode shows confirmation lines when clean", () => {
    const io = makeMockIO({});
    const report = makeReport({
      summary: {
        activeOnly: true,
        includeCompletedEmptyShells: false,
        totalIssues: 0,
        totalChecked: 20,
        hasStatusIssues: false,
        hasLaneIssues: false,
        hasCouplingIssues: false,
        hasStaleness: false,
        hasEmptyShells: false,
        hasCoverageDrift: false,
        hasNonAsciiSlugs: false,
        hasDeckLockDrift: false,
        hasDeckStateDrift: false,
      },
    });
    printProbeSummary(report, io);
    const logs = getLogs(io);
    expect(logs.some(l => l.includes("✅ No stale backlog items"))).toBe(true);
    expect(logs.some(l => l.includes("✅ No empty shells in active states"))).toBe(true);
    expect(logs.some(l => l.includes("✅ No coverage drift detected"))).toBe(true);
    expect(logs.some(l => l.includes("✅ Epic lanes within limits"))).toBe(true);
    expect(logs.some(l => l.includes("✅ No actionable issues found."))).toBe(true);
    // ── active-only ALSO gets summary line now ──
    expect(logs.some(l => l.includes("📊 20 documents checked, 0 issue(s) found."))).toBe(true);
  });

  it("active-only mode skips confirmation for categories with issues", () => {
    const io = makeMockIO({});
    const report = makeReport({
      staleBacklog: ["TASK-001 (5d old)"],
      summary: {
        activeOnly: true,
        includeCompletedEmptyShells: false,
        totalIssues: 1,
        totalChecked: 20,
        hasStatusIssues: false,
        hasLaneIssues: false,
        hasCouplingIssues: false,
        hasStaleness: true,
        hasEmptyShells: false,
        hasCoverageDrift: false,
        hasNonAsciiSlugs: false,
        hasDeckLockDrift: false,
        hasDeckStateDrift: false,
      },
    });
    printProbeSummary(report, io);
    const logs = getLogs(io);
    // Should NOT print "No stale backlog items" when there IS stale backlog
    expect(logs.some(l => l.includes("✅ No stale backlog items"))).toBe(false);
    // Should still print other clean confirmations
    expect(logs.some(l => l.includes("✅ No empty shells in active states"))).toBe(true);
  });

  it("include-completed-empty-shells shows scope indicator and confirmation when no shells anywhere", () => {
    const io = makeMockIO({});
    const report = makeReport({
      summary: {
        activeOnly: false,
        includeCompletedEmptyShells: true,
        totalIssues: 0,
        totalChecked: 30,
        hasStatusIssues: false,
        hasLaneIssues: false,
        hasCouplingIssues: false,
        hasStaleness: false,
        hasEmptyShells: false,
        hasCoverageDrift: false,
        hasNonAsciiSlugs: false,
        hasDeckLockDrift: false,
        hasDeckStateDrift: false,
      },
    });
    printProbeSummary(report, io);
    const logs = getLogs(io);
    expect(logs.some(l => l.includes("📋 Empty-shell detection: expanded"))).toBe(true);
    expect(logs.some(l => l.includes("includes completed, terminated, archived"))).toBe(true);
    expect(logs.some(l => l.includes("✅ No empty shells in any state (checked 30 documents)"))).toBe(true);
  });

  it("include-completed-empty-shells does NOT show confirmation when shells exist", () => {
    const io = makeMockIO({});
    const report = makeReport({
      emptyShells: ["TASK-001: cortex/tasks/01-backlog/TASK-001.md"],
      summary: {
        activeOnly: false,
        includeCompletedEmptyShells: true,
        totalIssues: 1,
        totalChecked: 30,
        hasStatusIssues: false,
        hasLaneIssues: false,
        hasCouplingIssues: false,
        hasStaleness: false,
        hasEmptyShells: true,
        hasCoverageDrift: false,
        hasNonAsciiSlugs: false,
        hasDeckLockDrift: false,
        hasDeckStateDrift: false,
      },
    });
    printProbeSummary(report, io);
    const logs = getLogs(io);
    expect(logs.some(l => l.includes("✅ No empty shells in any state"))).toBe(false);
    expect(logs.some(l => l.includes("📭 Empty shells"))).toBe(true);
  });
});
