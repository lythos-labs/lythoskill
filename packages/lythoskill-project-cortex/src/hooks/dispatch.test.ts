import { describe, it, expect } from "bun:test";
import { DISPATCH_FOLLOWUP_ADD } from "./dispatch.js";

// Regression guard for the 2026-10-13/14 "follow-up commit silently never
// lands" bug: dispatch.ts staged a bare root `INDEX.md` pathspec after the
// index moved to `cortex/INDEX.md` (TASK-20261013142924953). `git add` then
// aborted with exit 128 and staged nothing, so the trailer follow-up commit
// never landed. Pin the pathspec list so the stale pathspec cannot return.
describe("DISPATCH_FOLLOWUP_ADD", () => {
  it("stages the cortex index, never the deleted bare root INDEX.md", () => {
    expect(DISPATCH_FOLLOWUP_ADD).toContain("cortex/INDEX.md");
    expect(DISPATCH_FOLLOWUP_ADD).not.toContain("INDEX.md");
  });

  it("matches the pathspecs pre-commit.ts uses for the same index files", () => {
    // pre-commit.ts: git add cortex/adr/ cortex/INDEX.md cortex/wiki/INDEX.md
    expect(DISPATCH_FOLLOWUP_ADD).toContain("cortex/adr");
    expect(DISPATCH_FOLLOWUP_ADD).toContain("cortex/wiki/INDEX.md");
    expect(DISPATCH_FOLLOWUP_ADD).toContain("cortex/tasks");
    expect(DISPATCH_FOLLOWUP_ADD).toContain("cortex/epics");
  });
});
