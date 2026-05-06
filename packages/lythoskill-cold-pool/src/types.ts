/**
 * Core types for @lythos/cold-pool.
 *
 * Plan-shaped data structures for the intent/plan/execute pattern, plus
 * the FQ Locator form per ADR-20260502012643244.
 */

/**
 * Parsed FQ locator. Per ADR-20260502012643244, three forms only:
 *   - `host.tld/owner/repo[/skill]` (remote)
 *   - `host.tld/owner/repo` (standalone — repo root has SKILL.md, skill = null)
 *   - `localhost/<name>` (no remote origin — owner/repo are null)
 *
 * Bare names and shorthand `owner/repo` are rejected by `parseLocator`.
 */
export interface Locator {
  readonly raw: string
  readonly host: string
  readonly owner: string | null
  readonly repo: string | null
  readonly skill: string | null
  readonly isLocalhost: boolean
}

/**
 * Output of `buildValidationPlan`. Pure data.
 *
 * Validation has no separate execute step — the report itself is the plan.
 * Agents and CLI surfaces consume this directly to render structured
 * diagnostics (per ADR-20260507014124191).
 */
export interface ValidationReport {
  readonly status: 'valid' | 'invalid' | 'ambiguous'
  readonly locator: string
  readonly phase: 'syntax' | 'repo-existence' | 'path-existence' | 'skill-md-existence'
  readonly findings: ValidationFindings
  readonly suggestedFixes: ReadonlyArray<SuggestedFix>
}

export interface ValidationFindings {
  readonly parseError?: string
  readonly repoExists?: boolean
  readonly repoIsPrivate?: boolean
  readonly skillMdFound?: boolean
  /** Subdirectories of the cloned repo that contain a SKILL.md, when path-existence fails. */
  readonly detectedPaths?: ReadonlyArray<string>
  /** HTTP status from the remote check, if any. */
  readonly remoteStatus?: number
}

export interface SuggestedFix {
  readonly action: 'update-locator' | 'web-search' | 'prompt-user'
  /** 0..1 — caller decides whether to act unattended. */
  readonly confidence: number
  readonly message: string
  readonly newLocator?: string
}

/** Per-locator fetch plan. Pure data; no side effects. */
export interface FetchPlan {
  readonly locator: Locator
  readonly cloneUrl: string
  readonly targetDir: string
  readonly ref?: string
  /** When true, executor should skip the clone (idempotent fetch). */
  readonly alreadyExists: boolean
}

export interface FetchResult {
  readonly status: 'cloned' | 'already-present' | 'failed'
  readonly targetDir: string
  readonly message?: string
}

/** Injectable IO for `executeFetchPlan`. Test swaps in mocks. */
export interface FetchIO {
  gitClone?: (url: string, dir: string, opts?: { depth?: number; ref?: string }) => void
  exists?: (path: string) => boolean
  log?: (msg: string) => void
}
