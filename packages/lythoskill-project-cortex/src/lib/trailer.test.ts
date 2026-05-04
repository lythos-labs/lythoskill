import { describe, it, expect } from "bun:test";
import { parseTrailers, buildDispatchCommands, type TrailerResult } from "./trailer.js";

describe("parseTrailers", () => {
  it("returns empty for message with no trailers", () => {
    const result = parseTrailers("feat: do something\n\n- detail");
    expect(result.trailers).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.skip).toBe(false);
  });

  it("parses Closes: TASK-* into complete command", () => {
    const result = parseTrailers("fix: bug\n\nCloses: TASK-20260504100000001");
    expect(result.trailers).toEqual([
      { key: "Closes", id: "TASK-20260504100000001", verb: "complete", raw: "Closes: TASK-20260504100000001" },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("parses Closes: ADR-* into adr accept command", () => {
    const result = parseTrailers("feat: governance\n\nCloses: ADR-20260504100000001");
    expect(result.trailers).toEqual([
      { key: "Closes", id: "ADR-20260504100000001", verb: "adr accept", raw: "Closes: ADR-20260504100000001" },
    ]);
  });

  it("parses Closes: EPIC-* into epic done command", () => {
    const result = parseTrailers("feat: done\n\nCloses: EPIC-20260504100000001");
    expect(result.trailers).toEqual([
      { key: "Closes", id: "EPIC-20260504100000001", verb: "epic done", raw: "Closes: EPIC-20260504100000001" },
    ]);
  });

  it("parses Task: with verb", () => {
    const result = parseTrailers("chore: update\n\nTask: TASK-20260504100000001 review");
    expect(result.trailers).toEqual([
      { key: "Task", id: "TASK-20260504100000001", verb: "review", raw: "Task: TASK-20260504100000001 review" },
    ]);
  });

  it("warns when Task: lacks verb", () => {
    const result = parseTrailers("chore: update\n\nTask: TASK-20260504100000001");
    expect(result.trailers).toEqual([]);
    expect(result.warnings).toEqual([
      "post-commit trailer: Task: requires a verb in: Task: TASK-20260504100000001",
    ]);
  });

  it("parses ADR: with verb", () => {
    const result = parseTrailers("feat: governance\n\nADR: ADR-20260504100000001 accept");
    expect(result.trailers).toEqual([
      { key: "ADR", id: "ADR-20260504100000001", verb: "adr accept", raw: "ADR: ADR-20260504100000001 accept" },
    ]);
  });

  it("warns when ADR: lacks verb", () => {
    const result = parseTrailers("feat: governance\n\nADR: ADR-20260504100000001");
    expect(result.trailers).toEqual([]);
    expect(result.warnings).toEqual([
      "post-commit trailer: ADR: requires a verb in: ADR: ADR-20260504100000001",
    ]);
  });

  it("parses Epic: with verb", () => {
    const result = parseTrailers("feat: milestone\n\nEpic: EPIC-20260504100000001 suspend");
    expect(result.trailers).toEqual([
      { key: "Epic", id: "EPIC-20260504100000001", verb: "epic suspend", raw: "Epic: EPIC-20260504100000001 suspend" },
    ]);
  });

  it("warns when Epic: lacks verb", () => {
    const result = parseTrailers("feat: milestone\n\nEpic: EPIC-20260504100000001");
    expect(result.trailers).toEqual([]);
    expect(result.warnings).toEqual([
      "post-commit trailer: Epic: requires a verb in: Epic: EPIC-20260504100000001",
    ]);
  });

  it("warns on malformed ID", () => {
    const result = parseTrailers("fix: bug\n\nCloses: BAD-ID");
    expect(result.trailers).toEqual([]);
    expect(result.warnings).toEqual([
      "post-commit trailer: malformed ID in line: Closes: BAD-ID",
    ]);
  });

  it("warns on unknown prefix in Closes", () => {
    const result = parseTrailers("fix: bug\n\nCloses: FOO-20260504100000001");
    expect(result.trailers).toEqual([]);
    expect(result.warnings).toEqual([
      "post-commit trailer: unknown ID prefix in: Closes: FOO-20260504100000001",
    ]);
  });

  it("parses multiple trailers", () => {
    const msg = [
      "feat: big change",
      "",
      "Closes: TASK-20260504100000001",
      "Task: TASK-20260504100000002 review",
      "ADR: ADR-20260504100000001 accept",
    ].join("\n");
    const result = parseTrailers(msg);
    expect(result.trailers).toHaveLength(3);
    expect(result.trailers[0].verb).toBe("complete");
    expect(result.trailers[1].verb).toBe("review");
    expect(result.trailers[2].verb).toBe("adr accept");
  });

  it("sets skip=true when Triggered by: is present (recursion guard)", () => {
    const result = parseTrailers("chore(cortex): follow-up\n\nTriggered by: abc1234\n\nCloses: TASK-20260504100000001");
    expect(result.skip).toBe(true);
    expect(result.trailers).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("ignores non-trailer lines that happen to contain trailer words", () => {
    const result = parseTrailers("fix: Task runner bug\n\n- Task runner was broken");
    expect(result.trailers).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("handles trailing whitespace in trailer lines", () => {
    const result = parseTrailers("fix: bug\n\nCloses: TASK-20260504100000001   ");
    expect(result.trailers).toEqual([
      { key: "Closes", id: "TASK-20260504100000001", verb: "complete", raw: "Closes: TASK-20260504100000001   " },
    ]);
  });
});

describe("buildDispatchCommands", () => {
  it("builds commands from parsed trailers", () => {
    const trailers: TrailerResult["trailers"] = [
      { key: "Closes", id: "TASK-1", verb: "complete", raw: "" },
      { key: "Task", id: "TASK-2", verb: "review", raw: "" },
      { key: "ADR", id: "ADR-1", verb: "adr accept", raw: "" },
      { key: "Epic", id: "EPIC-1", verb: "epic done", raw: "" },
    ];
    const cmds = buildDispatchCommands(trailers);
    expect(cmds).toEqual([
      "complete TASK-1",
      "review TASK-2",
      "adr accept ADR-1",
      "epic done EPIC-1",
    ]);
  });

  it("returns empty for empty trailers", () => {
    expect(buildDispatchCommands([])).toEqual([]);
  });
});
