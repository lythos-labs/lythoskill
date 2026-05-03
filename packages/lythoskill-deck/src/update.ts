#!/usr/bin/env bun
/**
 * deck-update.ts — Deprecated alias for refresh
 *
 * Kept for backward compatibility. Will be removed in v1.0.0.
 */

import { refreshDeck } from "./refresh.js";

export function updateDeck(cliDeckPath?: string, cliWorkdir?: string, target?: string): void {
  console.warn("⚠️  `deck update` is deprecated. Use `deck refresh` instead. (Removed in v1.0.0)");
  refreshDeck(cliDeckPath, cliWorkdir, target);
}
