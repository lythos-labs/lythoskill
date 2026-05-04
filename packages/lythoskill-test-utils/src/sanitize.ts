export interface SanitizeConfig {
  /** Project repository root — replaced with `$PROJECT_ROOT` */
  projectRoot: string;
  /** User home directory — replaced with `$HOME` */
  homeDir: string;
  /** Optional runtime work directory — replaced with `$WORK_DIR` */
  workDir?: string;
  /** Optional custom secret redaction rules */
  secrets?: SecretPattern[];
}

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

/** Default secret patterns — conservative, high-confidence matches only */
export const DEFAULT_SECRET_PATTERNS: SecretPattern[] = [
  {
    name: "bearer-token",
    pattern: /Bearer\s+[a-zA-Z0-9\-_]{20,}/gi,
    replacement: "Bearer <REDACTED>",
  },
  {
    name: "github-token",
    pattern: /gh[pousr]_[a-zA-Z0-9]{36}/g,
    replacement: "<GH_TOKEN_REDACTED>",
  },
  {
    name: "openai-sk-token",
    pattern: /sk-[a-zA-Z0-9]{20,}/g,
    replacement: "<SK_TOKEN_REDACTED>",
  },
  {
    name: "key-assignment",
    pattern: /\b(api[_-]?key|password|secret)\s*[=:]\s*[^\s"']{4,}/gi,
    replacement: "$1=<REDACTED>",
  },
  {
    name: "token-assignment",
    pattern: /\b(token)\s*[=:]\s*[^\s"']{8,}/gi,
    replacement: "$1=<REDACTED>",
  },
];

interface ReplacementRule {
  from: string;
  to: string;
}

function buildRules(config: SanitizeConfig): ReplacementRule[] {
  const rules: ReplacementRule[] = [
    { from: config.projectRoot, to: "$PROJECT_ROOT" },
    { from: config.homeDir, to: "$HOME" },
  ];
  if (config.workDir) {
    rules.push({ from: config.workDir, to: "$WORK_DIR" });
  }
  // Sort by length descending so longer paths are replaced first
  // (prevents a shorter prefix from corrupting a longer match)
  rules.sort((a, b) => b.from.length - a.from.length);
  return rules;
}

function redactSecrets(text: string, patterns: SecretPattern[]): string {
  let result = text;
  for (const { pattern, replacement } of patterns) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function createSanitizer(config: SanitizeConfig) {
  const rules = buildRules(config);
  const secrets = config.secrets ?? DEFAULT_SECRET_PATTERNS;

  return {
    /** Replace absolute paths and redact secrets for portable artifacts */
    sanitize(text: string): string {
      let result = text;
      // 1. Redact secrets first (paths may contain tokens)
      result = redactSecrets(result, secrets);
      // 2. Replace absolute paths
      for (const { from, to } of rules) {
        result = result.replaceAll(from, to);
      }
      return result;
    },

    /** Replace portable variable tokens back to absolute paths */
    restore(text: string): string {
      let result = text;
      for (const { from, to } of rules) {
        result = result.replaceAll(to, from);
      }
      return result;
    },
  };
}

/** Convenience: sanitize a single string with the given config */
export function sanitizePaths(text: string, config: SanitizeConfig): string {
  return createSanitizer(config).sanitize(text);
}
