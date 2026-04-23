import { existsSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'

export function findProjectRoot(from: string): string | null {
  let dir = resolve(from)
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
    if (existsSync(join(dir, 'skill-deck.toml'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}
