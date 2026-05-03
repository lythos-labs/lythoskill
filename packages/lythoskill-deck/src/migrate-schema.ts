#!/usr/bin/env bun
import { parse as parseToml, stringify } from "@iarna/toml";
import { readFileSync, writeFileSync, renameSync } from "node:fs";
import { parseDeck } from "./parse-deck.js";

export interface MigrateResult {
  migrated: boolean;
  message: string;
  diff?: string;
}

export function migrateSchema(deckPath: string, dryRun: boolean): MigrateResult {
  const raw = readFileSync(deckPath, "utf-8");
  const { deprecated } = parseDeck(raw);

  if (!deprecated) {
    return {
      migrated: false,
      message: "No migration needed: deck.toml already uses alias-as-key dict schema.",
    };
  }

  const parsed = parseToml(raw) as any;

  for (const section of ["innate", "tool", "combo"] as const) {
    const skills = parsed[section]?.skills;
    if (!Array.isArray(skills)) continue;

    delete parsed[section].skills;
    const entries: Record<string, { path: string }> = {};
    for (const name of skills) {
      if (!name || typeof name !== "string") continue;
      const alias = name.split("/").pop() || name;
      entries[alias] = { path: name };
    }
    parsed[section] = { skills: entries };
  }

  const newToml = stringify(parsed);

  if (dryRun) {
    return {
      migrated: true,
      message: `Dry run — would migrate ${deckPath} to alias-as-key dict schema:`,
      diff: newToml,
    };
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${deckPath}.bak.${ts}`;
  renameSync(deckPath, backupPath);
  writeFileSync(deckPath, newToml);

  return {
    migrated: true,
    message: `Migrated ${deckPath} → alias-as-key dict schema. Backup: ${backupPath}`,
  };
}
