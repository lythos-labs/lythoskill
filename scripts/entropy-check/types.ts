export interface EntropyConfig {
  projectDir: string
  checkpointFile: string
  intervalSeconds: number
  strict: boolean
  dryRun: boolean
  force: boolean
}

export type CheckName =
  | 'cortex-probe'
  | 'symlinks-in-skills'
  | 'working-set-leaks'
  | 'env-var-prefix'
  | 'missing-weekly'

export interface CheckResult {
  name: CheckName
  status: 'pass' | 'fail' | 'warn' | 'skip'
  message: string
  details?: string[]
}

export interface EntropyIO {
  readFile(path: string): string | null
  writeFile(path: string, content: string): void
  exists(path: string): boolean
  exec(command: string, args: string[]): { stdout: string; stderr: string; exitCode: number }
  now(): number
  listDir(path: string): string[]
  log(message: string): void
}

export interface CheckPlan {
  shouldRun: boolean
  reason?: string
  checks: CheckName[]
  checkpointValid: boolean
  lastCheckTime?: number
  elapsedSeconds?: number
}

export interface ReportPlan {
  results: CheckResult[]
  summary: {
    pass: number
    fail: number
    warn: number
    skip: number
  }
  exitCode: number
}
