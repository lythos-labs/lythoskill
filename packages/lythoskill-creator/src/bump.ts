import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { findProjectRoot } from './util.js'
import { align } from './align.js'
import { build } from './build.js'

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/

export interface BumpOpts {
  target: string
  dryRun: boolean
}

export async function bump(opts: BumpOpts) {
  const root = findProjectRoot(process.cwd()) || process.cwd()
  const rootPkgPath = join(root, 'package.json')

  if (!existsSync(rootPkgPath)) {
    console.error('No root package.json found. Run from a lythoskill monorepo.')
    process.exit(1)
  }

  const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'))
  const currentVersion = rootPkg.version as string | undefined

  if (!currentVersion || !SEMVER_RE.test(currentVersion)) {
    console.error(`Root package.json has invalid or missing version: ${currentVersion ?? '(none)'}`)
    process.exit(1)
  }

  const newVersion = computeNewVersion(currentVersion, opts.target)

  if (newVersion === currentVersion) {
    console.error(`Refusing to bump: target ${newVersion} equals current version`)
    process.exit(1)
  }
  if (compareSemver(newVersion, currentVersion) < 0) {
    console.error(`Refusing to bump: ${currentVersion} → ${newVersion} would be a downgrade`)
    process.exit(1)
  }

  console.log(`📦 Lock-step bump: ${currentVersion} → ${newVersion}`)

  const packagesDir = join(root, 'packages')
  const pkgDirs = existsSync(packagesDir)
    ? readdirSync(packagesDir).filter((n) =>
        existsSync(join(packagesDir, n, 'package.json'))
      )
    : []

  console.log(`   Affected: root package.json + ${pkgDirs.length} workspace package(s)`)
  for (const name of pkgDirs) {
    console.log(`   - packages/${name}/package.json`)
  }

  if (opts.dryRun) {
    console.log('\n🔎 Dry-run: no files written.')
    console.log('   Real run would:')
    console.log(`   1. Set root package.json version → ${newVersion}`)
    console.log('   2. Run align(fix=true) — syncs packages/*/package.json (skips {{...}} templates)')
    console.log('   3. Run build for each lythoskill-* package — re-renders skills/*/SKILL.md')
    return
  }

  // Step 1: write root package.json (only the version field changes)
  rootPkg.version = newVersion
  writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n')
  console.log(`\n✅ Root package.json → ${newVersion}`)

  // Step 2: delegate package alignment to align() — it already protects {{...}} templates
  console.log('\n🔧 Aligning workspace packages (align --fix)...')
  await align(true)

  // Step 3: rebuild skill outputs
  console.log('\n🛠️  Rebuilding skills (build --all equivalent)...')
  let built = 0
  for (const name of pkgDirs) {
    if (!name.startsWith('lythoskill-')) continue
    console.log(`\n=== Building ${name} ===`)
    await build(name)
    built++
  }
  console.log(`\n✅ Rebuilt ${built} skill(s)`)

  console.log(`\n🎉 Bump complete: ${currentVersion} → ${newVersion}`)
  console.log('   Next steps:')
  console.log('   - Review: git diff')
  console.log(`   - Commit: git commit -am "chore(release): v${newVersion}"`)
}

function computeNewVersion(current: string, target: string): string {
  if (SEMVER_RE.test(target)) return target

  const m = current.match(SEMVER_RE)!
  const [maj, min, pat] = [Number(m[1]), Number(m[2]), Number(m[3])]

  switch (target) {
    case 'patch':
      return `${maj}.${min}.${pat + 1}`
    case 'minor':
      return `${maj}.${min + 1}.0`
    case 'major':
      return `${maj + 1}.0.0`
    default:
      console.error(`Unknown bump target: "${target}". Use patch|minor|major or explicit X.Y.Z`)
      process.exit(1)
  }
}

function compareSemver(a: string, b: string): number {
  const [am, an, ap] = a.split('.').map(Number)
  const [bm, bn, bp] = b.split('.').map(Number)
  if (am !== bm) return am - bm
  if (an !== bn) return an - bn
  return ap - bp
}
