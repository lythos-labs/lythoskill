# Architecture: Cold Pool → Deck → Working Set
## Three-Layer Model
```
Cold Pool (storage)           Declaration (intent)          Working Set (runtime)
~/.agents/skill-repos/        skill-deck.toml               .claude/skills/
├── github.com/...            ├── [deck]                    ├── skill-a → (symlink)
├── gitlab.com/...            │   max_cards = 10            ├── skill-b → (symlink)
└── localhost/...             ├── [innate] / [tool]         └── skill-c → (symlink)
                              ├── [combo]                              └── [transient]
```
- **Cold Pool**: Local storage of all downloaded skills. Agent never scans here.
  Go-module-style paths: `host.tld/owner/repo/skills/skill-name/`.
- **skill-deck.toml**: Human-edited declaration of desired state.
- **Working Set**: `.claude/skills/` — symlinks only. The sole location the agent scans.
- **skill-deck.lock**: Machine-generated. Records resolved paths, content hashes,
  and constraint snapshots. Enables recovery on agent/machine switch.
## Cold Pool Directory Convention
```
~/.agents/skill-repos/
├── github.com/
│   ├── lythos-labs/lythoskill/skills/
│   │   ├── lythoskill-deck/SKILL.md
│   │   └── lythoskill-creator/SKILL.md
│   └── someone/standalone-skill/SKILL.md
└── localhost/
    └── my-experiment/SKILL.md
```
| Pattern | Example | Meaning |
|---------|---------|---------|
| `host/owner/repo/skills/name/` | `github.com/lythos-labs/lythoskill/skills/lythoskill-deck/` | Monorepo skill |
| `host/owner/repo/` | `github.com/someone/standalone-skill/` | Standalone (repo root = skill) |
| `localhost/name/` | `localhost/my-experiment/` | Local-only, no remote origin |
## Local Development Mode
Set `cold_pool = "."` in your toml. The project root becomes a cold pool entry
and `./skills/` is scanned for skill directories.
## Analogies
| Concept | K8s | Go modules | TCG |
|---------|-----|-----------|-----|
| Cold Pool | Container registry | `$GOPATH/pkg/mod/` | Card binder |
| skill-deck.toml | Deployment manifest | `go.mod` | Deck list |
| `deck link` | Controller reconcile | `go mod tidy` | Shuffle & draw |
| Working Set | Running pods | Loaded modules | Hand in play |
| skill-deck.lock | Rollout status | `go.sum` | Match record |
