<!-- AUTO-GENERATED -->
lythoskill-deck -- Declarative skill deck governance — cold pool, working set, deny-by-default

Usage: lythoskill-deck link | lythoskill-deck add <locator> | lythoskill-deck refresh [<fq|alias>] | lythoskill-deck validate [deck.toml] | lythoskill-deck remove <fq|alias> | lythoskill-deck prune [--yes] | lythoskill-deck migrate-schema [--dry-run]

Commands:
  link                        Sync working set with skill-deck.toml
  add <locator>               Download skill to cold pool and add to deck
  refresh [<fq|alias>]        Pull latest versions of declared skills from upstream
  validate [deck.toml]        Validate deck configuration
  remove <fq|alias>           Remove a skill from deck.toml and working set
  prune [--yes]               GC cold pool repos no longer referenced by any deck
  migrate-schema [--dry-run]  Convert string-array deck.toml to alias-as-key dict

Options:
  --deck <path>    Specify skill-deck.toml path (default: find upward from cwd)
  --workdir <dir>  Specify working directory (default: cwd)
  --no-backup      Skip tar backup when removing non-symlink entries
  --via <backend>  Download backend: git (default) | skills.sh
  --as <alias>     Explicit alias for the skill (default: basename of path)
  --type <type>    Target section: innate | tool | combo (default: tool)
  --yes            Skip interactive confirmation (for prune)
