<!-- AUTO-GENERATED -->
🎭 lythoskill-arena — Skill comparison runner

Usage:
  lythoskill-arena --task "<task description>" --skills <skill1,skill2,...>
  lythoskill-arena --task "<task description>" --decks <deck1,deck2,...>
  lythoskill-arena viz <arena-dir>

Options:
  -t, --task <desc>      Task description (required)
  -s, --skills <list>    Comma-separated skill names
      --decks <list>     Comma-separated deck paths
  -c, --criteria <list>  Evaluation criteria (default: syntax,context,logic,token)
      --control <skill>  Control skill for comparison (default: lythoskill-project-scribe)
  -d, --dir <dir>        Output directory (default: tmp)
  -p, --project <dir>    Project directory (default: .)

Examples:
  lythoskill-arena --task "Refactor auth module" --skills skill-a,skill-b
  lythoskill-arena --task "Write tests" --decks ./decks/minimal.toml,./decks/full.toml
  lythoskill-arena viz tmp/arena-20260430

