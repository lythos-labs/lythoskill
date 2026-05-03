import { join } from 'node:path';
import type { WorkflowConfig } from '../types.js';
import { ensureDir } from '../lib/fs.js';
import { createWikiTemplate } from '../lib/template.js';
import { writeFileSync } from 'node:fs';

export function createWiki(title: string, config: WorkflowConfig, category: string): void {
  const today = new Date().toISOString().split('T')[0];
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const filename = `${today}-${slug}.md`;

  const subdirMap: Record<string, string> = {
    pattern: config.wikiSubdirs.patterns,
    faq: config.wikiSubdirs.faq,
    lesson: config.wikiSubdirs.lessons,
    patterns: config.wikiSubdirs.patterns,
    lessons: config.wikiSubdirs.lessons,
  };

  const subdir = subdirMap[category];
  if (!subdir) {
    console.error(`❌ Unknown category: ${category}. Use: pattern, faq, or lesson`);
    process.exit(1);
  }

  const filepath = join(config.wikiDir, subdir, filename);
  ensureDir(join(config.wikiDir, subdir));

  const template = createWikiTemplate(title, today, category.replace(/s$/, ''));
  writeFileSync(filepath, template);

  console.log(`✅ Created: ${filepath}`);
}
