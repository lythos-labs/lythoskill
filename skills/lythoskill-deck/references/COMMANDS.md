<!-- AUTO-GENERATED -->
lythoskill-deck -- Declarative skill deck governance — cold pool, working set, deny-by-default

Usage: lythoskill-deck link | lythoskill-deck add <locator> | lythoskill-deck update | lythoskill-deck validate [deck.toml]

Commands:
  link                  Sync working set with skill-deck.toml
  add <locator>         Download skill to cold pool and add to deck
  update                Pull latest versions of declared skills from upstream
  validate [deck.toml]  Validate deck configuration

Options:
  --deck <path>    Specify skill-deck.toml path (default: find upward from cwd)
  --workdir <dir>  Specify working directory (default: cwd)
  --no-backup      Skip tar backup when removing non-symlink entries
  --via <backend>  Download backend: git (default) | skills.sh
