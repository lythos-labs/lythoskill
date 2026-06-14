import { describe, expect, test } from 'bun:test';
import { generateFileName, hasNonAsciiSlug } from './fs.js';

describe('hasNonAsciiSlug', () => {
  test('returns false for pure ASCII title', () => {
    expect(hasNonAsciiSlug('implement-task-cli')).toBe(false);
  });

  test('returns true for Chinese characters', () => {
    expect(hasNonAsciiSlug('实现任务CLI')).toBe(true);
  });

  test('returns true for emoji', () => {
    expect(hasNonAsciiSlug('task 🚀 launch')).toBe(true);
  });

  test('returns true for full-width symbols', () => {
    expect(hasNonAsciiSlug('task — dash')).toBe(true); // em dash is non-ASCII
  });

  test('returns false for empty string', () => {
    expect(hasNonAsciiSlug('')).toBe(false);
  });

  test('returns false for ASCII with numbers and hyphens', () => {
    expect(hasNonAsciiSlug('task-123-v2.0')).toBe(false);
  });
});

describe('generateFileName', () => {
  test('produces ASCII-only slug from ASCII title', () => {
    const result = generateFileName('TASK', '20260503010227902', 'Extend Cortex CLI');
    expect(result).toBe('TASK-20260503010227902-extend-cortex-cli.md');
  });

  test('strips Chinese characters from slug', () => {
    const result = generateFileName('TASK', '20260503010227902', '扩展Cortex CLI状态机');
    expect(result).toBe('TASK-20260503010227902-cortex-cli.md');
  });

  test('collapses multiple non-ASCII replacements into single hyphen', () => {
    const result = generateFileName('EPIC', '20260503010218940', 'Cortex 流转自动化 Epic');
    expect(result).toBe('EPIC-20260503010218940-cortex-epic.md');
  });

  test('trims leading and trailing hyphens', () => {
    const result = generateFileName('ADR', '20260519224555402', '—全局副作用—');
    expect(result).toBe('ADR-20260519224555402-.md');
  });

  test('handles empty title', () => {
    const result = generateFileName('TASK', '20260503010227902', '');
    expect(result).toBe('TASK-20260503010227902-.md');
  });

  test('preserves underscores and dots in title before lowercasing', () => {
    const result = generateFileName('TASK', '20260503010227902', 'v2.0_release');
    expect(result).toBe('TASK-20260503010227902-v2-0-release.md');
  });

  test('deduplicates prefix when id already includes it', () => {
    const result = generateFileName('TASK', 'TASK-20260614131433088', 'ZK Review upgrade');
    expect(result).toBe('TASK-20260614131433088-zk-review-upgrade.md');
  });

  test('deduplicates prefix for EPIC and ADR too', () => {
    expect(generateFileName('EPIC', 'EPIC-20260503010218940', 'Test')).toBe('EPIC-20260503010218940-test.md');
    expect(generateFileName('ADR', 'ADR-20260519224555402', 'Test')).toBe('ADR-20260519224555402-test.md');
  });
});
