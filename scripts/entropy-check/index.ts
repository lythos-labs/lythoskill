#!/usr/bin/env bun
/**
 * entropy-check.ts — Governance debt scan with Intent/Plan/Execute architecture
 *
 * Usage: bun scripts/entropy-check/index.ts [options]
 *   --dry-run           Print plan without executing checks
 *   --interval <sec>    Override check interval (default: 604800 = 7 days)
 *   --force             Skip interval gate, always run
 *   --strict            Exit 1 on warnings too (default: only fail counts)
 *   --config <path>     Load config from file (JSON or TOML)
 */
import { executeEntropyCheck } from './execute.ts'
import type { EntropyConfig, EntropyIO } from './types.ts'
import { readFileSync, existsSync, writeFileSync, readdirSync, lstatSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

function parseArgs(argv: string[]): Partial<EntropyConfig> {
  const config: Partial<EntropyConfig> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '--dry-run':
        config.dryRun = true
        break
      case '--force':
        config.force = true
        break
      case '--strict':
        config.strict = true
        break
      case '--interval':
        config.intervalSeconds = parseInt(argv[++i], 10)
        if (isNaN(config.intervalSeconds) || config.intervalSeconds <= 0) {
          console.error('❌ --interval must be a positive number (seconds)')
          process.exit(1)
        }
        break
    }
  }
  return config
}

function loadConfigFile(path: string): Partial<EntropyConfig> {
  if (!existsSync(path)) return {}
  try {
    const content = readFileSync(path, 'utf-8')
    // Simple JSON parsing (TOML support can be added later)
    return JSON.parse(content) as Partial<EntropyConfig>
  } catch {
    console.error(`❌ Failed to parse config: ${path}`)
    return {}
  }
}

function buildProductionIO(): EntropyIO {
  return {
    readFile(path: string): string | null {
      try {
        return readFileSync(path, 'utf-8')
      } catch {
        return null
      }
    },
    writeFile(path: string, content: string): void {
      writeFileSync(path, content)
    },
    exists(path: string): boolean {
      return existsSync(path)
    },
    exec(command: string, args: string[]): { stdout: string; stderr: string; exitCode: number } {
      const result = spawnSync(command, args, { encoding: 'utf-8' })
      return {
        stdout: (result.stdout || '').toString(),
        stderr: (result.stderr || '').toString(),
        exitCode: result.status ?? 1,
      }
    },
    now(): number {
      return Math.floor(Date.now() / 1000)
    },
    listDir(path: string): string[] {
      try {
        return readdirSync(path)
      } catch {
        return []
      }
    },
    isSymlink(path: string): boolean {
      try {
        return lstatSync(path).isSymbolicLink()
      } catch {
        return false
      }
    },
    log(message: string): void {
      console.log(message)
    },
  }
}

function main(): void {
  const projectDir = resolve(import.meta.dirname || process.cwd(), '../..')
  const cliConfig = parseArgs(process.argv.slice(2))

  // Merge: defaults < file config < CLI args
  const config: EntropyConfig = {
    projectDir,
    checkpointFile: `${projectDir}/.last-entropy-check`,
    intervalSeconds: 604800,
    strict: false,
    dryRun: false,
    force: false,
    ...cliConfig,
  }

  const io = buildProductionIO()
  const report = executeEntropyCheck(config, io)

  if (config.strict && report.summary.warn > 0) {
    process.exit(1)
  }
  process.exit(report.exitCode)
}

if (import.meta.main) {
  main()
}
