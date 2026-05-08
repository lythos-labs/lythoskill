# Hermes Curator (Nous Research) — Deep Research Findings

**Research Date:** 2026-05-08
**Version Researched:** Hermes Agent v0.12.0 (Curator release, 2026-04-30) + v0.13.0 follow-ups
**Sources:** Official docs, GitHub issues/PRs, community deep-dives, release notes

---

## 1. Product Positioning

### What Problem It Solves

Hermes Curator solves **skill library bloat** and **context rot** in self-improving AI agents.

- **Skill Drift:** Agent-created skills become outdated, overlapping, or misaligned with current behavior over time.
- **Context Rot:** Documented by Chroma Research (July 2025) — as more skills accumulate in the context window, agent reasoning degrades because the signal-to-noise ratio drops.
- **Skill Explosion:** Without pruning, a self-improving agent accumulates ~365 skills per year, most being near-duplicates.

> "Self-improving agents have a skills-hoarding problem. Every skill the agent writes stays forever, even the unused ones." — Mem0 analysis

### Target User

- **Power users** running Hermes Agent for extended periods (weeks to months)
- **Teams** with shared agent deployments where skill libraries grow organically
- **Developers** who want autonomous maintenance without manual skill pruning

### Unique Positioning

Hermes Curator is a **category-first feature** in open-source AI agent frameworks. No other major agent framework (LangChain, AutoGPT, CrewAI, etc.) ships built-in skill lifecycle management with this level of safety, auditability, and reversibility.

---

## 2. Architecture

### Components

| Component | File / Location | Role |
|-----------|----------------|------|
| **Curator Engine** | `agent/curator.py` | Main orchestration logic |
| **Usage Tracker** | `tools/skill_usage.py` | Telemetry collection (`bump_use`, `bump_view`) |
| **Usage Sidecar** | `~/.hermes/skills/.usage.json` | Per-skill telemetry database |
| **Archive Store** | `~/.hermes/skills/.archive/` | Archived skills directory |
| **Backup Store** | `~/.hermes/skills/.curator_backups/<utc-iso>/skills.tar.gz` | Automatic pre-run snapshots |
| **Run Reports** | `~/.hermes/logs/curator/run.json` + `REPORT.md` | Per-run audit trail |
| **Bundled Manifest** | `.bundled_manifest` | List of shipped skills (exclusion list) |
| **Hub Lock** | `.hub/lock.json` | List of hub-installed skills (exclusion list) |

### Data Flow

```
Agent Activity
    │
    ├─► skill_view() ─────► bump_view() ─────┐
    ├─► skill loaded ─────► bump_use() ──────┤
    └─► skill_manage() ───► patch_count++ ───┘
                    │
                    ▼
        ~/.hermes/skills/.usage.json
                    │
                    ▼
    ┌───────────────────────────────┐
    │  Curator Trigger Check        │
    │  - interval_hours passed?     │
    │  - min_idle_hours satisfied?  │
    └───────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  Phase 1: Auto-Transitions    │
    │  (deterministic, no LLM)      │
    │  active → stale → archived    │
    └───────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  Phase 2: LLM Review Pass     │
    │  (auxiliary agent fork)       │
    │  max_iterations = 8           │
    └───────────────────────────────┘
                    │
                    ▼
        logs/curator/run.json + REPORT.md
```

### Storage Details

**`~/.hermes/skills/.usage.json`** — JSON sidecar with per-skill telemetry:

```json
{
  "my-skill": {
    "use_count": 12,
    "view_count": 34,
    "last_used_at": "2026-04-24T18:12:03Z",
    "last_viewed_at": "2026-04-23T09:44:17Z",
    "patch_count": 3,
    "last_patched_at": "2026-04-20T22:01:55Z",
    "created_at": "2026-03-01T14:20:00Z",
    "state": "active",
    "pinned": false,
    "archived_at": null
  }
}
```

**`~/.hermes/logs/curator/`** — Per-run artifacts:
- `run.json` — Structured data (actions taken, skills reviewed, timestamps)
- `REPORT.md` — Human-readable summary

### Triggers

The curator is **not cron-based**. It triggers via:

1. **Gateway cron-ticker thread** — recurring tick inside the agent gateway
2. **CLI session start check** — checks conditions on session init

**Conditions for execution:**
- `now - last_run_at >= interval_hours` (default: 168 hours = 7 days)
- `agent_idle_time >= min_idle_hours` (default: 2 hours)

Both must be satisfied. The agent must be idle for at least 2 hours AND enough time must have passed since the last curator run.

---

## 3. Skill Scope

### What the Curator Touches

**ONLY agent-created or hand-written skills.**

The curator explicitly excludes:

| Skill Type | How Excluded | Reason |
|-----------|-------------|--------|
| **Bundled skills** | `.bundled_manifest` list | Shipped with Hermes repo; canonical reference |
| **Hub-installed skills** | `.hub/lock.json` list | From `agentskills.io` or other hubs; user-installed |
| **Pinned skills** | `pinned: true` flag | User-protected; immutable fence |

### Skill Provenance

Skills carry a `created_by` provenance field:
- `"agent"` — Created by the agent during operation (curator target)
- `"user"` — Hand-written by user (curator target)
- `"bundled"` — Shipped with Hermes (excluded)
- `"hub"` — Installed from marketplace (excluded)

---

## 4. Lifecycle Management

### State Machine

```
        ┌─────────────────────────────────────────┐
        │                                         │
        ▼                                         │
    [ACTIVE] ──(30 days unused)──► [STALE] ──(60 more days)──► [ARCHIVED]
        ▲                            │                            │
        │                            │                            │
        └────────(any activity)──────┘◄────────(restore)─────────┘
```

### State Definitions

| State | Description | Transition Trigger |
|-------|-------------|-------------------|
| **Active** | Default state; fully available in prompts | Any activity resets to active |
| **Stale** | Marked as stale but still accessible | 30 days of inactivity (`stale_after_days`) |
| **Archived** | Moved to `~/.hermes/skills/.archive/` | 90 days total inactivity (`archive_after_days`) |

### Activity Definition

Activity counts as ANY of:
- `last_used_at` updated (skill loaded into prompt context)
- `last_viewed_at` updated (skill content read via `skill_view`)
- `last_patched_at` updated (skill edited via `skill_manage`)

> **Bug history:** Issue #17952 noted that edit activity (`patch_count`) did not initially count as lifecycle signal. Fixed in #17953 to unify activity detection across all three timestamps.

### Recovery

Archived skills are **never deleted**:
- `hermes curator restore <skill-name>` — moves from `.archive/` back to active tree
- Restore resets `state` to `active` and updates usage record
- Restore refuses if a bundled/hub skill now has the same name (no shadowing)

> **Bug history:** Issue #17942 — `restore_skill()` initially only scanned top-level `.archive/`, missing nested subdirectories. Fixed by changing `iterdir()` to `rglob('*')`.

---

## 5. Quality Assessment

### Two-Phase Assessment

#### Phase 1: Deterministic Auto-Transitions (No LLM)

- Reads `~/.hermes/skills/.usage.json`
- Applies time-based thresholds
- Purely rule-based; no model inference

#### Phase 2: LLM Review Pass (Auxiliary Agent Fork)

- Spawns a **forked `AIAgent` process** running in its own prompt cache
- Uses the **auxiliary model** (configurable; can be cheaper than primary, e.g., Gemini Flash)
- `max_iterations = 8` — bounded review cycle
- **Framing prompt:** "Would a maintainer write this as N separate skills, or one skill with N labeled subsections?"

### What the Fork Can Do

| Action | Tool Used | Description |
|--------|-----------|-------------|
| Read any skill | `skill_view` | Inspect skill content and metadata |
| Propose patches | `skill_manage` (patch/edit) | Modify skill content |
| Archive skills | Terminal tool | Move to `.archive/` |

### Scoped Toolset

The forked auxiliary agent receives **only memory + skills tools**:
- `skill_view`
- `skill_manage`
- `skills_list`

It does NOT receive:
- Shell access
- Web search
- File system access outside `~/.hermes/skills/`

### Consolidation Strategies

The LLM review can decide to:

1. **Merge** redundant skills into an existing "umbrella" skill
2. **Create** a new umbrella `SKILL.md` that subsumes related skills
3. **Demote** redundant content to `references/`, `templates/`, or `scripts/` support files
4. **Patch** a skill to fix drift or improve clarity
5. **Archive** a skill that is fully superseded

### Telemetry Dimensions

| Metric | Field | Trigger | Analytical Value |
|--------|-------|---------|-----------------|
| **Views** | `view_count` | `skill_view()` call | Discovery signal — skill is findable |
| **Uses** | `use_count` | Skill loaded into prompt | Engagement signal — skill is actually useful |
| **Patches** | `patch_count` | `skill_manage` write | Maintenance signal — skill is actively refined |

> **Key insight:** A skill with high `view_count` but low `use_count` signals a **discovery problem** — the skill is findable but not compelling enough to load. This is a key input for the LLM review pass.

> **Bug history:** Issue #17782 — `bump_use()` had zero production call sites at v0.12.0 launch, meaning `use_count` stayed at 0 for all skills. Fixed in PR #17932 by wiring `bump_use()` into skill invocation + preload + `skill_view`.

---

## 6. Write Operations

### Archival

- **Automatic:** Skills unused for `archive_after_days` (default: 90) are moved to `~/.hermes/skills/.archive/`
- **Manual:** `hermes curator run` can trigger archival during LLM review
- **Reversible:** `hermes curator restore <skill>` recovers archived skills
- **Never deletes:** Archival is the most severe automatic action

### Consolidation

- Performed by the LLM review pass (Phase 2)
- Can merge, patch, or demote skills
- Produces audit trail in `logs/curator/REPORT.md`

### Pin / Unpin

```bash
hermes curator pin <skill-name>     # Protect from all transitions and edits
hermes curator unpin <skill-name>   # Remove protection
```

**Pin semantics:**
- Auto-transitions skip pinned skills
- LLM review ignores pinned skills
- `skill_manage` refuses writes to pinned skills
- Pinned skills are a **hard fence** — even the agent cannot modify them

### Restore

```bash
hermes curator restore <skill-name>  # Move from .archive/ back to active
```

### Backup / Rollback

```bash
hermes curator backup                    # Manual tar.gz snapshot
hermes curator backup --reason "..."     # Snapshot with descriptive reason
hermes curator rollback                  # Restore from newest snapshot
hermes curator rollback -y               # Skip confirmation
hermes curator rollback --list           # List all snapshots with size + reason
hermes curator rollback --id <ts>        # Restore specific snapshot
```

**Automatic pre-run snapshots:**
- Before every real curator pass, a tar.gz snapshot is taken at `~/.hermes/skills/.curator_backups/<utc-iso>/skills.tar.gz`
- Rollbacks are themselves reversible — a pre-rollback snapshot is tagged `pre-rollback to <target-id>`

---

## 7. User Control

### CLI Commands

| Command | Description |
|---------|-------------|
| `hermes curator status` | Show last run, active/stale/archived counts, pinned list, LRU top 5 |
| `hermes curator run` | Trigger manual review (blocks until LLM pass finishes) |
| `hermes curator run --background` | Fire-and-forget background review |
| `hermes curator run --dry-run` | **Preview only** — produces review report without mutations |
| `hermes curator run --sync` | Trigger manual review (alias) |
| `hermes curator pause` | Stop scheduled runs |
| `hermes curator resume` | Re-enable paused curator |
| `hermes curator pin <skill>` | Protect skill from all transitions |
| `hermes curator unpin <skill>` | Remove protection |
| `hermes curator restore <skill>` | Recover archived skill |
| `hermes curator backup` | Manual snapshot |
| `hermes curator rollback` | Restore from snapshot |
| `hermes curator rollback --list` | List available snapshots |

### Slash Commands

All curator subcommands are also available as `/curator <subcommand>` inside a running session.

### Configuration (`config.yaml`)

```yaml
curator:
  enabled: true              # Master switch
  interval_hours: 168        # 7 days between runs
  min_idle_hours: 2          # Minimum idle time before trigger
  stale_after_days: 30       # Days before marking stale (0 = disabled)
  archive_after_days: 90     # Days before archiving (0 = disabled)
  auxiliary:
    provider: null           # Defaults to main aux model
    model: null              # Can specify cheaper model (e.g., gemini-flash)
  backup:
    enabled: true            # Gates both auto and manual backups
    keep: 5                  # Retain N snapshots (prunes older)
```

### `--dry-run` Behavior

- Produces the **same review report** as a real run
- **No mutations** to the skill library
- **No snapshot taken** (since no mutations occur)
- Recommended as the **first step** before any real curation

### First-Run Deferral

On a brand-new install (or first time a pre-curator install ticks after `hermes update`):
- The curator **does NOT run immediately**
- `last_run_at` is seeded to "now"
- First real pass is **deferred by one full `interval_hours`**
- This gives users a full interval to review, pin, or opt out

> **Bug history:** Issue #18373 — "Curator should not auto-archive user-created custom skills without dry-run/approval." Users on existing installs with large skill libraries experienced unexpected auto-archival on first run. Led to improved first-run deferral behavior and stronger `--dry-run` recommendations.

### Opt-Out

Set `curator.enabled: false` in `config.yaml` to disable entirely.

---

## 8. Integration with agentskills.io Open Standard

### What is agentskills.io?

**agentskills.io** is an **open standard format** for describing reusable agent procedures using a **markdown-plus-YAML-frontmatter** format (the `SKILL.md` file). It enables:

- **Write once, run anywhere:** Skills can be shared across different agent frameworks
- **Human-readable and auditable:** Skills are prompt fragments plus metadata, not executable code
- **Version control friendly:** Plain text format that's easy to review and track

### Key Adopters

| Platform | Support Level |
|----------|---------------|
| **Hermes Agent** | Native — ships 100+ bundled skills across 24+ categories |
| **Claude Code** | Parses the format |
| **Cursor** | Parses the format |
| **Codex** | Parses the format |
| **Kiro** | Compatible |
| **VS Code** | Compatible |

### Hermes Agent's Hub Integration

Hermes integrates with multiple skill sources via `hermes skills install`:

| Source ID | Example Path | Description |
|-----------|--------------|-------------|
| `official` | `official/security/1password` | Built-in/optional skills (highest trust) |
| `skills-sh` | `skills-sh/vercel-labs/...` | Vercel's public skills directory |
| `well-known` | `well-known:https://...` | URL-based discovery from `/.well-known/skills/` |
| `github` | `openai/skills/k8s` | Direct GitHub repo/path installs |
| `clawhub` | — | Third-party skills marketplace |
| `claude-marketplace` | — | Claude-compatible plugins |
| `lobehub` | — | LobeHub agent catalog conversion |
| `url` | `https://.../SKILL.md` | Direct URL to single-file skills |

### Curator's Relationship to Hub Skills

- **Hub-installed skills are EXCLUDED** from curator review via `.hub/lock.json`
- The curator **never modifies** skills that did not originate from the agent or user
- This preserves the integrity of externally sourced skills
- Users can still `hermes skills update` hub skills independently

### Relationship to MCP (Model Context Protocol)

The agentskills.io standard **complements rather than competes** with Anthropic's MCP:

| | agentskills.io | MCP |
|--|---------------|-----|
| **Covers** | Procedural memory (how to do a task) | Tool I/O (what capabilities exist) |
| **Format** | Markdown + YAML frontmatter | JSON-RPC protocol |
| **Purpose** | Reusable workflows | Tool discovery and execution |

### ASFS Proposal

There is a related proposal for **ASFS (Agent Skill Format Standard)** that aims to make skills even more universal across frameworks (OpenClaw, Hermes, CrewAI, AutoGen, etc.), with an IETF draft in progress.

---

## 9. Known Issues & Bug History

| Issue | Description | Status |
|-------|-------------|--------|
| #17782 | `bump_use()` had zero production call sites — `use_count` always 0 | Fixed in v0.12.0 (#17932) |
| #17952 | Edit activity (patches) didn't count as lifecycle signal | Fixed in #17953 |
| #17942 | `restore_skill()` only scanned top-level `.archive/` | Fixed (rglob) |
| #18373 | Auto-archive without dry-run/approval on existing installs | Fixed — first-run deferral + dry-run recommendation |
| #11425 | RFC: Skills lifecycle management — usage tracking, stale detection, auto-cleanup | Implemented |
| #13534 | Skill Management — Usage Tracking, Conflict Detection, Pre-Creation Validation | Partially implemented |

---

## 10. Comparison-Relevant Design Decisions

| Aspect | Hermes Curator Approach |
|--------|------------------------|
| **Trigger** | Inactivity-based (not cron) — runs when idle + interval elapsed |
| **Model for review** | Auxiliary/cheaper model fork — saves cost, isolates from live work |
| **Scope** | Only agent-created skills — bundled and hub skills are sacred |
| **Destructive action ceiling** | Archive (never delete) — fully reversible |
| **User override** | Pin command — hard fence against all transitions and edits |
| **Audit trail** | `run.json` + `REPORT.md` per run — full transparency |
| **Pre-mutation safety** | Automatic tar.gz snapshot before every real pass |
| **First-run safety** | 7-day deferral + strong `--dry-run` recommendation |
| **Telemetry granularity** | Three counters (view/use/patch) with distinct analytical value |
| **Consolidation framing** | "Umbrella-building" — merge near-duplicates into canonical skills |

---

## Sources

- [Curator | Hermes Agent - Nous Research](https://hermes-agent.nousresearch.com/docs/user-guide/features/curator)
- [Skills System | Hermes Agent - Nous Research](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [CLI Commands Reference | Hermes Agent](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)
- [Tools & Toolsets | Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/tools)
- [NousResearch/hermes-agent GitHub](https://github.com/nousresearch/hermes-agent)
- [RELEASE_v0.12.0.md](https://github.com/NousResearch/hermes-agent/blob/main/RELEASE_v0.12.0.md)
- [GitHub Issue #16077 — RFC: review the Curator](https://github.com/NousResearch/hermes-agent/issues/16077)
- [GitHub Issue #18373 — Curator should not auto-archive without dry-run](https://github.com/NousResearch/hermes-agent/issues/18373)
- [GitHub Issue #17782 — bump_use() zero call sites](https://github.com/NousResearch/hermes-agent/issues/17782)
- [GitHub Issue #17952 — Curator status ignores edit activity](https://github.com/NousResearch/hermes-agent/issues/17952)
- [GitHub Issue #17942 — restore_skill nested archive subdirs](https://github.com/NousResearch/hermes-agent/issues/17942)
- [How Hermes Agent Solves Skill Drift and Context Rot — Mem0](https://www.linkedin.com/pulse/how-hermes-agent-solves-skill-drift-context-rot-self-improving-mem0-igq9f)
- [How to Keep Your AI Agent's Skill Library Clean — Deep Dive](https://www.xugj520.cn/en/archives/ai-agent-skill-library-hermes-curator.html)
- [The agentskills.io Standard — AI Skill Market](https://aiskill.market/blog/agentskills-io-standard-hermes-claude-code-cursor)
- [Hermes Agent v0.13 Reference — Blake Crosley](https://blakecrosley.com/guides/hermes)
- [Hermes Agent Skills — OpenClaw Launch](https://openclawlaunch.com/guides/hermes-agent-skills)
- [Hermes Just Built Garbage Collection for AI Agent Skills — AlphaSignal](https://www.linkedin.com/pulse/hermes-just-built-garbage-collection-ai-agent-skills-alphasignal-tucvc)
