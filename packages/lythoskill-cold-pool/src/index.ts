/**
 * @lythos/cold-pool — Cold pool service layer.
 *
 * Resource layer: `ColdPool`
 * Plan layer:     `parseLocator`, `buildValidationPlan`, `buildFetchPlan`
 * Execute layer:  `executeValidationPlan`, `executeFetchPlan`, git IO primitives
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

export type { RepoRef, SkillHash, DeckReference } from './metadata-db.js'
export { MetadataDB } from './metadata-db.js'

export type { TreeEntry, TreeResponse, FetchFn } from './github-tree.js'
export { fetchRepoTree } from './github-tree.js'

export type { InferenceResult } from './infer-skill-path.js'
export { inferSkillPath } from './infer-skill-path.js'

export type { ValidationPlan, ValidationCheck, ValidationIO } from './validate-plan.js'
export { buildValidationPlan, executeValidationPlan } from './validate-plan.js'

export type { GitCloneOptions, GitPullResult, GitRootResult } from './git-io.js'
export { gitClone, gitPull, detectGitRoot } from './git-io.js'

export { buildFetchPlan, executeFetchPlan } from './fetch-plan.js'

export type { GitHashIO } from './git-hash.js'
export { getRepoHeadRef, getSkillBlobHash, getSkillTreeHash, hashSkillMd } from './git-hash.js'
