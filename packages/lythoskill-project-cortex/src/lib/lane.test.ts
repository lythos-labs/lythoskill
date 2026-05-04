import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateLaneGuard, type LaneGuardResult } from "./lane.js";
import type { WorkflowConfig } from "../types.js";

describe("validateLaneGuard", () => {
  let tmpDir: string;
  let activeDir: string;
  let config: WorkflowConfig;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cortex-lane-"));
    activeDir = join(tmpDir, "epics", "01-active");
    mkdirSync(activeDir, { recursive: true });

    config = {
      tasksDir: join(tmpDir, "tasks"),
      epicsDir: join(tmpDir, "epics"),
      adrDir: join(tmpDir, "adr"),
      wikiDir: join(tmpDir, "wiki"),
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
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeEpic(filename: string, lane: string | null) {
    const frontmatter = lane ? `---\nlane: ${lane}\n---\n` : "";
    writeFileSync(join(activeDir, filename), `${frontmatter}# Epic\n`, "utf-8");
  }

  it("passes when no active epics exist", () => {
    const result = validateLaneGuard(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("passes with 1 main epic", () => {
    writeEpic("EPIC-20260504100000001-first.md", "main");
    const result = validateLaneGuard(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("passes with 1 emergency epic", () => {
    writeEpic("EPIC-20260504100000001-first.md", "emergency");
    const result = validateLaneGuard(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("passes with 1 main + 1 emergency", () => {
    writeEpic("EPIC-20260504100000001-main.md", "main");
    writeEpic("EPIC-20260504100000002-emergency.md", "emergency");
    const result = validateLaneGuard(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails with 2 main epics", () => {
    writeEpic("EPIC-20260504100000001-first.md", "main");
    writeEpic("EPIC-20260504100000002-second.md", "main");
    const result = validateLaneGuard(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("main");
    expect(result.errors[0]).toContain("2");
  });

  it("fails with 2 emergency epics", () => {
    writeEpic("EPIC-20260504100000001-first.md", "emergency");
    writeEpic("EPIC-20260504100000002-second.md", "emergency");
    const result = validateLaneGuard(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("emergency");
    expect(result.errors[0]).toContain("2");
  });

  it("fails with both lanes over limit", () => {
    writeEpic("EPIC-20260504100000001-main1.md", "main");
    writeEpic("EPIC-20260504100000002-main2.md", "main");
    writeEpic("EPIC-20260504100000003-emer1.md", "emergency");
    writeEpic("EPIC-20260504100000004-emer2.md", "emergency");
    const result = validateLaneGuard(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
  });

  it("ignores epics without lane field", () => {
    writeEpic("EPIC-20260504100000001-no-lane.md", null);
    writeEpic("EPIC-20260504100000002-main.md", "main");
    const result = validateLaneGuard(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("ignores epics with invalid lane value", () => {
    writeEpic("EPIC-20260504100000001-bad.md", "fastlane");
    writeEpic("EPIC-20260504100000002-main.md", "main");
    const result = validateLaneGuard(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
