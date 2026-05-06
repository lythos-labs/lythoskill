/**
 * @lythos/cold-pool — Cold pool service layer.
 *
 * Resource layer: `ColdPool`
 * Plan layer:     `parseLocator`, (future) `buildFetchPlan`, `buildValidationPlan`
 * Execute layer:  (future) `executeFetchPlan` + `gitPull`/`gitClone` IO
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
