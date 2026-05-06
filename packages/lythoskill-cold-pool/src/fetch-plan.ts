/**
 * FetchPlan + executor.
 *
 * Per-locator fetch primitive. `buildFetchPlan` is pure (computes
 * targetDir + cloneUrl, peeks fs for `alreadyExists`). `executeFetchPlan`
 * does the side-effecting `git clone` via injected IO.
 *
 * Localhost locators are not fetchable (no remote) — `buildFetchPlan`
 * returns a plan with `alreadyExists: pool.has(locator)` but
 * `executeFetchPlan` will refuse to clone (status: 'failed').
 */
import { existsSync } from 'node:fs'
import type { ColdPool } from './cold-pool.js'
import type { Locator, FetchPlan, FetchResult, FetchIO } from './types.js'
import { gitClone } from './git-io.js'

export function buildFetchPlan(
  pool: ColdPool,
  locator: Locator,
  opts?: { ref?: string },
): FetchPlan {
  const targetDir = pool.resolveDir(locator)
  const cloneUrl = locator.isLocalhost
    ? ''
    : `https://${locator.host}/${locator.owner}/${locator.repo}.git`

  return {
    locator,
    cloneUrl,
    targetDir,
    ref: opts?.ref,
    alreadyExists: existsSync(targetDir),
  }
}

export function executeFetchPlan(plan: FetchPlan, io?: FetchIO): FetchResult {
  const log = io?.log ?? (() => {})
  const exists = io?.exists ?? existsSync
  const cloneFn = io?.gitClone ?? gitClone

  if (plan.locator.isLocalhost) {
    return {
      status: 'failed',
      targetDir: plan.targetDir,
      message: 'localhost locators have no remote; nothing to fetch',
    }
  }

  if (exists(plan.targetDir)) {
    log(`✓ already present: ${plan.targetDir}`)
    return {
      status: 'already-present',
      targetDir: plan.targetDir,
    }
  }

  log(`📦 cloning ${plan.cloneUrl} → ${plan.targetDir}`)
  try {
    cloneFn(plan.cloneUrl, plan.targetDir, { depth: 1, ref: plan.ref })
    return {
      status: 'cloned',
      targetDir: plan.targetDir,
    }
  } catch (err: unknown) {
    const e = err as { message?: string }
    return {
      status: 'failed',
      targetDir: plan.targetDir,
      message: e.message ?? 'git clone failed',
    }
  }
}
