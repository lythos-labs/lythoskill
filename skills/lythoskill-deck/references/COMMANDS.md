<!-- AUTO-GENERATED -->
lythoskill-deck -- Declarative skill deck governance — cold pool, working set, deny-by-default

Usage: lythoskill-deck link | lythoskill-deck add <locator> | lythoskill-deck refresh [<fq|alias>] | lythoskill-deck validate [deck.toml] | lythoskill-deck remove <fq|alias> | lythoskill-deck prune [--yes] | lythoskill-deck sync <alias> | lythoskill-deck freeze <alias> | lythoskill-deck reconcile [--apply] | lythoskill-deck migrate-schema [--dry-run]

Commands:
  link                        Sync working set with skill-deck.toml
  add <locator>               Download skill to cold pool and add to deck
  refresh [<fq|alias>]        Pull latest versions of declared skills from upstream
  validate [deck.toml]        Validate deck configuration
  remove <fq|alias>           Remove a skill from deck.toml and working set
  prune [--yes]               GC cold pool repos no longer referenced by any deck
  sync <alias>                Switch skill from snapshot (cp) to sync (symlink)
  freeze <alias>              Switch skill from sync (symlink) to snapshot (cp), pinning current HEAD
  reconcile [--apply]         Compare lock file (desired) vs cold pool (actual), report drift
  migrate-schema [--dry-run]  Convert string-array deck.toml to alias-as-key dict

Options:
  --deck <path>              Specify skill-deck.toml path (default: find upward from cwd)
  --workdir <dir>            Specify working directory (default: cwd)
  --mode <symlink|snapshot>  Link mode: symlink (default) or snapshot (cp)
  --no-backup                Skip tar backup when removing non-symlink entries
  --alias <name>             Explicit alias for the skill (default: basename of path)
  --type <type>              Target section: innate | tool | combo (default: tool)
  --dry-run                  Show plan without executing (add, prune)
  --yes                      Skip interactive confirmation (for prune)
  --remote                   For validate: probe each FQ locator against api.github.com
  --format <text|json>       For validate: output format (default: text)
