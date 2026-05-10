/**
 * path-guard — Path validation for arena CLI.
 *
 * Arena accepts deck/task/player paths from CLI arguments. These must
 * be validated to prevent arbitrary file reads and directory traversal.
 *
 * Reference: arena sweep 2026-05-10 P1 path-trust findings
 */

import { resolve, isAbsolute } from "node:path"
import { existsSync } from "node:fs"

/**
 * Validate a deck path: must point to a file within the project or
 * be a valid absolute path. Refuse paths containing ".." traversal.
 */
export function validateDeckPath(raw: string, projectDir: string): string {
  if (raw.includes("..")) {
    throw new Error(`Deck path contains parent traversal (..): ${raw}`)
  }
  if (raw.includes("\0")) {
    throw new Error(`Deck path contains null byte`)
  }

  const resolved = isAbsolute(raw) ? resolve(raw) : resolve(projectDir, raw)

  if (!resolved.startsWith(resolve(projectDir) + "/") && !isAbsolute(raw)) {
    throw new Error(
      `Deck path "${raw}" resolves outside the project directory.\n` +
      `  Resolved: ${resolved}\n` +
      `  Project:  ${resolve(projectDir)}`
    )
  }

  return resolved
}

/**
 * Validate a task path: must be a .md or .agent.md file, must exist,
 * must not traverse outside the project.
 */
export function validateTaskPath(raw: string, projectDir: string): string {
  if (raw.includes("..")) {
    throw new Error(`Task path contains parent traversal (..): ${raw}`)
  }
  if (raw.includes("\0")) {
    throw new Error(`Task path contains null byte`)
  }

  const resolved = isAbsolute(raw) ? resolve(raw) : resolve(projectDir, raw)

  if (!resolved.startsWith(resolve(projectDir) + "/")) {
    throw new Error(
      `Task path "${raw}" resolves outside the project directory.\n` +
      `  Resolved: ${resolved}\n` +
      `  Project:  ${resolve(projectDir)}`
    )
  }

  if (!existsSync(resolved)) {
    throw new Error(`Task file not found: ${raw}\n  Resolved: ${resolved}`)
  }

  return resolved
}

/**
 * Validate the output directory — must be within the project or /tmp.
 * Arena writes agent output and judge verdicts here.
 */
export function validateOutDir(raw: string, projectDir: string): string {
  if (raw.includes("..")) {
    throw new Error(`Output directory contains parent traversal (..): ${raw}`)
  }

  const resolved = isAbsolute(raw) ? resolve(raw) : resolve(projectDir, raw)
  const resolvedProject = resolve(projectDir)

  // Allow /tmp as a valid output target
  if (resolved.startsWith("/tmp/") || resolved === "/tmp") {
    return resolved
  }

  if (!resolved.startsWith(resolvedProject + "/")) {
    throw new Error(
      `Output directory "${raw}" is outside the project.\n` +
      `  Use --out with a path under the project or in /tmp.`
    )
  }

  return resolved
}
