/**
 * Validation plan + executor.
 *
 * `buildValidationPlan` is pure — it parses the input and chooses which
 * checks to run. `executeValidationPlan` performs the side-effecting
 * remote tree fetch via injected IO and produces a `ValidationReport`.
 *
 * Per ADR-20260507014124191, the report is structured data so agents
 * can recover from validation failure (suggested fixes, detected paths)
 * instead of parsing strings.
 */
import type { Locator, SuggestedFix, ValidationFindings, ValidationReport } from './types.js'
import { parseLocator, formatLocator } from './parse-locator.js'
import type { FetchFn, TreeResponse } from './github-tree.js'
import { fetchRepoTree } from './github-tree.js'
import { inferSkillPath } from './infer-skill-path.js'

export type ValidationCheck = 'syntax' | 'remote' | 'path'

export interface ValidationPlan {
  readonly rawInput: string
  readonly locator: Locator | null
  readonly checks: ReadonlyArray<ValidationCheck>
  /** Optional git ref to validate against (default: HEAD). */
  readonly ref?: string
}

export interface ValidationIO {
  fetch?: FetchFn
  log?: (msg: string) => void
}

const DEFAULT_CHECKS: ValidationCheck[] = ['syntax', 'remote', 'path']

export function buildValidationPlan(
  rawInput: string,
  opts?: { checks?: ReadonlyArray<ValidationCheck>; ref?: string },
): ValidationPlan {
  return {
    rawInput,
    locator: parseLocator(rawInput),
    checks: opts?.checks ?? DEFAULT_CHECKS,
    ref: opts?.ref,
  }
}

export async function executeValidationPlan(
  plan: ValidationPlan,
  io?: ValidationIO,
): Promise<ValidationReport> {
  const fixes: SuggestedFix[] = []

  // ── 1. Syntax phase ───────────────────────────────────────────────
  if (!plan.locator) {
    fixes.push({
      action: 'update-locator',
      confidence: 0.5,
      message: 'Locator must be FQ: host.tld/owner/repo[/skill] or localhost/<name>. Bare names are rejected per ADR-20260502012643244.',
    })
    return {
      status: 'invalid',
      locator: plan.rawInput,
      phase: 'syntax',
      findings: { parseError: 'parseLocator returned null' },
      suggestedFixes: fixes,
    }
  }

  if (!plan.checks.includes('syntax')) {
    // Skipped; treat as if we only got past parsing but not asked to remote-check.
  }

  // ── 2. Localhost early-return ─────────────────────────────────────
  if (plan.locator.isLocalhost) {
    return {
      status: 'valid',
      locator: plan.rawInput,
      phase: 'syntax',
      findings: {},
      suggestedFixes: [],
    }
  }

  // ── 3. Remote phase (and 4. Path phase) ───────────────────────────
  if (!plan.checks.includes('remote') && !plan.checks.includes('path')) {
    return {
      status: 'valid',
      locator: plan.rawInput,
      phase: 'syntax',
      findings: {},
      suggestedFixes: [],
    }
  }

  const tree: TreeResponse = await fetchRepoTree(
    plan.locator.host,
    plan.locator.owner!,
    plan.locator.repo!,
    plan.ref,
    io?.fetch,
  )

  io?.log?.(`tree fetch: ${tree.status} (http ${tree.httpStatus})`)

  if (tree.status === 'not-found') {
    fixes.push({
      action: 'update-locator',
      confidence: 0.7,
      message: `repo not found on ${plan.locator.host}. Verify owner/repo spelling.`,
    })
    return {
      status: 'invalid',
      locator: plan.rawInput,
      phase: 'repo-existence',
      findings: { repoExists: false, remoteStatus: 404 },
      suggestedFixes: fixes,
    }
  }

  if (tree.status === 'rate-limited' || tree.status === 'network-error' || tree.status === 'unsupported-host') {
    // Cannot determine — return ambiguous, agent decides whether to clone-and-test
    fixes.push({
      action: 'prompt-user',
      confidence: 0.3,
      message: tree.message ?? 'remote check failed; locator may still be valid',
    })
    return {
      status: 'ambiguous',
      locator: plan.rawInput,
      phase: 'repo-existence',
      findings: { remoteStatus: tree.httpStatus },
      suggestedFixes: fixes,
    }
  }

  if (tree.status === 'private') {
    fixes.push({
      action: 'prompt-user',
      confidence: 0.6,
      message: `repo appears private; auth is not implemented in cold-pool. Clone manually if access is granted, then deck add will reuse the cold pool entry.`,
    })
    return {
      status: 'ambiguous',
      locator: plan.rawInput,
      phase: 'repo-existence',
      findings: { repoExists: true, repoIsPrivate: true, remoteStatus: 403 },
      suggestedFixes: fixes,
    }
  }

  // tree.status === 'ok'
  if (!plan.checks.includes('path')) {
    return {
      status: 'valid',
      locator: plan.rawInput,
      phase: 'repo-existence',
      findings: { repoExists: true, remoteStatus: 200 },
      suggestedFixes: [],
    }
  }

  // 4. Path phase: scan tree for SKILL.md
  const inference = inferSkillPath(tree.entries, plan.locator.skill)

  const findingsBase: ValidationFindings = {
    repoExists: true,
    remoteStatus: 200,
    skillMdFound: inference.exactMatch !== null,
    detectedPaths: inference.candidates,
  }

  if (plan.locator.skill === null) {
    // standalone — expect SKILL.md at repo root
    if (inference.candidates.includes('')) {
      return {
        status: 'valid',
        locator: plan.rawInput,
        phase: 'skill-md-existence',
        findings: { ...findingsBase, skillMdFound: true },
        suggestedFixes: [],
      }
    }
    if (inference.candidates.length === 0) {
      fixes.push({
        action: 'web-search',
        confidence: 0.4,
        message: 'no SKILL.md found in this repo; the locator may not point to a skill repo',
      })
      return {
        status: 'invalid',
        locator: plan.rawInput,
        phase: 'skill-md-existence',
        findings: findingsBase,
        suggestedFixes: fixes,
      }
    }
    // standalone but skills exist in subdirs → suggest qualifying
    const status = inference.candidates.length === 1 ? 'invalid' : 'ambiguous'
    for (const candidate of inference.candidates) {
      const newLocator = formatLocator({
        ...plan.locator,
        skill: candidate,
      })
      fixes.push({
        action: 'update-locator',
        confidence: inference.candidates.length === 1 ? 0.8 : 0.5,
        message: `repo has skill at '${candidate}/'; qualify the locator`,
        newLocator,
      })
    }
    return {
      status,
      locator: plan.rawInput,
      phase: 'skill-md-existence',
      findings: findingsBase,
      suggestedFixes: fixes,
    }
  }

  // skill subpath given
  if (inference.exactMatch !== null) {
    return {
      status: 'valid',
      locator: plan.rawInput,
      phase: 'skill-md-existence',
      findings: findingsBase,
      suggestedFixes: [],
    }
  }

  // suggest candidates
  for (const candidate of inference.candidates) {
    const newLocator = formatLocator({
      ...plan.locator,
      skill: candidate || null,
    })
    fixes.push({
      action: 'update-locator',
      confidence: candidate.endsWith('/' + plan.locator.skill) || candidate === plan.locator.skill ? 0.9 : 0.4,
      message: `SKILL.md found at '${candidate || '(repo root)'}'`,
      newLocator,
    })
  }
  if (inference.candidates.length === 0) {
    fixes.push({
      action: 'web-search',
      confidence: 0.4,
      message: 'no SKILL.md anywhere in this repo; the locator may not point to a skill repo',
    })
  }

  return {
    status: 'invalid',
    locator: plan.rawInput,
    phase: 'path-existence',
    findings: findingsBase,
    suggestedFixes: fixes,
  }
}
