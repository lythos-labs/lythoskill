import { describe, it, expect } from "bun:test";
import { buildProbePlan } from "./probe.js";
import type { WorkflowConfig } from "../types.js";

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
    research: "02-research",
    lessons: "03-lessons",
    ssot: "04-ssot",
    archived: "05-archived",
  },
};

describe("buildProbePlan", () => {
  it("returns a plan with all task directories", () => {
    const plan = buildProbePlan(mockConfig);
    expect(plan.tasks.length).toBe(7);
    expect(plan.tasks.map((t) => t.statusKey)).toEqual([
      "backlog",
      "inProgress",
      "review",
      "completed",
      "suspended",
      "terminated",
      "archived",
    ]);
    expect(plan.tasks[0].dir).toBe("cortex/tasks/01-backlog");
    expect(plan.tasks[0].files).toEqual([]);
  });

  it("returns a plan with all epic directories", () => {
    const plan = buildProbePlan(mockConfig);
    expect(plan.epics.length).toBe(4);
    expect(plan.epics.map((e) => e.statusKey)).toEqual([
      "active",
      "done",
      "suspended",
      "archived",
    ]);
    expect(plan.epics[0].dir).toBe("cortex/epics/01-active");
  });

  it("returns a plan with all adr directories", () => {
    const plan = buildProbePlan(mockConfig);
    expect(plan.adrs.length).toBe(4);
    expect(plan.adrs.map((a) => a.statusKey)).toEqual([
      "proposed",
      "accepted",
      "rejected",
      "superseded",
    ]);
    expect(plan.adrs[0].dir).toBe("cortex/adr/01-proposed");
  });

  it("returns a plan with all wiki directories", () => {
    const plan = buildProbePlan(mockConfig);
    expect(plan.wikiDir).toBe("cortex/wiki");
    expect(plan.wiki.map((w) => w.key)).toEqual([
      "patterns",
      "faq",
      "research",
      "lessons",
      "ssot",
      "archived",
    ]);
    expect(plan.wiki[2].dir).toBe("cortex/wiki/02-research");
  });

  it("enables all checks by default", () => {
    const plan = buildProbePlan(mockConfig);
    expect(plan.checks.statusConsistency).toBe(true);
    expect(plan.checks.laneOccupancy).toBe(true);
    expect(plan.checks.adrEpicCoupling).toBe(true);
    expect(plan.checks.staleness).toBe(true);
    expect(plan.checks.emptyShells).toBe(true);
    expect(plan.checks.coverageDrift).toBe(true);
    expect(plan.checks.nonAsciiSlugs).toBe(true);
  });

  it("disables statusConsistency when activeOnly=true", () => {
    const plan = buildProbePlan(mockConfig, { activeOnly: true });
    expect(plan.checks.statusConsistency).toBe(false);
    expect(plan.checks.laneOccupancy).toBe(true);
    expect(plan.options.activeOnly).toBe(true);
  });

  it("still accepts deprecated suspicious option", () => {
    const plan = buildProbePlan(mockConfig, { suspicious: true } as any);
    expect(plan.checks.statusConsistency).toBe(false);
    expect(plan.options.activeOnly).toBe(true);
  });

  it("passes through includeCompletedEmptyShells option", () => {
    const plan = buildProbePlan(mockConfig, {
      includeCompletedEmptyShells: true,
    });
    expect(plan.options.includeCompletedEmptyShells).toBe(true);
    expect(plan.options.activeOnly).toBe(false);
  });

  it("is pure: same config produces same plan", () => {
    const plan1 = buildProbePlan(mockConfig);
    const plan2 = buildProbePlan(mockConfig);
    expect(plan1).toEqual(plan2);
  });

  it("does not touch filesystem", () => {
    // buildProbePlan only joins paths — no exists/readdir/readFile
    // If it did, it would fail on the mockConfig dirs which don't exist
    const plan = buildProbePlan(mockConfig);
    expect(plan.tasks.every((t) => t.files.length === 0)).toBe(true);
    expect(plan.epics.every((e) => e.files.length === 0)).toBe(true);
    expect(plan.adrs.every((a) => a.files.length === 0)).toBe(true);
  });
});
