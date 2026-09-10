import { describe, it, expect } from "bun:test";
import { filterEmptyShells, isEmptyShell, EMPTY_SHELL_PATTERNS, extractStatusHistory } from "./probe.js";
import { parseRelations } from "../lib/adr-relations.js";

/** 与 probe 里那条检查同判据的纯函数(检查本身跑在 IO 注入层,这里钉判据) */
function isSupersededWithoutPointer(content: string, known: string[] = []): boolean {
  const rel = parseRelations(content);
  if (!rel.supersededBy) return true;
  return rel.supersededBy.startsWith('ADR-') && !known.includes(rel.supersededBy);
}
import { createAdrTemplate } from "../lib/template.js";

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

describe("isEmptyShell — marker-less placeholders (TASK-20260909010058114)", () => {
  it("detects the arena-seeded all-TBD card, verbatim", () => {
    // 形状逐字来自 playground/2026-09-09-arena-cortex-desc-ab/reproduce.sh 的种子卡:
    // 每个 section 的正文就是一个裸 `TBD`,没有任何 ⚠️ PLACEHOLDER_ 标记。
    // 加 pattern 之前这里是 false —— probe 把一张不可派单的卡当成填好的卡。
    const content = [
      "# TASK-20260828212204402 — kimi probe hardening",
      "",
      "## Requirements",
      "TBD",
      "",
      "## Approach",
      "TBD",
      "",
      "## Acceptance Criteria",
      "TBD",
      "",
    ].join("\n");
    expect(isEmptyShell(content)).toBe(true);
  });

  it("detects a late fill that keeps the template's list punctuation", () => {
    // 模板那两行是 `- [ ] ⚠️ PLACEHOLDER_REQUIREMENT_1`;懒惰的填法保留 bullet/checkbox,
    // 只把标记词换掉 —— 这一条钉住 pattern 里那个可选前缀组。
    expect(isEmptyShell("## Requirements\n- TBD\n")).toBe(true);
    expect(isEmptyShell("## Requirements\n- [ ] TBD\n")).toBe(true);
    expect(isEmptyShell("## Approach\n- [x] TODO\n")).toBe(true);
  });

  it("detects TODO and FIXME, not just TBD", () => {
    // 这三种拼法是同一个占位概念,不是三条规则 —— 一张正文写着 TODO 的卡同样不可派单。
    expect(isEmptyShell("## Approach\nTODO\n")).toBe(true);
    expect(isEmptyShell("## Approach\nFIXME\n")).toBe(true);
  });

  it("matches the token case-insensitively", () => {
    expect(isEmptyShell("## Approach\ntbd\n")).toBe(true);
    expect(isEmptyShell("## Approach\nfixme\n")).toBe(true);
  });

  it("detects a lone token with a trailing colon (ASCII or full-width)", () => {
    expect(isEmptyShell("## Approach\nTBD:\n")).toBe(true);
    expect(isEmptyShell("## Approach\nTODO：\n")).toBe(true);
  });

  it("DORMANCY — prose mentions of TBD do not fire (measured: 10 healthy cards have one)", () => {
    // 每一行都逐字取自本仓一张**填好的**卡/ADR。天真的 /TBD/i 会把这 10 张全部误报成空壳;
    // 整行制(整行只有占位词)才是"占位符 vs 正文提及"的判据。
    expect(isEmptyShell("| in-progress | 2026-05-04 | Pulled from backlog — T1 done, process.exit strategy TBD |\n")).toBe(false);
    expect(isEmptyShell("- 关联 Epic: TBD(看是否合并到现有 deck-governance epic 或新开)\n")).toBe(false);
    expect(isEmptyShell("- `wiki/02-architecture/skills-as-flat-controllers-evolution.md`（TBD，承载本 ADR 的深度论证 + 同生态对照）\n")).toBe(false);
    expect(isEmptyShell("- **实现**: TBD — 先调研 `sub-agents-mcp`、`claude-code-controller`\n")).toBe(false);
    expect(isEmptyShell("cursor   → ~/.cursor/skills/   (TBD: verify Cursor convention)\n")).toBe(false);
  });

  it("DORMANCY — a fully-written card produces zero empty-shell signals", () => {
    const content = [
      "# TASK-1: real work",
      "",
      "## Requirements",
      "Ship the reconciler.",
      "",
      "## Technical Approach",
      "- Step one: read the lock file.",
      "- Step two: compare hashes, then reconcile.",
      "",
      "## Acceptance Criteria",
      "- [x] Suite green",
      "",
      "## Progress Log",
      "- 2026-09-11: implemented; 150 tests pass.",
      "",
    ].join("\n");
    expect(isEmptyShell(content)).toBe(false);
  });

  it("DORMANCY — a token buried in a sentence is not a placeholder", () => {
    // 整行制判据的边界:词得独占一行才算占位。
    expect(isEmptyShell("## Background\nTODO items are tracked in cortex, not in code comments.\n")).toBe(false);
    expect(isEmptyShell("## Background\nThe migration is TBD-dependent.\n")).toBe(false);
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
  it("patterns are multiline-aware", () => {
    for (const pat of EMPTY_SHELL_PATTERNS) {
      expect(pat.multiline).toBe(true);
    }
  });

  // 原本这里断言 `length === 3` —— 它钉的是形状而不是行为,所以模板合法增长时
  // 它会红,而真正的失效(ADR 恒不被检测)它一句话都说不出(B21)。换成行为断言。

  it("an unfilled ADR is a shell — templates do not share a placeholder shape (B21)", () => {
    // 任务卡是 `- [ ] ⚠️ PLACEHOLDER_…`;ADR 是 `**Choice**: ⚠️ PLACEHOLDER_SCHEME`
    // + 裸 `-` 项目符号,一条任务卡 pattern 都匹配不上 —— 加 pattern 前这里是 false
    expect(isEmptyShell(createAdrTemplate("ADR-20260101000000001", "t"))).toBe(true);
  });

  it("a filled ADR is NOT a shell — REQUIRED comments stay in filled files", () => {
    // 那些 `<!-- ⚠️ REQUIRED: … -->` 是**指令**不是占位符:填好的 ADR 里它们还在,
    // 所以任何把它们当 marker 的检测都会把每一篇 ADR 误报成空壳
    expect(isEmptyShell(filledAdr())).toBe(false);
  });

  it("an ADR with Choice written but a required section still empty is a shell", () => {
    // 部分填写的形态:Choice 换了,但背景/驱动/影响仍是空的(只剩指令注释)
    const partial = createAdrTemplate("ADR-20260101000000002", "t")
      .replace("**Choice**: ⚠️ PLACEHOLDER_SCHEME", "**Choice**: Option B");
    expect(isEmptyShell(partial)).toBe(true);
  });

  it("a bullet with nothing after it is NOT a marker (measured: 2 hand-filled ADRs have one)", () => {
    // 曾被考虑作为 ADR 空壳的第二式,已否决:`/^-\\s*$/` 在本仓 112 篇 ADR 里
    // 命中 2 篇**填好的**,即它会制造关于健康文件的覆盖率假象。
    const content = "# ADR-1: t\n\n## Decision Drivers\n<!-- ⚠️ REQUIRED: x -->\n- why\n\n- \n\n## Options\n- a real bullet\n";
    expect(isEmptyShell(content)).toBe(false);
  });
});

/** 一篇"填好了的" ADR:占位符换掉,每个 REQUIRED 段后面接上内容。 */
function filledAdr(): string {
  return createAdrTemplate("ADR-20260101000000003", "t")
    .replace("**Choice**: ⚠️ PLACEHOLDER_SCHEME", "**Choice**: Option B (selected)")
    .replace(/^(<!-- ⚠️ REQUIRED:[^\n]*-->)$/gm, "$1\n\nFilled-in prose for this required section.");
}

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

describe('ADR supersession drift (guard for the frontmatter convention)', () => {
  it('a superseded ADR with superseded_by: null is reported — null must not read as "not superseded"', () => {
    const content = '---\nsupersedes: []\nsuperseded_by: null\n---\n\n# ADR-1: t\n'
    expect(parseRelations(content).supersededBy).toBe(null) // 现状:null 无法自证"被取代"
    expect(isSupersededWithoutPointer(content)).toBe(true)
  })

  it('a pointer at a non-existent ADR is not "resolved"', () => {
    const content = '---\nsupersedes: []\nsuperseded_by: ADR-999\n---\n\n# ADR-2: t\n'
    expect(isSupersededWithoutPointer(content, ['ADR-1'])).toBe(true)  // ADR-999 不在已知集合里
    expect(isSupersededWithoutPointer(content, ['ADR-999'])).toBe(false)
  })

  it('a proper pointer resolves (no false positive on the real corpus shape)', () => {
    const content = '---\nsupersedes: []\nsuperseded_by: ADR-20260910112404500\n---\n\n# ADR-3: t\n'
    expect(isSupersededWithoutPointer(content, ['ADR-20260910112404500'])).toBe(false)
  })
})
