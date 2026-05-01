import {
  existsSync, readFileSync, statSync, readdirSync,
  writeFileSync, appendFileSync, mkdirSync, chmodSync,
} from 'node:fs'
import { join } from 'node:path'
import { findProjectRoot } from './util.js'
import * as t from './templates.js'

interface Check {
  pass: boolean
  label: string
  fix?: () => void
}

export async function align(fix: boolean) {
  const root = findProjectRoot(process.cwd()) || process.cwd()

  // Verify we're in a monorepo
  if (!existsSync(join(root, 'package.json'))) {
    console.error('No package.json found. Run this from within a lythoskill monorepo.')
    process.exit(1)
  }

  console.log(`🔍 Scanning project: ${root}\n`)

  const checks: Check[] = [
    ...checkRootPackageJson(root),
    ...checkGitignore(root),
    ...checkHusky(root),
    ...checkPackages(root),
  ]

  const passed = checks.filter((c) => c.pass)
  const failed = checks.filter((c) => !c.pass)

  console.log(`\n=== Results: ${passed.length} passed, ${failed.length} failed ===\n`)

  if (failed.length === 0) {
    console.log('✅ Project is fully aligned with current lythoskill conventions.')
    return
  }

  for (const c of failed) {
    console.log(`  ❌ ${c.label}`)
  }

  if (!fix) {
    console.log(`\n💡 Run with --fix to auto-apply corrections.`)
    return
  }

  console.log(`\n🔧 Applying fixes...\n`)
  let applied = 0
  for (const c of failed) {
    if (c.fix) {
      try {
        c.fix()
        console.log(`  ✅ Fixed: ${c.label}`)
        applied++
      } catch (err) {
        console.error(`  ❌ Failed to fix: ${c.label} — ${err}`)
      }
    } else {
      console.log(`  ⚠️  Cannot auto-fix: ${c.label}`)
    }
  }

  console.log(`\n${applied} fix(es) applied. Re-run 'align' to verify.`)
}

// ── Root package.json checks ───────────────────────────────
function checkRootPackageJson(root: string): Check[] {
  const path = join(root, 'package.json')
  if (!existsSync(path)) return []

  let pkg: Record<string, unknown>
  try {
    pkg = JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return [{ pass: false, label: 'Root package.json is valid JSON' }]
  }

  const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>
  const scripts = (pkg.scripts ?? {}) as Record<string, string>

  return [
    {
      pass: !!devDeps.husky,
      label: 'Root package.json has husky in devDependencies',
      fix: () => {
        const p = JSON.parse(readFileSync(path, 'utf-8'))
        p.devDependencies ??= {}
        p.devDependencies.husky = '^9.1.7'
        writeJson(path, p)
      },
    },
    {
      pass: scripts.prepare === 'husky',
      label: 'Root package.json has "prepare": "husky" script',
      fix: () => {
        const p = JSON.parse(readFileSync(path, 'utf-8'))
        p.scripts ??= {}
        p.scripts.prepare = 'husky'
        writeJson(path, p)
      },
    },
    {
      pass: typeof pkg.version === 'string',
      label: 'Root package.json has version field (unified version source)',
      fix: () => {
        const p = JSON.parse(readFileSync(path, 'utf-8'))
        if (!p.version) p.version = '0.1.0'
        writeJson(path, p)
      },
    },
  ]
}

// ── .gitignore checks ──────────────────────────────────────
function checkGitignore(root: string): Check[] {
  const path = join(root, '.gitignore')
  const expected = [
    '.npm-access',
    'skill-deck.lock',
    '.private/',
    '.husky/_',
  ]

  if (!existsSync(path)) {
    return expected.map((e) => ({
      pass: false,
      label: `.gitignore contains ${e}`,
      fix: () => {
        writeFileSync(path, t.gitignore())
      },
    }))
  }

  const content = readFileSync(path, 'utf-8')
  return expected.map((e) => ({
    pass: content.includes(e),
    label: `.gitignore contains ${e}`,
    fix: () => {
      if (!content.includes(e)) {
        appendFileSync(path, `\n${e}\n`)
      }
    },
  }))
}

// ── Husky checks ───────────────────────────────────────────
function checkHusky(root: string): Check[] {
  const hookPath = join(root, '.husky', 'pre-commit')
  const template = t.huskyPreCommit()

  return [
    {
      pass: existsSync(hookPath),
      label: '.husky/pre-commit exists',
      fix: () => {
        mkdirSync(join(root, '.husky'), { recursive: true })
        writeFileSync(hookPath, template)
        chmodSync(hookPath, 0o755)
      },
    },
    {
      pass: existsSync(hookPath) && (statSync(hookPath).mode & 0o111) !== 0,
      label: '.husky/pre-commit is executable',
      fix: () => {
        chmodSync(hookPath, 0o755)
      },
    },
    {
      pass: existsSync(hookPath) && readFileSync(hookPath, 'utf-8').includes('build --all'),
      label: '.husky/pre-commit calls build --all',
    },
  ]
}

// ── Package checks ─────────────────────────────────────────
function checkPackages(root: string): Check[] {
  const packagesDir = join(root, 'packages')
  if (!existsSync(packagesDir)) return []

  const rootPkg = existsSync(join(root, 'package.json'))
    ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
    : {}
  const unifiedVersion = rootPkg.version as string | undefined

  const checks: Check[] = []
  const names = readdirSync(packagesDir).filter((n) => {
    const p = join(packagesDir, n)
    return statSync(p).isDirectory() && existsSync(join(p, 'package.json'))
  })

  for (const name of names) {
    const pkgDir = join(packagesDir, name)
    const pkgPath = join(pkgDir, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

    // Required fields
    checks.push({
      pass: !!pkg.license,
      label: `packages/${name}/package.json has license`,
      fix: () => {
        const p = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        p.license = 'MIT'
        writeJson(pkgPath, p)
      },
    })
    checks.push({
      pass: pkg.publishConfig?.access === 'public',
      label: `packages/${name}/package.json has publishConfig.access = public`,
      fix: () => {
        const p = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        p.publishConfig ??= {}
        p.publishConfig.access = 'public'
        writeJson(pkgPath, p)
      },
    })
    checks.push({
      pass: pkg.type === 'module',
      label: `packages/${name}/package.json has type = module`,
    })

    // Unified version
    if (unifiedVersion) {
      checks.push({
        pass: pkg.version === unifiedVersion,
        label: `packages/${name}/package.json version (${pkg.version}) matches root (${unifiedVersion})`,
        fix: () => {
          const p = JSON.parse(readFileSync(pkgPath, 'utf-8'))
          p.version = unifiedVersion
          writeJson(pkgPath, p)
        },
      })
    }

    // SKILL.md version alignment (skip templates with {{VAR}} placeholders)
    const skillMdPath = join(pkgDir, 'skill', 'SKILL.md')
    if (existsSync(skillMdPath)) {
      const md = readFileSync(skillMdPath, 'utf-8')
      const hasTemplates = md.includes('{{')
      const mdVersionMatch = md.match(/^version:\s*(.+)$/m)
      const mdVersion = mdVersionMatch ? mdVersionMatch[1].trim() : undefined
      if (!hasTemplates) {
        checks.push({
          pass: mdVersion === pkg.version,
          label: `packages/${name}/skill/SKILL.md version (${mdVersion}) matches package.json (${pkg.version})`,
          fix: () => {
            const content = readFileSync(skillMdPath, 'utf-8')
            const updated = content.replace(/^version:\s*.+$/m, `version: ${pkg.version}`)
            writeFileSync(skillMdPath, updated)
          },
        })
      }
    }

    // Bin wrapper executable check (only bin/ directory files, not src/cli.ts)
    const bin = pkg.bin as Record<string, string> | undefined
    if (bin) {
      for (const [, binPath] of Object.entries(bin)) {
        if (!binPath.startsWith('bin/')) continue
        const fullPath = join(pkgDir, binPath)
        if (existsSync(fullPath)) {
          checks.push({
            pass: (statSync(fullPath).mode & 0o111) !== 0,
            label: `packages/${name}/${binPath} is executable`,
            fix: () => {
              chmodSync(fullPath, 0o755)
            },
          })
        }
      }
    }

    // skills/ build output exists
    const builtSkillPath = join(root, 'skills', name, 'SKILL.md')
    checks.push({
      pass: existsSync(builtSkillPath),
      label: `skills/${name}/SKILL.md exists (built output)`,
    })
  }

  return checks
}

function writeJson(path: string, data: unknown) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}
