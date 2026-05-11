/**
 * guard — Centralized safety primitives for curator CLI.
 *
 * Curator is the most IO-heavy package (SQL + git + filesystem).
 * This module centralizes path validation, safe git execution,
 * and SQL safety checks.
 *
 * Reference: curator sweep 2026-05-10 P0/P1 findings
 */

import { execFileSync } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import { resolve, isAbsolute } from "node:path"
import { Parser } from "node-sql-parser"

// ── SQL safety ─────────────────────────────────────────────

const sqlParser = new Parser()
const READONLY_TYPES = new Set(["select", "use", "set", "show", "desc", "describe"])

/** Check if a SQL query is read-only — uses a real SQL parser, not regex. */
export function isReadOnlyQuery(sql: string): boolean {
  try {
    const ast = sqlParser.astify(sql.trim())
    if (Array.isArray(ast)) {
      return ast.every((stmt: any) => READONLY_TYPES.has(stmt.type))
    }
    return READONLY_TYPES.has((ast as any).type)
  } catch {
    return false
  }
}

// ── Git safety ──────────────────────────────────────────────

/**
 * Run a git command safely — uses execFileSync with array args,
 * never string interpolation. Prevents shell injection via repo paths.
 */
export function safeGit(args: string[], opts?: { cwd?: string; timeout?: number; stdio?: 'pipe' | 'inherit' }): string {
  return execFileSync("git", args, {
    encoding: "utf-8",
    timeout: opts?.timeout ?? 30_000,
    cwd: opts?.cwd,
    stdio: opts?.stdio ?? "pipe",
  }).trim()
}

// ── Path safety ─────────────────────────────────────────────

/**
 * Validate a path stays within the cold pool.
 * All curator commands that accept locators or repo paths must use this.
 */
export function validateInColdPool(targetPath: string, poolPath: string): string {
  if (targetPath.includes("..")) {
    throw new Error(`Path contains parent traversal (..): ${targetPath}`)
  }
  if (targetPath.includes("\0")) {
    throw new Error(`Path contains null byte`)
  }

  const resolved = isAbsolute(targetPath) ? resolve(targetPath) : resolve(poolPath, targetPath)
  const resolvedPool = resolve(poolPath)

  if (!resolved.startsWith(resolvedPool + "/") && resolved !== resolvedPool) {
    throw new Error(
      `Path "${targetPath}" resolves outside the cold pool.\n` +
      `  Resolved: ${resolved}\n` +
      `  Pool:     ${resolvedPool}`
    )
  }

  return resolved
}

/**
 * Safe rmSync — only deletes paths within an allowed root.
 * All curator commands that call rmSync MUST use this wrapper.
 */
export function safeRmSync(targetPath: string, rootPath: string, opts?: { recursive?: boolean; force?: boolean }): void {
  const safePath = validateInColdPool(targetPath, rootPath)
  rmSync(safePath, { recursive: opts?.recursive ?? true, force: opts?.force ?? true })
}
