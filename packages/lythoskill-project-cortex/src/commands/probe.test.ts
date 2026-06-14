import { describe, it, expect } from "bun:test";
import { filterEmptyShells, isEmptyShell, EMPTY_SHELL_PATTERNS, extractStatusHistory } from "./probe.js";

describe("isEmptyShell — pure content detection, no filesystem", () => {
  it("detects PLACEHOLDER_ requirement", () => {
    const content = "# Task\n\n## 需求详情\n- [ ] ⚠️ PLACEHOLDER_REQUIREMENT_1\n";
    expect(isEmptyShell(content)).toBe(true);
  });

  it("detects 需求1 placeholder", () => {
    const content = "## 需求详情\n- [ ] 需求1\n- [ ] 需求2\n";
    expect(isEmptyShell(content)).toBe(true);
  });

  it("detects <!-- 填写 comment", () => {
    const content = "## 背景与目标\n<!-- 填写... -->\n";
    expect(isEmptyShell(content)).toBe(true);
  });

  it("returns false for filled content", () => {
    const content = "# Task\n\n## 需求详情\n- [x] Implemented feature X\n- [ ] Polish docs\n";
    expect(isEmptyShell(content)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isEmptyShell("")).toBe(false);
  });

  it("returns false when only filled checkboxes exist", () => {
    const content = "- [x] Done\n- [x] Also done\n";
    expect(isEmptyShell(content)).toBe(false);
  });

  it("detects multiple patterns in same content", () => {
    const content = "- [ ] ⚠️ PLACEHOLDER_1\n<!-- 填写 -->\n- [ ] 需求1\n";
    expect(isEmptyShell(content)).toBe(true);
  });
});

describe("isEmptyShell — lifecycle exemption", () => {
  const withStatusHistory = (statuses: string[], body: string): string => {
    const table = statuses.map(s => `| ${s} | 2026-06-13 | Note |`).join('\n');
    return `# Task\n\n## Status History\n\n| Status | Date | Note |\n|--------|------|------|\n${table}\n\n${body}`;
  };

  it("exempts when Status History has in-progress", () => {
    const content = withStatusHistory(['backlog', 'in-progress'], '- [ ] ⚠️ PLACEHOLDER_1');
    expect(isEmptyShell(content)).toBe(false);
  });

  it("exempts when Status History has completed", () => {
    const content = withStatusHistory(['backlog', 'in-progress', 'completed'], '- [ ] ⚠️ PLACEHOLDER_1');
    expect(isEmptyShell(content)).toBe(false);
  });

  it("exempts when Status History has done", () => {
    const content = withStatusHistory(['backlog', 'done'], '- [ ] ⚠️ PLACEHOLDER_1');
    expect(isEmptyShell(content)).toBe(false);
  });

  it("exempts when Status History has review", () => {
    const content = withStatusHistory(['backlog', 'in-progress', 'review'], '- [ ] ⚠️ PLACEHOLDER_1');
    expect(isEmptyShell(content)).toBe(false);
  });

  it("exempts when Status History has suspended", () => {
    const content = withStatusHistory(['backlog', 'in-progress', 'suspended'], '- [ ] ⚠️ PLACEHOLDER_1');
    expect(isEmptyShell(content)).toBe(false);
  });

  it("exempts when Status History has terminated", () => {
    const content = withStatusHistory(['backlog', 'terminated'], '- [ ] ⚠️ PLACEHOLDER_1');
    expect(isEmptyShell(content)).toBe(false);
  });

  it("still detects when only backlog exists", () => {
    const content = withStatusHistory(['backlog'], '- [ ] ⚠️ PLACEHOLDER_1');
    expect(isEmptyShell(content)).toBe(true);
  });

  it("still detects when no Status History exists", () => {
    const content = '# Task\n\n- [ ] ⚠️ PLACEHOLDER_1\n';
    expect(isEmptyShell(content)).toBe(true);
  });

  it("exempts filled content even with active lifecycle", () => {
    const content = withStatusHistory(['backlog', 'in-progress'], '- [x] Done\n');
    expect(isEmptyShell(content)).toBe(false);
  });
});

describe("extractStatusHistory", () => {
  it("parses table format", () => {
    const content = `## Status History\n\n| Status | Date | Note |\n|--------|------|------|\n| backlog | 2026-01-01 | Created |\n| in-progress | 2026-01-02 | Started |\n`;
    const result = extractStatusHistory(content);
    expect(result.lines).toEqual(['backlog', 'in-progress']);
    expect(result.hasSection).toBe(true);
  });

  it("parses old single-line format", () => {
    const content = `## Status\n\nbacklog\n`;
    const result = extractStatusHistory(content);
    expect(result.lines).toEqual(['backlog']);
    expect(result.singleStatus).toBe('backlog');
  });

  it("returns empty when no Status History section", () => {
    const content = '# Task\n\nNo status here.\n';
    const result = extractStatusHistory(content);
    expect(result.lines).toEqual([]);
    expect(result.hasSection).toBe(false);
  });
});

describe("EMPTY_SHELL_PATTERNS", () => {
  it("has exactly 3 patterns", () => {
    expect(EMPTY_SHELL_PATTERNS.length).toBe(3);
  });

  it("patterns are multiline-aware", () => {
    for (const pat of EMPTY_SHELL_PATTERNS) {
      expect(pat.multiline).toBe(true);
    }
  });
});

describe("filterEmptyShells — pure filtering by path strings, no filesystem", () => {
  const backlogShell = "TASK-20260101000000001: cortex/tasks/01-backlog/TASK-20260101000000001-some-task.md";
  const inProgressShell = "TASK-20260101000000002: cortex/tasks/02-in-progress/TASK-20260101000000002-some-task.md";
  const reviewShell = "TASK-20260101000000003: cortex/tasks/03-review/TASK-20260101000000003-some-task.md";
  const completedShell = "TASK-20260101000000004: cortex/tasks/04-completed/TASK-20260101000000004-some-task.md";
  const suspendedShell = "EPIC-20260101000000005: cortex/epics/03-suspended/EPIC-20260101000000005-some-epic.md";
  const doneShell = "EPIC-20260101000000006: cortex/epics/99-done/EPIC-20260101000000006-some-epic.md";
  const archivedShell = "TASK-20260101000000007: cortex/tasks/07-archived/TASK-20260101000000007-some-task.md";
  const terminatedShell = "TASK-20260101000000008: cortex/tasks/06-terminated/TASK-20260101000000008-some-task.md";
  const proposedAdr = "ADR-20260101000000009: cortex/adr/01-proposed/ADR-20260101000000009-some-adr.md";
  const acceptedAdr = "ADR-20260101000000010: cortex/adr/02-accepted/ADR-20260101000000010-some-adr.md";
  const rejectedAdr = "ADR-20260101000000011: cortex/adr/03-rejected/ADR-20260101000000011-some-adr.md";
  const supersededAdr = "ADR-20260101000000012: cortex/adr/04-superseded/ADR-20260101000000012-some-adr.md";
  const epicArchived = "EPIC-20260101000000013: cortex/epics/04-archived/EPIC-20260101000000013-some-epic.md";

  const allShells = [
    backlogShell, inProgressShell, reviewShell, completedShell,
    suspendedShell, doneShell, archivedShell, terminatedShell,
    proposedAdr, acceptedAdr, rejectedAdr, supersededAdr, epicArchived,
  ];

  it("'all' mode returns everything unfiltered", () => {
    expect(filterEmptyShells(allShells, 'all')).toEqual(allShells);
  });

  it("'all' mode returns empty for empty input", () => {
    expect(filterEmptyShells([], 'all')).toEqual([]);
  });

  it("'default' mode keeps backlog, in-progress, review, proposed", () => {
    const result = filterEmptyShells(allShells, 'default');
    expect(result).toContain(backlogShell);
    expect(result).toContain(inProgressShell);
    expect(result).toContain(reviewShell);
    expect(result).toContain(proposedAdr);
  });

  it("'default' mode filters out completed, terminated, archived, suspended, done, accepted, rejected, superseded", () => {
    const result = filterEmptyShells(allShells, 'default');
    expect(result).not.toContain(completedShell);
    expect(result).not.toContain(terminatedShell);
    expect(result).not.toContain(archivedShell);
    expect(result).not.toContain(suspendedShell);
    expect(result).not.toContain(doneShell);
    expect(result).not.toContain(acceptedAdr);
    expect(result).not.toContain(rejectedAdr);
    expect(result).not.toContain(supersededAdr);
    expect(result).not.toContain(epicArchived);
  });

  it("'default' mode returns empty when all shells are in terminal dirs", () => {
    const terminalOnly = [completedShell, doneShell, acceptedAdr];
    expect(filterEmptyShells(terminalOnly, 'default')).toEqual([]);
  });

  it("'active-only' mode keeps only backlog, in-progress, proposed (not review)", () => {
    const result = filterEmptyShells(allShells, 'active-only');
    expect(result).toContain(backlogShell);
    expect(result).toContain(inProgressShell);
    expect(result).toContain(proposedAdr);
    expect(result).not.toContain(reviewShell);
  });

  it("'active-only' mode filters out all terminal and review states", () => {
    const result = filterEmptyShells(allShells, 'active-only');
    expect(result).not.toContain(completedShell);
    expect(result).not.toContain(reviewShell);
    expect(result).not.toContain(suspendedShell);
    expect(result).not.toContain(doneShell);
    expect(result).not.toContain(archivedShell);
    expect(result).not.toContain(terminatedShell);
    expect(result).not.toContain(acceptedAdr);
    expect(result).not.toContain(rejectedAdr);
    expect(result).not.toContain(supersededAdr);
    expect(result).not.toContain(epicArchived);
  });

  it("'active-only' mode returns empty when only review/terminal shells exist", () => {
    const onlyReview = [reviewShell, completedShell];
    expect(filterEmptyShells(onlyReview, 'active-only')).toEqual([]);
  });

  it("'suspicious' mode still works as deprecated alias for 'active-only'", () => {
    const result = filterEmptyShells(allShells, 'suspicious');
    expect(result).toContain(backlogShell);
    expect(result).toContain(inProgressShell);
    expect(result).toContain(proposedAdr);
    expect(result).not.toContain(reviewShell);
  });

  it("handles mixed paths with no matching shells", () => {
    const noMatch = [completedShell, doneShell];
    expect(filterEmptyShells(noMatch, 'default')).toEqual([]);
    expect(filterEmptyShells(noMatch, 'active-only')).toEqual([]);
  });
});
