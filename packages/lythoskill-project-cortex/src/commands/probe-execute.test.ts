import { describe, it, expect } from "bun:test";
import {
  executeProbePlan,
  buildProbePlan,
  type ProbeIO,
  type ProbePlan,
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

  return {
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

  it("skips status consistency when suspicious mode", () => {
    const files: Record<string, string> = {
      "cortex/tasks/01-backlog/TASK-20260101000000010-test.md": `# Task\n\n## Status History\n\n| Status | Date | Note |\n|--------|------|------|\n| in-progress | 2026-01-01 | Started |\n`,
    };
    const plan = buildProbePlan(mockConfig, { suspicious: true });
    const io = makeMockIO(files);
    const report = executeProbePlan(plan, io);

    expect(report.statusResults).toEqual([]);
    expect(report.summary.suspicious).toBe(true);
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
