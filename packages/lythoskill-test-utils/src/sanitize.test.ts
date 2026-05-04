import { describe, it, expect } from "bun:test";
import { createSanitizer, sanitizePaths, DEFAULT_SECRET_PATTERNS } from "./sanitize.js";

describe("createSanitizer", () => {
  const config = {
    projectRoot: "/Users/alice/projects/lythoskill",
    homeDir: "/Users/alice",
    workDir: "/Users/alice/projects/lythoskill/playground/test-runs/20260101-120000",
  };

  it("replaces project root with $PROJECT_ROOT", () => {
    const s = createSanitizer(config);
    expect(s.sanitize("file at /Users/alice/projects/lythoskill/src/main.ts")).toBe(
      "file at $PROJECT_ROOT/src/main.ts"
    );
  });

  it("replaces home dir with $HOME", () => {
    const s = createSanitizer(config);
    expect(s.sanitize("config at /Users/alice/.config/foo")).toBe(
      "config at $HOME/.config/foo"
    );
  });

  it("replaces work dir with $WORK_DIR", () => {
    const s = createSanitizer(config);
    expect(s.sanitize("artifact in /Users/alice/projects/lythoskill/playground/test-runs/20260101-120000/output")).toBe(
      "artifact in $WORK_DIR/output"
    );
  });

  it("replaces longer paths before shorter ones (workDir > projectRoot > homeDir)", () => {
    const s = createSanitizer(config);
    const input = "repo=/Users/alice/projects/lythoskill work=/Users/alice/projects/lythoskill/playground/test-runs/20260101-120000 home=/Users/alice";
    expect(s.sanitize(input)).toBe(
      "repo=$PROJECT_ROOT work=$WORK_DIR home=$HOME"
    );
  });

  it("handles multiple occurrences", () => {
    const s = createSanitizer(config);
    expect(s.sanitize("a /Users/alice/projects/lythoskill b /Users/alice/projects/lythoskill c")).toBe(
      "a $PROJECT_ROOT b $PROJECT_ROOT c"
    );
  });

  it("leaves unrelated paths untouched", () => {
    const s = createSanitizer(config);
    expect(s.sanitize("/usr/bin/node /tmp/foo")).toBe("/usr/bin/node /tmp/foo");
  });

  it("restore reverses all replacements", () => {
    const s = createSanitizer(config);
    const sanitized = "repo=$PROJECT_ROOT work=$WORK_DIR home=$HOME";
    expect(s.restore(sanitized)).toBe(
      "repo=/Users/alice/projects/lythoskill work=/Users/alice/projects/lythoskill/playground/test-runs/20260101-120000 home=/Users/alice"
    );
  });

  it("round-trips correctly", () => {
    const s = createSanitizer(config);
    const original = "exec bun \"/Users/alice/projects/lythoskill/packages/lythoskill-deck/src/cli.ts\" \"$@\"";
    const sanitized = s.sanitize(original);
    expect(sanitized).toContain("$PROJECT_ROOT");
    expect(sanitized).not.toContain("/Users/alice");
    expect(s.restore(sanitized)).toBe(original);
  });
});

describe("secret redaction", () => {
  const baseConfig = {
    projectRoot: "/repo",
    homeDir: "/home/user",
  };

  it("redacts Bearer tokens", () => {
    const s = createSanitizer(baseConfig);
    const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    expect(s.sanitize(input)).toBe("Authorization: Bearer <REDACTED>");
  });

  it("redacts GitHub tokens", () => {
    const s = createSanitizer(baseConfig);
    // Standalone GitHub token (not prefixed with token=, which triggers token-assignment first)
    const input = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    expect(s.sanitize(input)).toBe("<GH_TOKEN_REDACTED>");
  });

  it("redacts sk- tokens", () => {
    const s = createSanitizer(baseConfig);
    const input = "sk-abcdefghijklmnopqrstuvwxyz123456789";
    expect(s.sanitize(input)).toBe("<SK_TOKEN_REDACTED>");
  });

  it("redacts api_key assignments", () => {
    const s = createSanitizer(baseConfig);
    expect(s.sanitize("api_key=supersecret123")).toBe("api_key=<REDACTED>");
    // Separator may be normalized to = in replacement
    expect(s.sanitize("API_KEY:anothersecret")).toContain("<REDACTED>");
  });

  it("redacts password assignments", () => {
    const s = createSanitizer(baseConfig);
    expect(s.sanitize("password=mypassword")).toBe("password=<REDACTED>");
  });

  it("redacts token assignments", () => {
    const s = createSanitizer(baseConfig);
    expect(s.sanitize("token=abc123def456")).toBe("token=<REDACTED>");
  });

  it("does not redact harmless short strings", () => {
    const s = createSanitizer(baseConfig);
    expect(s.sanitize("key=ok")).toBe("key=ok");
    expect(s.sanitize("password=hi")).toBe("password=hi");
  });

  it("allows custom secret patterns", () => {
    const s = createSanitizer({
      ...baseConfig,
      secrets: [
        { name: "custom", pattern: /SECRET_[A-Z0-9]{4,}/g, replacement: "<CUSTOM_REDACTED>" },
      ],
    });
    expect(s.sanitize("SECRET_ABC123")).toBe("<CUSTOM_REDACTED>");
    // Default patterns are not used when custom secrets are provided
    expect(s.sanitize("Bearer abcdef")).toBe("Bearer abcdef");
  });

  it("redacts secrets before paths (secrets may appear in paths)", () => {
    const s = createSanitizer(baseConfig);
    const input = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 at /repo/config";
    const result = s.sanitize(input);
    expect(result).toContain("<REDACTED>");
    expect(result).toContain("$PROJECT_ROOT");
    expect(result).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
  });
});

describe("sanitizePaths (convenience)", () => {
  it("works without explicit sanitizer creation", () => {
    const result = sanitizePaths("/Users/bob/repo/src", {
      projectRoot: "/Users/bob/repo",
      homeDir: "/Users/bob",
    });
    expect(result).toBe("$PROJECT_ROOT/src");
  });
});

describe("DEFAULT_SECRET_PATTERNS", () => {
  it("is exported and non-empty", () => {
    expect(DEFAULT_SECRET_PATTERNS.length).toBeGreaterThan(0);
    for (const p of DEFAULT_SECRET_PATTERNS) {
      expect(p.name).toBeTruthy();
      expect(p.pattern).toBeInstanceOf(RegExp);
      expect(p.replacement).toBeTruthy();
    }
  });
});
