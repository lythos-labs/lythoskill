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

/**
 * 写路径的 TOML 读取:**读不了就说清楚,不把解析器栈甩给用户**。
 *
 * `@iarna/toml` 在多行内联表这类形状上抛的是**原始 TomlError 栈**(实测:
 * `meta = {\n a = 1\n}` → "Unterminated inline array" + 整段 parser 栈)。
 * 栈是噪声:用户拿到的是"工具崩了",而不是"你的 deck 第 6 行长什么样"。
 * 与 `deck add --dry-run` 的 TDZ 同一类 —— 崩在"本该给消息"的地方
 * (TASK-20260910160707856)。
 *
 * `remove` 与 `add` 共用这一条读法:同一份坏 deck,两个命令给**同一套说法**。
 * 解析失败**不改盘**(调用方负责 exit),所以 fix 行说的是"什么都没动"。
 * 措辞与 `toml-splice.ts` 的 `would-corrupt` 同源(那里是写入前的最后一闸):
 * "cannot be read by the tool's own parser" / "'deck validate' uses the same parser"。
 */
export function readDeckOrExplain(
  raw: string,
  deckPath: string
):
  | { ok: true; doc: Record<string, any> }
  | { ok: false; lines: string[] } {
  try {
    return { ok: true, doc: parseToml(raw) as Record<string, any> };
  } catch (e: any) {
    const detail = String(e?.message ?? e).trimEnd();
    return {
      ok: false,
      lines: [
        `❌ Cannot read ${deckPath}`,
        `   why:  this deck cannot be read by the tool's own parser —`,
        ...detail.split("\n").map((l) => `         ${l}`),
        `   fix:  fix the deck by hand, then re-run — nothing was changed on disk.`,
        `         'deck validate' uses the same parser and reports the same error first.`,
      ],
    };
  }
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
