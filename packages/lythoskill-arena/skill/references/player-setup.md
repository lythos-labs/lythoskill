# Player Setup & Discovery

> **Default mode changed (ADR-20260828004129143)**: inside an agent session,
> `arena single` without `--player` prints host-handoff guidance and exits —
> the host agent orchestrates the run itself. External players below are only
> spawned when `--player` is passed explicitly (or when no agent host is
> detected, where `--player` is required).

## Auto-Detection (first run)

When `--player` is passed, arena resolves the named player:

1. CLI-wrapped players need their binary on PATH (`which kimi`, `which codex`, `which deepseek`)
2. Claude (SDK) needs `ANTHROPIC_API_KEY` — no CLI binary
3. Unknown/failed resolution fails loudly with install guidance

```bash
# Supported players (install at least one):
uv tool install kimi-cli                    # kimi (recommended — most reliable headless)
npm i -g @openai/codex                      # codex (codex exec --json)
# deepseek: bundled with DeepSeek desktop app or pip install deepseek-cli
# claude: uses Anthropic SDK (API key), no CLI binary required
```

## Player Priority

| Player | Headless mode | When to use |
|--------|---------------|-------------|
| **kimi** | `--print --afk` | Best cost/reliability ratio. Eager tools, no deadlock. |
| **codex** | `codex exec --json` | If you already have codex installed. |
| **deepseek** | `deepseek serve --http` | Daemon mode for headless use. |
| **claude** | SDK (`claude-sdk` adapter) | Uses Anthropic SDK directly — no shell spawn, no deadlock. |

There is no fallback chain: `player` is either given explicitly via `--player`, or the run is host-handoff (agent session) / a loud error (no host). Pick the player that matches your goal — for cross-player comparison, run one `--player` per side.

## API Key Setup

Each player needs its own auth. **Web-search the latest install + auth instructions** (they change between versions):

| Player | Auth setup (run once) | Verify |
|--------|----------------------|--------|
| **kimi** | `kimi login` or `export KIMI_API_KEY=...` | `kimi --print -p "hello"` |
| **codex** | `codex login` or `export OPENAI_API_KEY=...` | `which codex && codex --version` |
| **deepseek** | `deepseek login` or `export DEEPSEEK_API_KEY=...` | `which deepseek && deepseek --version` |
| **claude** | `export ANTHROPIC_API_KEY=...` (or `claude login` for OAuth) | `echo $ANTHROPIC_API_KEY` |

For CLI-wrapped players (kimi/codex/deepseek): if `which <player>` fails, guide the user to install first. For Claude (SDK): only the API key matters.
