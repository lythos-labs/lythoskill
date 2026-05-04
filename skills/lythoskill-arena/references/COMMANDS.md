<!-- AUTO-GENERATED -->
🎭 lythoskill-arena — Skill comparison runner

Usage:
  lythoskill-arena run --task <path> --players <A.toml,B.toml> --decks <A.toml,B.toml> --criteria <c1,c2,...> [--out <dir>]
  lythoskill-arena scaffold --task "<description>" --skills <skill1,skill2,...>
  lythoskill-arena scaffold --task "<description>" --decks <deck1,deck2,...>
  lythoskill-arena viz <arena-dir>

Commands:
  run       Run arena programmatically (cartesian player × deck → judge → report)
  scaffold  Create arena directory structure (legacy, manual subagent execution)
  viz       Visualize arena report (ASCII charts)

Options:
  -t, --task <path|desc> Task description or path to TASK-arena.md
  -s, --skills <list>    Comma-separated skill names (scaffold only)
      --decks <list>     Comma-separated deck paths
  -c, --criteria <list>  Evaluation criteria (default: syntax,context,logic,token)
      --players <list>   Comma-separated player.toml paths (run only)
      --control <skill>  Control skill for comparison (scaffold only)
      --out <dir>        Output directory (run: defaults to runs/arena-<id>)
  -d, --dir <dir>        Output directory (scaffold: defaults to tmp)
  -p, --project <dir>    Project directory (default: .)

Examples:
  lythoskill-arena run --task ./TASK-arena.md --players ./players/claude.toml,./players/kimi.toml --decks ./decks/run-01.toml,./decks/run-02.toml --criteria coverage,relevance
  lythoskill-arena scaffold --task "Refactor auth module" --skills skill-a,skill-b
  lythoskill-arena viz runs/arena-20260504

