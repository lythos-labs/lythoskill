/**
 * Inject project statistics for the VitePress site (TASK-20260828141622988).
 * NOTE: no shebang — config.ts imports this module, and esbuild rejects
 * shebangs in non-entry files. Run via `bun scripts/inject-stats.ts`.
 *
 * Computes deck/package/skill counts mechanically from the repo tree and
 * writes .vitepress/stats.json, which config.ts uses to replace
 * {{DECK_COUNT}} / {{PACKAGE_COUNT}} / {{SKILL_COUNT}} placeholders at
 * render time. A generated number cannot rot — the site must not
 * contradict the repo it describes.
 *
 * Unit definitions (pinned in the task card):
 * - deckCount:    examples/decks/*.toml files
 * - packageCount: packages/<dir>/ with a non-private package.json (skill-only
 *                 packages like scribe/dreaming have no npm package — excluded)
 * - skillCount:   skills/<dir>/ directories (committed build output)
 * Test count is intentionally-static: no cheap mechanical source exists.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

const SITE_DIR = dirname(dirname(new URL(import.meta.url).pathname))
const ROOT_DIR = join(SITE_DIR, '..')
const OUTPUT_PATH = join(SITE_DIR, '.vitepress', 'stats.json')

export interface SiteStats {
  deckCount: number
  packageCount: number
  skillCount: number
}

export function computeStats(rootDir: string): SiteStats {
  const deckCount = readdirSync(join(rootDir, 'examples', 'decks'))
    .filter((f) => f.endsWith('.toml')).length

  const skillCount = readdirSync(join(rootDir, 'skills'), { withFileTypes: true })
    .filter((e) => e.isDirectory()).length

  const packageCount = readdirSync(join(rootDir, 'packages'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .filter((e) => {
      try {
        const pkg = JSON.parse(readFileSync(join(rootDir, 'packages', e.name, 'package.json'), 'utf-8'))
        return pkg.private !== true
      } catch {
        return false // no package.json → skill-only package, not published
      }
    }).length

  return { deckCount, packageCount, skillCount }
}

/** Shared by the VitePress markdown hook (config.ts) and tests. */
export function injectStatsIntoText(text: string, stats: SiteStats): string {
  return text
    .replaceAll('{{DECK_COUNT}}', String(stats.deckCount))
    .replaceAll('{{PACKAGE_COUNT}}', String(stats.packageCount))
    .replaceAll('{{SKILL_COUNT}}', String(stats.skillCount))
}

function main() {
  const stats = computeStats(ROOT_DIR)
  writeFileSync(OUTPUT_PATH, JSON.stringify(stats, null, 2) + '\n')
  console.log(`📊 Injected site stats: ${stats.deckCount} decks · ${stats.packageCount} packages · ${stats.skillCount} skills`)
}

if (import.meta.main) main()
