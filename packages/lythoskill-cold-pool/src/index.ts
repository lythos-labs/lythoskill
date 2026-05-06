/**
 * @lythos/cold-pool — Cold pool service layer.
 *
 * Resource layer: `ColdPool`
 * Plan layer:     `parseLocator`, `buildValidationPlan`, (future) `buildFetchPlan`
 * Execute layer:  `executeValidationPlan`, (future) `executeFetchPlan`, `gitPull`/`gitClone`
 */
export type {
  Locator,
  ValidationReport,
  ValidationFindings,
  SuggestedFix,
  FetchPlan,
  FetchResult,
  FetchIO,
} from './types.js'

export { parseLocator, formatLocator } from './parse-locator.js'
export { ColdPool, DEFAULT_COLD_POOL_PATH } from './cold-pool.js'

export type { TreeEntry, TreeResponse, FetchFn } from './github-tree.js'
export { fetchRepoTree } from './github-tree.js'

export type { InferenceResult } from './infer-skill-path.js'
export { inferSkillPath } from './infer-skill-path.js'

export type { ValidationPlan, ValidationCheck, ValidationIO } from './validate-plan.js'
export { buildValidationPlan, executeValidationPlan } from './validate-plan.js'
