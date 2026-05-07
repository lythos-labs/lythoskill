import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  findLinkedAdrs,
  extractEpicIdFromFilename,
  buildAcceptCommands,
  findLinkedEpic,
  checkEpicAdrCompletion,
} from "./coupling.js";

describe("extractEpicIdFromFilename", () => {
  it("extracts EPIC id from standard filename", () => {
    expect(extractEpicIdFromFilename("EPIC-20260504165156064-extract-cortex-husky-hooks.md")).toBe(
      "EPIC-20260504165156064"
    );
  });

  it("returns null for non-epic files", () => {
    expect(extractEpicIdFromFilename("ADR-20260504172913972-budget-governance.md")).toBeNull();
    expect(extractEpicIdFromFilename("TASK-20260504165202852-t1-extract.md")).toBeNull();
  });

  it("returns null for plain names", () => {
    expect(extractEpicIdFromFilename("README.md")).toBeNull();
  });
});

describe("findLinkedAdrs", () => {
  let tmpDir: string;
  let proposedDir: string;
  let acceptedDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cortex-coupling-"));
    proposedDir = join(tmpDir, "01-proposed");
    acceptedDir = join(tmpDir, "02-accepted");
    mkdirSync(proposedDir, { recursive: true });
    mkdirSync(acceptedDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeAdr(filename: string, content: string) {
    writeFileSync(join(proposedDir, filename), content, "utf-8");
  }

  it("returns empty when proposed dir is empty", () => {
    expect(findLinkedAdrs("EPIC-20260504100000001", { proposedAdrDir: proposedDir, acceptedAdrDir: acceptedDir })).toEqual([]);
  });

  it("finds ADR linked to epic in body text", () => {
    writeAdr(
      "ADR-20260504100000001-some-design.md",
      "# ADR\n\n关联 Epic: EPIC-20260504100000001\n"
    );
    expect(findLinkedAdrs("EPIC-20260504100000001", { proposedAdrDir: proposedDir, acceptedAdrDir: acceptedDir })).toEqual([
      "ADR-20260504100000001",
    ]);
  });

  it("finds ADR linked to epic in frontmatter-style block", () => {
    writeAdr(
      "ADR-20260504100000002-frontmatter-link.md",
      "---\nEpic: EPIC-20260504100000001\n---\n# ADR\n"
    );
    expect(findLinkedAdrs("EPIC-20260504100000001", { proposedAdrDir: proposedDir, acceptedAdrDir: acceptedDir })).toEqual([
      "ADR-20260504100000002",
    ]);
  });

  it("returns empty when no ADR links to the epic", () => {
    writeAdr(
      "ADR-20260504100000003-unrelated.md",
      "# ADR\n\n关联 Epic: EPIC-20260504199999999\n"
    );
    expect(findLinkedAdrs("EPIC-20260504100000001", { proposedAdrDir: proposedDir, acceptedAdrDir: acceptedDir })).toEqual([]);
  });

  it("finds multiple ADRs linked to the same epic", () => {
    writeAdr(
      "ADR-20260504100000004-first-design.md",
      "# ADR\n\n关联 Epic: EPIC-20260504100000001\n"
    );
    writeAdr(
      "ADR-20260504100000005-second-design.md",
      "# ADR\n\n关联 Epic: EPIC-20260504100000001\n"
    );
    const result = findLinkedAdrs("EPIC-20260504100000001", { proposedAdrDir: proposedDir, acceptedAdrDir: acceptedDir });
    expect(result).toHaveLength(2);
    expect(result).toContain("ADR-20260504100000004");
    expect(result).toContain("ADR-20260504100000005");
  });

  it("returns only matching ADRs when mixed", () => {
    writeAdr(
      "ADR-20260504100000006-linked.md",
      "# ADR\n\n关联 Epic: EPIC-20260504100000001\n"
    );
    writeAdr(
      "ADR-20260504100000007-unlinked.md",
      "# ADR\n\n关联 Epic: EPIC-20260504199999999\n"
    );
    expect(findLinkedAdrs("EPIC-20260504100000001", { proposedAdrDir: proposedDir, acceptedAdrDir: acceptedDir })).toEqual([
      "ADR-20260504100000006",
    ]);
  });

  it("ignores non-ADR files", () => {
    writeFileSync(join(proposedDir, "README.md"), "# README\nEpic: EPIC-20260504100000001\n", "utf-8");
    expect(findLinkedAdrs("EPIC-20260504100000001", { proposedAdrDir: proposedDir, acceptedAdrDir: acceptedDir })).toEqual([]);
  });

  it("ignores non-markdown files", () => {
    writeFileSync(join(proposedDir, "ADR-20260504100000008-notes.txt"), "Epic: EPIC-20260504100000001", "utf-8");
    expect(findLinkedAdrs("EPIC-20260504100000001", { proposedAdrDir: proposedDir, acceptedAdrDir: acceptedDir })).toEqual([]);
  });

  it("returns sorted ADR ids", () => {
    writeAdr(
      "ADR-20260504100000010-z-last.md",
      "# ADR\n\n关联 Epic: EPIC-20260504100000001\n"
    );
    writeAdr(
      "ADR-20260504100000009-a-first.md",
      "# ADR\n\n关联 Epic: EPIC-20260504100000001\n"
    );
    const result = findLinkedAdrs("EPIC-20260504100000001", { proposedAdrDir: proposedDir, acceptedAdrDir: acceptedDir });
    expect(result).toEqual(["ADR-20260504100000009", "ADR-20260504100000010"]);
  });
});

describe("buildAcceptCommands", () => {
  it("builds adr accept commands", () => {
    expect(buildAcceptCommands(["ADR-20260504100000001", "ADR-20260504100000002"])).toEqual([
      "adr accept ADR-20260504100000001",
      "adr accept ADR-20260504100000002",
    ]);
  });

  it("returns empty for empty input", () => {
    expect(buildAcceptCommands([])).toEqual([]);
  });
});

describe("findLinkedEpic", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cortex-epic-link-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns epic ID from Epic: trailer", () => {
    const p = join(tmpDir, "test.md");
    writeFileSync(p, "# ADR\n\n关联 Epic: EPIC-20260507000000001\n", "utf-8");
    expect(findLinkedEpic(p)).toBe("EPIC-20260507000000001");
  });

  it("returns epic ID from bare Epic: format", () => {
    const p = join(tmpDir, "test.md");
    writeFileSync(p, "Epic: EPIC-20260507000000002\n", "utf-8");
    expect(findLinkedEpic(p)).toBe("EPIC-20260507000000002");
  });

  it("returns null when no epic reference", () => {
    const p = join(tmpDir, "test.md");
    writeFileSync(p, "# Plain doc\n\nNo epic here.\n", "utf-8");
    expect(findLinkedEpic(p)).toBeNull();
  });

  it("returns null for non-existent file", () => {
    expect(findLinkedEpic(join(tmpDir, "nope.md"))).toBeNull();
  });
});

describe("checkEpicAdrCompletion", () => {
  let tmpDir: string;
  let proposedDir: string;
  let acceptedDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "cortex-epic-compl-"));
    proposedDir = join(tmpDir, "01-proposed");
    acceptedDir = join(tmpDir, "02-accepted");
    mkdirSync(proposedDir, { recursive: true });
    mkdirSync(acceptedDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const config = () => ({ proposedAdrDir: proposedDir, acceptedAdrDir: acceptedDir });

  it("returns allAccepted=true when all linked ADRs are in accepted", () => {
    writeFileSync(join(acceptedDir, "ADR-20260507000000001-design.md"), "Epic: EPIC-20260507000000001\n", "utf-8");
    const result = checkEpicAdrCompletion("EPIC-20260507000000001", config());
    expect(result.allAccepted).toBe(true);
    expect(result.total).toBe(1);
    expect(result.proposedIds).toEqual([]);
  });

  it("returns allAccepted=false when some ADRs still in proposed", () => {
    writeFileSync(join(acceptedDir, "ADR-20260507000000002-design.md"), "Epic: EPIC-20260507000000001\n", "utf-8");
    writeFileSync(join(proposedDir, "ADR-20260507000000003-design.md"), "Epic: EPIC-20260507000000001\n", "utf-8");
    const result = checkEpicAdrCompletion("EPIC-20260507000000001", config());
    expect(result.allAccepted).toBe(false);
    expect(result.total).toBe(2);
    expect(result.proposedIds).toEqual(["ADR-20260507000000003"]);
    expect(result.acceptedIds).toEqual(["ADR-20260507000000002"]);
  });

  it("returns allAccepted=false when no ADRs reference the epic", () => {
    const result = checkEpicAdrCompletion("EPIC-20260507999999999", config());
    expect(result.allAccepted).toBe(false);
    expect(result.total).toBe(0);
  });

  it("finds ADRs in both proposed and accepted directories", () => {
    writeFileSync(join(proposedDir, "ADR-20260507000000004-proposed.md"), "Epic: EPIC-20260507000000002\n", "utf-8");
    writeFileSync(join(acceptedDir, "ADR-20260507000000005-accepted.md"), "Epic: EPIC-20260507000000002\n", "utf-8");
    const result = checkEpicAdrCompletion("EPIC-20260507000000002", config());
    expect(result.total).toBe(2);
    expect(result.allAccepted).toBe(false);
    expect(result.proposedIds).toEqual(["ADR-20260507000000004"]);
  });
});
