import { parse as parseToml } from "@iarna/toml";
import { SkillEntrySchema } from "./schema.js";

export type SkillType = "innate" | "tool";

export interface ParsedSkillEntry {
  alias: string; // working-set flat symlink name = role identity
  path: string;  // FQ locator or local path
  type: SkillType;
  role?: string;
  why_in_deck?: string;
  [key: string]: unknown; // forward-compat: unknown fields pass through
}

export interface ParsedDeck {
  entries: ParsedSkillEntry[];
  deprecated: boolean;
  errors: string[];
  combos: Record<string, string>; // [combo.<name>] prompt — orchestration hints for agents
}

export function parseDeck(raw: string): ParsedDeck {
  let parsed: any;
  try {
    parsed = parseToml(raw) as any;
  } catch (e: any) {
    return { entries: [], deprecated: false, errors: [`TOML parse error: ${e.message}`] };
  }
  const entries: ParsedSkillEntry[] = [];
  const errors: string[] = [];
  let deprecated = false;

  for (const section of ["innate", "tool"] as const) {
    const sectionData = parsed[section];
    if (!sectionData) continue;

    // ── New format: [<type>.skills.<alias>] with path in body ──
    if (
      sectionData.skills &&
      typeof sectionData.skills === "object" &&
      !Array.isArray(sectionData.skills)
    ) {
      for (const [alias, entry] of Object.entries(sectionData.skills)) {
        const e = entry as Record<string, unknown>;
        if (!e?.path || typeof e.path !== "string") {
          errors.push(
            `Missing path for skill "${alias}" in [${section}.skills.${alias}]`
          );
          continue;
        }
        const parsedEntry = SkillEntrySchema.safeParse(e);
        if (!parsedEntry.success) {
          errors.push(
            `Invalid entry "${alias}" in [${section}.skills.${alias}]: ${parsedEntry.error.message}`
          );
          continue;
        }
        entries.push({
          alias,
          path: e.path as string,
          type: section,
          ...parsedEntry.data,
        });
      }
      continue;
    }

    // ── Legacy format: [<type>] with skills = ["...", ...] ──
    const skillsArray = sectionData?.skills;
    if (Array.isArray(skillsArray)) {
      deprecated = true;
      for (const name of skillsArray) {
        if (!name || typeof name !== "string") continue;
        entries.push({
          alias: name.split("/").pop() || name,
          path: name,
          type: section,
        });
      }
    }
  }

  // ── [combo.<name>] prompts — lightweight orchestration hints, not skill sections ──
  const combos: Record<string, string> = {};
  if (parsed.combo && typeof parsed.combo === "object") {
    for (const [name, entry] of Object.entries(parsed.combo)) {
      const e = entry as Record<string, unknown>;
      if (e?.prompt && typeof e.prompt === "string") {
        combos[name] = e.prompt.trim();
      }
    }
  }
  // Legacy: bare [combo] with prompt field → "default"
  if (!combos.default && parsed.combo?.prompt && typeof parsed.combo.prompt === "string") {
    combos.default = parsed.combo.prompt.trim();
  }

  return { entries, deprecated, errors, combos };
}
