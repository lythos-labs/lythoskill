# Agent BDD — LeetCode-style Harness

Real-LLM-in-the-loop testing for lythoskill, modeled after competitive
programming (problem statement → submission → hidden judge).

The other tests in `playground/agent-bdd/scenarios/` are **CLI integration
BDD** wearing an agent name — they call `spawnSync` on the deck CLI, no LLM
involved. This harness is for the actual third tier in
`packages/lythoskill-test-utils/SCENARIOS.md`: a real agent (today: `claude
-p`) reads a brief, takes actions, and a deterministic shell judge checks
the result.

See `cortex/adr/01-proposed/ADR-20260503230522270-leetcode-style-agent-bdd-harness-with-tmpdir-sandbox.md`
for design rationale.

## Layout

```
leetcode/
├── bin/
│   ├── init-run.sh        # set up runs/<id>-<ts>/
│   ├── judge.sh           # dispatch to per-problem judge, write verdict.txt
│   └── deck               # PATH shim → bun monorepo CLI
├── problems/
│   └── <id>/
│       ├── brief.md       # what the agent sees (self-contained)
│       ├── seed/          # initial sandbox state, copied into work/
│       └── judge.sh       # per-problem verification (read-only)
└── runs/                  # gitignored; one dir per attempt
    └── <id>-<ts>/
        ├── brief.md       # copied from problem
        ├── work/          # agent's cwd; agent mutates here
        ├── OUTPUT.md      # agent's submission
        └── verdict.txt    # judge writes here
```

## Quick start

```bash
cd playground/agent-bdd/leetcode

# 1. Init a sandbox
./bin/init-run.sh deck-link-from-cold-pool
# ↑ prints the run dir + the exact `cd ... && claude -p ...` line to copy

# 2. Run the agent (paste the printed command exactly; cwd matters)

# 3. Judge
./bin/judge.sh /abs/path/to/runs/deck-link-from-cold-pool-<ts>
```

## Why this design

- **tmpdir + cwd switching, no Docker.** The deck CLI doesn't escape its
  cwd, so a fresh directory is enough sandbox. Pareto-optimal on isolation
  vs. setup convenience.
- **`claude -p` is the initial driver.** Future automation will swap it for
  `Bun.$`/`bun.spawn` so we can run a suite without a human in the loop.
  The harness is driver-agnostic.
- **Deterministic shell judge, not LLM-as-judge.** Binary pass/fail is what
  we want; LLM judges add new noise without buying anything for this layer.

## Stability promise

Across machines:
- **Init**: deterministic. Same problem → same seed layout, same brief.
- **Run**: non-deterministic by design. The agent's behavior is the
  variable being tested.
- **Judge**: deterministic. Same final filesystem → same verdict.

The harness uses POSIX shell + `bun` + `claude`; nothing else. macOS and
Linux both work.

## Adding a problem

1. `mkdir -p problems/<my-id>/seed`
2. Write `problems/<my-id>/brief.md` — self-contained, written for an
   agent that has never seen lythoskill. Stick to the deck CLI surface.
3. Place initial filesystem state in `seed/`.
4. Write `problems/<my-id>/judge.sh` — takes `$1 = run-dir`, reads
   `$1/work/` and `$1/OUTPUT.md`, prints check results, exits 0 on pass.
5. `chmod +x problems/<my-id>/judge.sh`

## Caveats

- Not in CI. Each run burns tokens. Run before releases or as nightly cron.
- Briefs must be self-contained. The agent only sees `brief.md`, not this
  README.
- The harness does not enforce network isolation. Problems must seed the
  cold pool locally so the deck CLI never needs to `git clone`.

## Planned problems

The first problem (`deck-link-from-cold-pool`) verifies the *filesystem
side*: did the agent run the right deck command and end up with correct
symlinks? The next tier is **agent introspection** — verifying that
linked skills are actually *seen* by the agent.

- `deck-self-introspect-skills/` *(planned)* — seed the sandbox with
  `.claude/skills/` already populated (via a `pre-agent.sh` hook), then
  ask the agent: "list every skill currently injected into your context,
  in JSON format `[{name, description}]`, write to `OUTPUT.json`." Judge
  compares the JSON against the deck manifest. This tests the
  end-to-end loop (deck declares → claude perceives), not just the
  filesystem write.
- `deck-add-fq-from-natural-language/` *(planned)* — give the agent a
  natural-language ask ("add the pdf skill from anthropics' repo") and
  verify it picks the correct FQ path.
- `deck-remove-cleans-symlink-keeps-cold-pool/` *(planned)* — verify
  that `deck remove` clears the working set entry but does not delete
  cold-pool source.

Adding a `pre-agent.sh` hook to the harness is the next harness change —
it lets a problem run setup commands inside `work/` before the agent
receives the sandbox.
