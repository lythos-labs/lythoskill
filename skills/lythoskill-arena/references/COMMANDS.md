<!-- AUTO-GENERATED -->
lythoskill-arena — skill evaluation CLI

Usage:
  lythoskill-arena single|vs|viz <options>

Commands:
  single   Test one deck against a task (--deck + --brief or --task)
  vs       Compare decks via arena.toml (declarative, Pareto-optimal)
  viz      Visualize a completed arena run (HTML + chart)

Modes (single):
  Inside an agent session  → host-handoff guidance (default; no external spawn)
  Anywhere else            → pass --player <name> (kimi|kimi-code|codex|claude|deepseek)

Examples:
  lythoskill-arena single --brief "find and research" --deck ./decks/scout.toml
  lythoskill-arena single --brief "find and research" --deck https://raw.githubusercontent.com/lythos-labs/lythoskill/main/examples/decks/scout.toml
  lythoskill-arena vs --config arena.toml --dry-run
  lythoskill-arena vs --config arena.toml
  lythoskill-arena viz runs/arena-20260504
  lythoskill-arena prepare-workdir --deck ./decks/scout.toml --out /tmp/arena-20260517-side-a
  lythoskill-arena archive --from /tmp/arena-20260517 --to playground/arena-20260517 --sides side-a,side-b

