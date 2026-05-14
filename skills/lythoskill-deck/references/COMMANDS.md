<!-- AUTO-GENERATED -->
lythoskill-deck -- Declarative skill deck governance — cold pool, working set, deny-by-default

Usage: lythoskill-deck link | lythoskill-deck add <locator> | lythoskill-deck refresh [<fq|alias>] | lythoskill-deck validate [deck.toml] | lythoskill-deck remove <fq|alias> | lythoskill-deck to-symlink <alias> | lythoskill-deck to-snapshot <alias> | lythoskill-deck migrate-schema [--dry-run]

Commands:
  link                        Sync working set with skill-deck.toml
  add <locator>               Download skill to cold pool and add to deck
  refresh [<fq|alias>]        Pull latest versions of declared skills from upstream
  validate [deck.toml]        Validate deck configuration
  remove <fq|alias>           Remove a skill from deck.toml and working set
  to-symlink <alias>          Switch a skill to symlink mode (live link, follows cold pool)
  to-snapshot <alias>         Switch a skill to snapshot mode (pinned cp of current HEAD)
  migrate-schema [--dry-run]  Convert string-array deck.toml to alias-as-key dict

Options:
  --deck <path>              Specify skill-deck.toml path (default: find upward from cwd)
  --workdir <dir>            Specify working directory (default: cwd)
  --mode <symlink|snapshot>  Link mode: symlink (default) or snapshot (cp)
  --no-backup                Skip tar backup when removing non-symlink entries
  --alias <name>             Explicit alias for the skill (default: basename of path)
  --type <type>              Target section: innate | tool | combo (default: tool)
  --dry-run                  Show plan without executing (add)
  --yes                      Skip interactive confirmation
  --remote                   For validate: probe each FQ locator against api.github.com
  --format <text|json>       For validate: output format (default: text)
  --exec                     For refresh: execute git pull instead of printing plan-only
