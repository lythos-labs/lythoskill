import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "check-private-leaks.sh");

type Files = Record<string, string>;

function setupRepo(files: Files, opts: { leakPatterns?: string[]; envSecrets?: string } = {}) {
  const root = mkdtempSync(join(tmpdir(), "leak-gate-"));
  for (const [rel, content] of Object.entries(files)) {
    const p = join(root, rel);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, content);
  }
  if (opts.leakPatterns) {
    mkdirSync(join(root, ".private"), { recursive: true });
    writeFileSync(join(root, ".private", "leak-patterns"), opts.leakPatterns.join("\n") + "\n");
  }
  if (opts.envSecrets) {
    mkdirSync(join(root, ".private"), { recursive: true });
    writeFileSync(join(root, ".private", "proxy.env"), opts.envSecrets);
  }
  // Stage everything (staged mode reads the index; audit mode reads ls-files).
  Bun.spawnSync(["git", "init", "-q"], { cwd: root });
  Bun.spawnSync(["git", "add", "-A"], { cwd: root });
  return root;
}

function runGate(root: string, args: string[] = []) {
  // Under `bun test` with coverage on (repo bunfig.toml), spawnSync pipe
  // capture returns empty buffers — redirect via sh and read back, same
  // pattern as scripts/check-site-commands.test.ts.
  const outPath = join(root, "gate.stdout");
  const errPath = join(root, "gate.stderr");
  const res = Bun.spawnSync(
    ["sh", "-c", `bash "${SCRIPT}" ${args.join(" ")} >"${outPath}" 2>"${errPath}"`],
    {
      cwd: root,
      env: {
        ...process.env,
        CHECK_PRIVATE_ROOT: root,
        CHECK_PRIVATE_PRIVATE_DIR: join(root, ".private"),
      },
    },
  );
  return {
    exitCode: res.exitCode ?? 1,
    stdout: readFileSync(outPath, "utf8"),
    stderr: readFileSync(errPath, "utf8"),
  };
}

function expectBlocked(r: { exitCode: number; stdout: string }, banner: string) {
  expect(r.exitCode).toBe(1);
  expect(r.stdout).toContain(banner);
}

describe("check-private-leaks.sh — negative tests (guard must catch)", () => {
  test("personal path from .private/leak-patterns in staged content → blocked", () => {
    const root = setupRepo(
      { "README.md": "clone at /Users/chariots/Downloads/lythoskill-main\n" },
      { leakPatterns: ["/Users/chariots"] },
    );
    expectBlocked(runGate(root), "PRIVATE PATTERN LEAK");
    rmSync(root, { recursive: true, force: true });
  });

  test("live token shape github_pat_… in staged content → blocked with PATTERN banner", () => {
    const root = setupRepo({ "notes.md": "token: github_pat_AAAA1111BBBB2222CCCC33\n" });
    expectBlocked(runGate(root), "PRIVATE PATTERN LEAK");
    rmSync(root, { recursive: true, force: true });
  });

  test("pattern listed in .private/leak-patterns → blocked with PATTERN banner", () => {
    const root = setupRepo(
      { "docs.md": "read the keychain entry lythos-agent-pat for the PAT\n" },
      { leakPatterns: ["lythos-agent-pat"] },
    );
    expectBlocked(runGate(root), "PRIVATE PATTERN LEAK");
    rmSync(root, { recursive: true, force: true });
  });

  test("secret value from .private/*.env in staged content → blocked with SECRET banner (phase 1)", () => {
    const root = setupRepo(
      { "config.md": "proxy at socks5://127.0.0.1:7891\n" },
      { envSecrets: "LYTHOS_SOCKS_PROXY=socks5://127.0.0.1:7891\n" },
    );
    expectBlocked(runGate(root), "PRIVATE SECRET LEAK");
    rmSync(root, { recursive: true, force: true });
  });

  test("audit mode (--all) catches planted pattern in tracked file → blocked", () => {
    const root = setupRepo(
      { "docs.md": "path /Users/chariots/x\n" },
      { leakPatterns: ["lythos-agent-pat", "/Users/chariots"] },
    );
    expectBlocked(runGate(root, ["--all"]), "PRIVATE PATTERN LEAK");
    rmSync(root, { recursive: true, force: true });
  });
});

describe("check-private-leaks.sh — positive tests (must not false-positive)", () => {
  test("clean staged content → exit 0", () => {
    const root = setupRepo({ "README.md": "# clean project\nnothing private here\n" });
    const r = runGate(root);
    expect(r.exitCode).toBe(0);
    rmSync(root, { recursive: true, force: true });
  });

  test("historical-record exemption: pattern quoted in daily/ → exit 0", () => {
    const root = setupRepo(
      { "daily/2026-10-19.md": "the old keychain name was lythos-agent-pat (incident record)\n" },
      { leakPatterns: ["lythos-agent-pat"] },
    );
    const r = runGate(root);
    expect(r.exitCode).toBe(0);
    rmSync(root, { recursive: true, force: true });
  });

  test("absent .private/ with clean content → exit 0 (baseline still runs)", () => {
    const root = setupRepo({ "ok.md": "generic docs\n" });
    rmSync(join(root, ".private"), { recursive: true, force: true });
    Bun.spawnSync(["git", "add", "-A"], { cwd: root });
    const r = runGate(root);
    expect(r.exitCode).toBe(0);
    rmSync(root, { recursive: true, force: true });
  });

  test("audit mode on clean tree → exit 0", () => {
    const root = setupRepo({ "README.md": "# clean\n" });
    const r = runGate(root, ["--all"]);
    expect(r.exitCode).toBe(0);
    rmSync(root, { recursive: true, force: true });
  });

  test("generic fixture paths (/home/user, /Users/alice) → exit 0 (baseline is token-shapes only)", () => {
    const root = setupRepo({
      "fixtures.md": "example: /home/user/.agents/skill-repos and /Users/alice/projects/x\n",
    });
    const r = runGate(root);
    expect(r.exitCode).toBe(0);
    rmSync(root, { recursive: true, force: true });
  });

  test("token-shaped string inside *.test.ts fixture → exempt (fixtures are fixtures)", () => {
    const root = setupRepo({
      "src/guard.test.ts": "const t = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';\n",
    });
    const r = runGate(root);
    expect(r.exitCode).toBe(0);
    rmSync(root, { recursive: true, force: true });
  });
});
