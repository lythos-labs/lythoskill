import { join } from 'node:path';
import { existsSync, writeFileSync, copyFileSync } from 'node:fs';
import type { WorkflowConfig } from '../types.js';
import { ensureDir } from '../lib/fs.js';
import { DEFAULT_CONFIG, CONFIG_FILE } from '../config.js';

const ASSETS_DIR = join(import.meta.dir, '../../assets');

export function initWorkflow(config: WorkflowConfig): void {
  console.log('🚀 Initializing Project Workflow...\n');

  for (const [key, dir] of Object.entries(config.taskSubdirs)) {
    const fullPath = join(config.tasksDir, dir);
    ensureDir(fullPath);
    console.log(`✅ tasks/${dir}/`);
  }

  for (const [key, dir] of Object.entries(config.epicSubdirs)) {
    const fullPath = join(config.epicsDir, dir);
    ensureDir(fullPath);
    console.log(`✅ epics/${dir}/`);
  }

  for (const [key, dir] of Object.entries(config.adrSubdirs)) {
    const fullPath = join(config.adrDir, dir);
    ensureDir(fullPath);
    console.log(`✅ adr/${dir}/`);
  }

  for (const [key, dir] of Object.entries(config.wikiSubdirs)) {
    const fullPath = join(config.wikiDir, dir);
    ensureDir(fullPath);
    console.log(`✅ wiki/${dir}/`);
  }

  // Copy templates
  const templates = [
    { src: 'TASK-TEMPLATE.md', dest: join(config.tasksDir, 'TASK-TEMPLATE.md') },
    { src: 'EPIC-TEMPLATE.md', dest: join(config.epicsDir, 'EPIC-TEMPLATE.md') },
    { src: 'ADR-TEMPLATE.md', dest: join(config.adrDir, 'ADR-TEMPLATE.md') },
    { src: 'HANDOFF-TEMPLATE.md', dest: 'HANDOFF-TEMPLATE.md' },
  ];

  for (const { src, dest } of templates) {
    const srcPath = join(ASSETS_DIR, src);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, dest);
      console.log(`📋 ${src} → ${dest}`);
    }
  }

  // Install husky hooks (if husky is set up)
  const huskyDir = '.husky'
  if (existsSync(huskyDir)) {
    const hookAssets = ['post-commit']
    for (const hook of hookAssets) {
      const dest = join(huskyDir, hook)
      const src = join(ASSETS_DIR, hook)
      if (existsSync(src) && !existsSync(dest)) {
        copyFileSync(src, dest)
        console.log(`🔗 ${hook} → ${dest}`)
      }
    }
    console.log('\n💡 Hooks installed. The post-commit hook runs `bunx @lythos/project-cortex dispatch-trailers`')
    console.log('   to auto-process trailers (Closes:/Task:/ADR:/Epic:) after each commit.')
  } else {
    console.log('\n💡 Tip: Set up husky to enable auto-trailer dispatch:')
    console.log('   bunx husky init && echo "bunx @lythos/project-cortex dispatch-trailers" > .husky/post-commit')
  }

  if (!existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(`\n📝 Created config: ${CONFIG_FILE}`);
  }

  console.log('\n✨ Workflow initialized!');
}
