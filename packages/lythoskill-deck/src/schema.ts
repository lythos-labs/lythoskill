import { z } from "zod";

// ── 单个已链接 Skill ────────────────────────────────────────
export const LinkedSkillSchema = z.object({
  name: z.string(),
  deck_niche: z.string(),
  type: z.enum(["innate", "tool", "combo", "transient"]),
  source: z.string(),
  dest: z.string(),
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

// ── 完整 lock 文件 ──────────────────────────────────────────
export const SkillDeckLockSchema = z.object({
  version: z.literal("1.0.0"),
  generated_at: z.string().datetime(),
  deck_source: z.object({
    path: z.string(),
    content_hash: z.string(),
  }),
  working_set: z.string(),
  cold_pool: z.string(),
  skills: z.array(LinkedSkillSchema),
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
export type ConstraintReport = z.infer<typeof ConstraintReportSchema>;
export type SkillDeckLock = z.infer<typeof SkillDeckLockSchema>;
