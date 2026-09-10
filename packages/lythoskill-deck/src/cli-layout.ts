#!/usr/bin/env bun
/**
 * cli-layout.ts — per-CLI skill-dir layout data (typed, sourced)
 *
 * 2026-09-09 CLI skill-dir 普查(16 家)的落地数据层。每行 = 一个 CLI 的:
 *   - symlink 保证分级(docs / issue / hazard)— deck fan-out 的策略输入
 *   - fanOutTargets:该 CLI 扫描的 skills 目录(project ~ 或 home ~ 形式)
 *   - perRunSwitch:per-run 集合切换机制(flag / config / role / none)
 *   - perRoleScoping:per-role 可见性形态(一行数据,不是散文)
 *   - hazards:数据级危险条目(severity + 来源 URL + agent-facing 处置)
 *
 * 来源纪律(ADR:无来源不成规则):
 *   - 每行 source = 一手文档/repo URL;hazards[].ref = 具体 issue/文档 URL
 *   - verifiedAt = 普查取证日(2026-09-09,/tmp 取证 stash + gh API json 可复核)
 *   - 季度复勘归 P6 监视哨;layoutProblems() 是数据自检
 *   - opencode "Windows non-discovery" 传闻 UNVERIFIED(2026-09-10 辩论撤销:原 ref 指向的
 *     docs 页 grep windows/symlink/junction/platform 零命中,无来源支撑该 claim)——
 *     季度复勘时优先查证;在拿到一手 ref 之前不得重新入库。
 *
 * 消费方:link.ts(fan-out 策略 + hazard 警告)、per-run.ts(渲染 per-run 调用)。
 * 本文件不含行为逻辑,只有数据 + 纯函数索引。
 */

export const SYMLINK_TIERS = ["docs", "issue", "hazard"] as const;
export type SymlinkTier = (typeof SYMLINK_TIERS)[number];

export const HAZARD_SEVERITIES = ["data-loss", "warning", "info"] as const;
export type HazardSeverity = (typeof HAZARD_SEVERITIES)[number];

export interface Hazard {
  /** 稳定 slug,供测试/策略引用:'recursive-unlink-delete' */
  id: string;
  severity: HazardSeverity;
  /** 一手来源 URL(issue 或官方文档) */
  ref: string;
  /** agent-facing:是什么 + 怎么处置(简短) */
  note: string;
  /**
   * 激活目录:fan-out 目标命中其中任一(后缀匹配)才在 link 时警告。
   * 共享目录(.agents/skills 全体扫描)上的 data-loss 危险不设激活目录会
   * 让每个默认 deck 每次启动都报警 — 显式数据胜过启发式(ADR 纪律)。
   * 约束:severity = data-loss 的 hazard 必须设 triggerDirs(layoutProblems 强制)。
   */
  triggerDirs?: string[];
}

export interface PerRunSwitch {
  /**
   * flag  = CLI 参数(如 --skills-dir)
   * config= 配置键(如 extra_skill_dirs / option skill-path)
   * role  = 切的是角色/mode 而非集合(deck per-run 渲染不支持)
   * none  = 无此能力
   */
  kind: "flag" | "config" | "role" | "none";
  /** 机制名:flag/config 时为键名;role/none 时为空串 */
  primary: string;
  /** flag 可重复出现(--skills-dir 可多次) */
  repeatable?: boolean;
  /** 持久化配置里的键名(与 primary 不同时给出,如 kimi 的 extra_skill_dirs) */
  configKey?: string;
  /** 补充说明(如 codex:--profile 切 config 不切 skills) */
  note?: string;
}

export interface CliLayout {
  /** 稳定 id(kebab),也是 per-run 渲染的 --cli 取值 */
  id: string;
  name: string;
  symlinkTier: SymlinkTier;
  /** 扫描的 skills 目录;"~/" 前缀 = home-relative,否则 project-relative */
  fanOutTargets: string[];
  perRunSwitch: PerRunSwitch;
  /** per-role 可见性形态,一行数据 */
  perRoleScoping: string;
  hazards: Hazard[];
  /** 一手验证 URL */
  source: string;
  /** 验证日(ISO date) */
  verifiedAt: string;
}

/**
 * 普查宣称 16 家。2026-09-09 取证窗口(/tmp,14:55–15:45)可复核 15 家的
 * 一手 fetch 痕迹;第 16 家原报告未持久化,经零上下文验证 agent 补查确认
 * 为 Qwen Code(候选清单按序首个 VERIFIED;Replit/Copilot/Augment 亦达标
 * 但顺序靠后)。全部 16 行的 issue URL 经该 agent 逐条复核(2026-09-09)。
 */
export const SURVEY_CLAIMED_COUNT = 16;

export const CLI_LAYOUTS: readonly CliLayout[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    symlinkTier: "docs",
    fanOutTargets: [".claude/skills", "~/.claude/skills"],
    perRunSwitch: { kind: "flag", primary: "--plugin-dir" },
    perRoleScoping: "skills: frontmatter is preload, not restriction",
    hazards: [
      {
        id: "windows-discovery-fails",
        severity: "info",
        ref: "https://github.com/anthropics/claude-code/issues/92129",
        note: "Skill discovery fails on Windows for ~/.claude skills (open issue); macOS/Linux unaffected",
      },
      {
        id: "slash-skips-symlinked-dirs",
        severity: "info",
        ref: "https://github.com/anthropics/claude-code/issues/14836",
        note: "/skills may miss symlinked directories (open issue); official docs still guarantee symlink support",
      },
    ],
    source: "https://code.claude.com/docs/en/skills",
    verifiedAt: "2026-09-09",
  },
  {
    id: "roo-code",
    name: "Roo Code",
    symlinkTier: "docs",
    fanOutTargets: [".roo/skills", ".agents/skills", "~/.roo/skills"],
    perRunSwitch: { kind: "role", primary: "", note: "switches mode, not skill set; per-mode rules-{slug}/" },
    perRoleScoping: "rules-{slug}/ per mode",
    hazards: [],
    source: "https://docs.roocode.ai/features/skills",
    verifiedAt: "2026-09-09",
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    symlinkTier: "docs",
    fanOutTargets: [".agents/skills", "~/.gemini/skills"],
    perRunSwitch: { kind: "flag", primary: "--extensions", note: "bundles role+skills" },
    perRoleScoping: "no per-role skills field (verified)",
    hazards: [
      {
        id: "junction-duplicate-warnings",
        severity: "info",
        ref: "https://github.com/google-gemini/gemini-cli/issues/28944",
        note: "Duplicate warnings when .gemini symlinked/junctioned to .agents; fix PRs #28956/#28968 merged",
      },
    ],
    source: "https://github.com/google-gemini/gemini-cli",
    verifiedAt: "2026-09-09",
  },
  {
    id: "codex",
    name: "Codex",
    symlinkTier: "docs",
    fanOutTargets: [".agents/skills", "~/.codex/skills"],
    perRunSwitch: { kind: "none", primary: "", note: "--profile switches config, not skills" },
    perRoleScoping: "none",
    hazards: [
      {
        id: "skills-open-symlink-issues",
        severity: "warning",
        ref: "https://github.com/openai/codex/issues/31592",
        note: "5 open symlink issues for skills (discovery ignores symlinked SKILL.md #31592, name loss #34054, plugin-namespace inherit #40070, ~/.codex not found #39805, uninstall path rejected #43772). AGENTS.md chain allows symlinks; symlinked CODEX_HOME needs opt-in. Keep symlinks valid; name-loss risk noted",
      },
    ],
    source: "https://github.com/openai/codex",
    verifiedAt: "2026-09-09",
  },
  {
    id: "goose",
    name: "Goose",
    symlinkTier: "hazard",
    fanOutTargets: [".goose/skills", ".agents/skills", "~/.config/goose/skills"],
    perRunSwitch: { kind: "flag", primary: "--with-extension", note: "recipes also switch context" },
    perRoleScoping: "none (recipes/extensions, not per-role)",
    hazards: [
      {
        id: "recursive-unlink-delete",
        severity: "data-loss",
        ref: "https://github.com/aaif-goose/goose/issues/11600",
        note: "Removing a project-linked skill via Goose recursively deletes the symlink TARGET (cold-pool content). Never remove deck skills through the Goose UI — use `deck remove`. Deck's own unlink path never recurses into a symlink target",
        triggerDirs: [".goose/skills"],
      },
    ],
    source: "https://block.github.io/goose/docs/tutorials/using-skills",
    verifiedAt: "2026-09-09",
  },
  {
    id: "opencode",
    name: "opencode",
    symlinkTier: "issue",
    fanOutTargets: [".agents/skills", "~/.config/opencode/skills"],
    perRunSwitch: { kind: "none", primary: "" },
    perRoleScoping: "permission.skill deny/allow patterns (strongest found)",
    hazards: [
      {
        id: "duplicate-name-two-roots",
        severity: "warning",
        ref: "https://github.com/anomalyco/opencode/issues/46327",
        note: "Same skill name discovered via two scanned roots → duplicate-name WARN. Do not fan the same deck into two opencode-scanned directories",
      },
      {
        id: "symlink-cycle-enametoolong",
        severity: "warning",
        ref: "https://github.com/anomalyco/opencode/issues/45961",
        note: "Symlink cycle → ENAMETOOLONG crash. Deck guarantees acyclic absolute symlinks; a source inside the fan-out dir is refused at link time",
      },
    ],
    source: "https://opencode.ai/docs/skills/",
    verifiedAt: "2026-09-09",
  },
  {
    id: "cline",
    name: "Cline",
    symlinkTier: "issue",
    fanOutTargets: [".agents/skills", ".clinerules"],
    perRunSwitch: { kind: "role", primary: "", note: "custom modes switch role, not skill set" },
    perRoleScoping: "none",
    hazards: [
      {
        id: "clinerules-symlink-not-followed",
        severity: "warning",
        ref: "https://github.com/cline/cline/issues/3092",
        note: ".clinerules/ symlinks confirmed NOT followed (bug #3092, closed; behavior re-verified 2026-09-09) — copy/rsync target. Deck fans Cline's .clinerules dir as snapshot; skills-dir (.agents/skills) symlink support is unverified but left as-is (deck default is the survey-validated projection)",
        triggerDirs: [".clinerules"],
      },
    ],
    source: "https://docs.cline.com/features/cline-rules",
    verifiedAt: "2026-09-09",
  },
  {
    id: "crush",
    name: "Crush",
    symlinkTier: "issue",
    fanOutTargets: [".crush/skills", ".agents/skills", "~/.config/crush/skills"],
    perRunSwitch: { kind: "config", primary: "skill-path", repeatable: true, note: "list option (`option skill-path <dir>` appends; `option reset skill-path` clears)" },
    perRoleScoping: "none",
    hazards: [
      {
        id: "symlink-support-unverified",
        severity: "info",
        ref: "https://github.com/charmbracelet/crush",
        note: "Scans .agents/skills pair; no explicit symlink guarantee found in docs — treat as unverified",
      },
    ],
    source: "https://github.com/charmbracelet/crush",
    verifiedAt: "2026-09-09",
  },
  {
    id: "cursor",
    name: "Cursor",
    symlinkTier: "issue",
    fanOutTargets: [".agents/skills", "~/.cursor/skills"],
    perRunSwitch: { kind: "role", primary: "", note: "switches mode, not skill set" },
    perRoleScoping: "mode-scoped",
    hazards: [
      {
        id: "symlink-support-unverified",
        severity: "info",
        ref: "https://cursor.com/docs",
        note: "Scans .agents/skills pair; no explicit symlink guarantee found — treat as unverified",
      },
    ],
    source: "https://cursor.com/docs",
    verifiedAt: "2026-09-09",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    symlinkTier: "issue",
    fanOutTargets: [".windsurf/skills", "~/.codeium/windsurf/skills"],
    perRunSwitch: { kind: "role", primary: "", note: "memories/rules/workflows are mode-flavored, not set-switching" },
    perRoleScoping: "memories/rules/workflows per feature",
    hazards: [
      {
        id: "docs-migrated-cognition",
        severity: "info",
        ref: "https://docs.devin.ai/windsurf/",
        note: "Docs migrated to Cognition docs.devin.ai (infra drift — recheck URLs at quarterly survey)",
      },
      {
        id: "symlink-support-unverified",
        severity: "info",
        ref: "https://docs.devin.ai/windsurf/",
        note: "No explicit symlink guarantee found — treat as unverified",
      },
    ],
    source: "https://docs.devin.ai/windsurf/",
    verifiedAt: "2026-09-09",
  },
  {
    id: "kimi",
    name: "Kimi CLI",
    symlinkTier: "issue",
    fanOutTargets: [".agents/skills", "~/.config/agents/skills"],
    perRunSwitch: { kind: "flag", primary: "--skills-dir", repeatable: true, configKey: "extra_skill_dirs", note: "only purpose-built external-skill-dir key found in survey" },
    perRoleScoping: "none",
    hazards: [
      {
        id: "symlink-support-unverified",
        severity: "info",
        ref: "https://github.com/MoonshotAI/kimi-cli",
        note: "Scans .agents/skills pair; no explicit symlink guarantee found — treat as unverified",
      },
    ],
    source: "https://github.com/MoonshotAI/kimi-cli",
    verifiedAt: "2026-09-09",
  },
  {
    id: "kiro",
    name: "Kiro CLI",
    symlinkTier: "issue",
    fanOutTargets: [".kiro/skills", ".agents/skills", "~/.kiro/skills"],
    perRunSwitch: { kind: "none", primary: "" },
    perRoleScoping: "cleanest found: custom agents default zero skills, resources skill:// URI explicit pull",
    hazards: [
      {
        id: "symlink-support-unverified",
        severity: "info",
        ref: "https://kiro.dev/docs/",
        note: "Scans .agents/skills pair; no explicit symlink guarantee found — treat as unverified",
      },
    ],
    source: "https://kiro.dev/docs/",
    verifiedAt: "2026-09-09",
  },
  {
    id: "aider",
    name: "Aider / AiderDesk",
    symlinkTier: "issue",
    fanOutTargets: [".aider-desk/skills", "~/.aider-desk/skills"],
    perRunSwitch: { kind: "none", primary: "" },
    perRoleScoping: "none",
    hazards: [
      {
        id: "symlink-support-unverified",
        severity: "info",
        ref: "https://aider.chat/docs/",
        note: "No explicit symlink guarantee found — treat as unverified",
      },
    ],
    source: "https://aider.chat/docs/",
    verifiedAt: "2026-09-09",
  },
  {
    id: "amp",
    name: "Amp",
    symlinkTier: "issue",
    fanOutTargets: [".agents/skills", "~/.config/agents/skills"],
    perRunSwitch: { kind: "none", primary: "" },
    perRoleScoping: "none found",
    hazards: [
      {
        id: "symlink-support-unverified",
        severity: "info",
        ref: "https://ampcode.com/manual/",
        note: "Scans .agents/skills pair; no explicit symlink guarantee found — treat as unverified",
      },
    ],
    source: "https://ampcode.com/manual/",
    verifiedAt: "2026-09-09",
  },
  {
    id: "dsh",
    name: "dsh (DeepSeek Harness)",
    symlinkTier: "issue",
    fanOutTargets: [],
    perRunSwitch: { kind: "none", primary: "", note: "agent presets ≙ deck concept; no per-run dir flag" },
    perRoleScoping: "ctx.skills layered registry, nearest-layer-wins (only registry-level per-role visibility found; agent-teams plugin lacks per-member scoping)",
    hazards: [
      {
        id: "everything-is-plugin",
        severity: "info",
        ref: "https://deepseek-harness.github.io/deepseek-harness/",
        note: "Skills arrive via plugins (Cordis kernel), not scanned dirs — fan-out model does not apply",
      },
    ],
    source: "https://deepseek-harness.github.io/deepseek-harness/",
    verifiedAt: "2026-09-09",
  },
  {
    id: "qwen-code",
    name: "Qwen Code",
    symlinkTier: "issue",
    fanOutTargets: [".qwen/skills", "~/.qwen/skills"],
    perRunSwitch: { kind: "none", primary: "" },
    perRoleScoping: "none",
    hazards: [
      {
        id: "symlink-support-unverified",
        severity: "info",
        ref: "https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/skills.md",
        note: "Official docs verify branded dirs (~/.qwen/skills personal, .qwen/skills project) + /skills and /learn commands; no explicit symlink guarantee found — treat as unverified. Row restored by zero-context verification agent (original survey report unpersisted)",
      },
    ],
    source: "https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/skills.md",
    verifiedAt: "2026-09-09",
  },
];

// ── 纯函数索引 ────────────────────────────────────────────────

/** 归一化:~/.x 与 .x 视为同目录(比较用) */
function normalizeDir(p: string): string {
  return p.replace(/^~\//, "").replace(/^\.\//, "").replace(/\/+$/, "");
}

/**
 * 哪些 CLI 会扫描 dir(如 ".agents/skills" / ".claude/skills")?
 * 匹配规则:归一化后相等,或以 "/<target>" 结尾(覆盖 project/home 前缀差异)。
 * 不用 basename 匹配 — 裸 "skills" 目录(dsh 约定)会误命中所有 CLI。
 */
export function layoutsScanning(dir: string): CliLayout[] {
  const norm = normalizeDir(dir);
  return CLI_LAYOUTS.filter(a =>
    a.fanOutTargets.some(t => {
      const tn = normalizeDir(t);
      return norm === tn || norm.endsWith("/" + tn);
    })
  );
}

/** dir 是否命中 pattern(同 layoutsScanning 的后缀规则) */
export function dirMatches(dir: string, pattern: string): boolean {
  const norm = normalizeDir(dir);
  const tn = normalizeDir(pattern);
  return norm === tn || norm.endsWith("/" + tn);
}

/**
 * 该 fan-out 目标的链接模式覆盖 + 原因。
 * 只认 hazard 的 triggerDirs(如 .clinerules = 实测不跟随 → snapshot);
 * 共享 .agents/skills 上"unverified"不构成覆盖理由 — deck 默认投影是
 * 普查验证过的设计,不为单个 CLI 的未验证行为改默认。
 * docs 级目标返回 undefined = 保持 deck 全局 mode(AC:行为不变)。
 */
export function targetModeOverride(dir: string): { mode: "snapshot"; reason: string } | undefined {
  const cline = layoutById("cline");
  const h = cline?.hazards.find(x => x.id === "clinerules-symlink-not-followed");
  if (cline && h?.triggerDirs?.some(td => dirMatches(dir, td))) {
    return { mode: "snapshot", reason: `Cline does not follow symlinks here — copy target (${h.ref})` };
  }
  return undefined;
}

/**
 * 数据自检(测试 + 未来 validate 命令用):
 * 每行 id 唯一、tier/severity 合法、source 是 URL、verifiedAt 是 ISO 日期。
 * 行数缺口(普查 16 vs 实际落行)显式报告,不静默。
 */
export function layoutProblems(): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const a of CLI_LAYOUTS) {
    if (!a.id || seen.has(a.id)) problems.push(`duplicate or missing id: ${a.id}`);
    seen.add(a.id);
    if (!(SYMLINK_TIERS as readonly string[]).includes(a.symlinkTier))
      problems.push(`${a.id}: invalid symlinkTier ${a.symlinkTier}`);
    if (!/^https?:\/\//.test(a.source)) problems.push(`${a.id}: source is not a URL: ${a.source}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.verifiedAt)) problems.push(`${a.id}: verifiedAt not ISO date: ${a.verifiedAt}`);
    for (const h of a.hazards) {
      if (!(HAZARD_SEVERITIES as readonly string[]).includes(h.severity))
        problems.push(`${a.id}: hazard ${h.id} invalid severity ${h.severity}`);
      if (!/^https?:\/\//.test(h.ref)) problems.push(`${a.id}: hazard ${h.id} ref is not a URL`);
      if (h.severity === "data-loss" && (!h.triggerDirs || h.triggerDirs.length === 0))
        problems.push(`${a.id}: hazard ${h.id} is data-loss without triggerDirs — would warn on every deck`);
    }
  }
  if (CLI_LAYOUTS.length < SURVEY_CLAIMED_COUNT) {
    problems.push(
      `cli-layout table has ${CLI_LAYOUTS.length} rows, survey claimed ${SURVEY_CLAIMED_COUNT} — ` +
        `roster gap must be resolved by re-survey (P6 watch) or the missing row restored`
    );
  }
  return problems;
}

export function layoutById(id: string): CliLayout | undefined {
  return CLI_LAYOUTS.find(a => a.id === id);
}
