<!-- AUTO-GENERATED -->
🎭 lythoskill-arena — Skill comparison runner

Usage:
  lythoskill-arena single --task <path> --deck <path> [--player kimi] [--out <dir>] [--timeout <ms>]
  lythoskill-arena single --brief "<prompt>" --deck <path> [--out <dir>] [--timeout <ms>]
  lythoskill-arena vs --config arena.toml [--dry-run]
  lythoskill-arena scaffold --task "<description>" --decks <deck1,deck2,...>
  lythoskill-arena viz <arena-dir>

Commands:
  single    Single-player deck test (exec shortcut): test a deck with one player
  vs        Multi-side comparison: run arena from declarative arena.toml
  scaffold  Create arena directory structure (legacy, manual subagent execution)
  viz       Visualize arena report (ASCII charts)

Options:
  -t, --task <path|desc> Task description or path to TASK-arena.md / .agent.md
      --deck <path>      Deck path (single only)
      --brief "<text>"   Inline task description (single only, alternative to --task)
      --player <name>    Agent player (single only, default: kimi)
  -c, --criteria <list>  Evaluation criteria (scaffold only, default: syntax,context,logic,token)
      --config <path>    Path to arena.toml (vs only)
      --dry-run          Print execution plan without running (vs --config only)
      --out <dir>        Output directory
  -d, --dir <dir>        Parent dir (scaffold: defaults to tmp)
  -p, --project <dir>    Project root (default: .)
      --timeout <ms>     Subagent timeout (single only)

Examples:
  # Single-player deck test (exec shortcut)
  lythoskill-arena single --task ./TASK.agent.md --deck ./deck.toml
  lythoskill-arena single --brief "Generate auth flow diagram" --deck ./deck.toml --player kimi

  # Multi-side comparison (declarative)
  lythoskill-arena vs --config ./arena.toml
  lythoskill-arena vs --config ./arena.toml --dry-run

  # Legacy scaffolding
  lythoskill-arena scaffold --task "Refactor auth module" --decks ./decks/a.toml,./decks/b.toml
  lythoskill-arena viz runs/arena-20260504

