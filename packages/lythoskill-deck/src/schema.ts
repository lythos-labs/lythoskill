import { z } from "zod";

// ── 单个已链接 Skill (lock 子集) ────────────────────────────
export const LockSkillSchema = z.object({
  name: z.string(),
  alias: z.string(),
  deck_niche: z.string(),
  type: z.enum(["innate", "tool", "transient"]),
  source: z.string(),
  content_hash: z.string().optional(),
});

// ── 单个已链接 Skill (state 子集) ───────────────────────────
export const StateSkillSchema = z.object({
  alias: z.string(),
  linked_at: z.string().datetime(),
  dest: z.string(),
  mode: z.enum(["symlink", "snapshot"]).default("symlink"),
  deck_managed_dirs: z.array(z.string()).default([]),
});

// ── 单个已链接 Skill (完整) ─────────────────────────────────
export const LinkedSkillSchema = z.object({
  name: z.string(),
  alias: z.string(),
  deck_niche: z.string(),
  type: z.enum(["innate", "tool", "transient"]),
  source: z.string(),
  dest: z.string(),
  /** Link mode: symlink (live, follows cold pool) or snapshot (pinned copy). */
  mode: z.enum(["symlink", "snapshot"]).default("symlink"),
  content_hash: z.string().optional(),
  linked_at: z.string().datetime(),
  expires: z.string().optional(),
  /** 该 skill 声明管理的目录列表 */
  deck_managed_dirs: z.array(z.string()).default([]),
});

// ── 约束校验 ────────────────────────────────────────────────
export const ConstraintReportSchema = z.object({
  total_cards: z.number().int().min(0),
  max_cards: z.number().int().min(0),
  within_budget: z.boolean(),
  transient_warnings: z.array(
    z.object({
      name: z.string(),
      expires: z.string(),
      days_remaining: z.number().int(),
    })
  ),
  /** 两个以上 skill 声明管理同一目录 */
  dir_overlaps: z.array(
    z.object({
      dir: z.string(),
      skills: z.array(z.string()),
    })
  ),
});

// ── 完整 lock 文件 (declarative, git-tracked) ───────────────
export const SkillDeckLockSchema = z.object({
  version: z.literal("1.0.0"),
  deck_source: z.object({
    path: z.string(),
    content_hash: z.string(),
  }),
  deck_config: z.object({
    max_cards: z.number().int().min(1),
    working_set: z.string(),
    cold_pool: z.string(),
    also_link_to: z.array(z.string()).default([]),
  }),
  skills: z.array(LockSkillSchema),
});

// ── 完整 state 文件 (operational, git-ignored) ──────────────
export const SkillDeckStateSchema = z.object({
  version: z.literal("1.0.0"),
  generated_at: z.string().datetime(),
  resolved_paths: z.object({
    working_set: z.string(),
    cold_pool: z.string(),
    also_link_to: z.array(z.string()).default([]),
  }),
  skills: z.array(StateSkillSchema),
  constraints: ConstraintReportSchema,
});

// ── Skill entry (alias-as-key dict body) ──────────────────────
export const SkillEntrySchema = z.object({
  path: z.string().min(1),
  role: z.string().optional(),
  why_in_deck: z.string().optional(),
}).passthrough();

export type SkillEntry = z.infer<typeof SkillEntrySchema>;
export type LinkedSkill = z.infer<typeof LinkedSkillSchema>;
export type LockSkill = z.infer<typeof LockSkillSchema>;
export type StateSkill = z.infer<typeof StateSkillSchema>;
export type ConstraintReport = z.infer<typeof ConstraintReportSchema>;
export type SkillDeckLock = z.infer<typeof SkillDeckLockSchema>;
export type SkillDeckState = z.infer<typeof SkillDeckStateSchema>;
