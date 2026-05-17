# Player Setup & Discovery

## Auto-Detection (first run)

Arena auto-detects available players on first run:

1. Checks `which kimi`, `which codex`, `which deepseek` (CLI-wrapped players)
2. Checks `ANTHROPIC_API_KEY` for Claude (SDK — no CLI binary needed)
3. Records available players to `~/.agents/lythoskill/arena/players.json`
4. Defaults to `kimi` if available (proven headless reliability)
5. If no players found, guides installation

```bash
# Supported players (install at least one):
uv tool install kimi-cli                    # kimi (recommended — most reliable headless)
npm i -g @openai/codex                      # codex (codex exec --json)
# deepseek: bundled with DeepSeek desktop app or pip install deepseek-cli
# claude: uses Anthropic SDK (API key), no CLI binary required
```

## Player Priority

| Player | Priority | Headless mode | When to use |
|--------|----------|---------------|-------------|
| **kimi** (default) | 1st | `--print --afk` | Best cost/reliability ratio. Eager tools, no deadlock. |
| **codex** | 2nd | `codex exec --json` | If you already have codex installed. |
| **deepseek** | 3rd | `deepseek serve --http` | Daemon mode for headless use. |
| **claude** | 4th | SDK (`claude-sdk` adapter) | Uses Anthropic SDK directly — no shell spawn, no deadlock. |

If `player` is omitted, arena tries kimi → codex → deepseek → claude.

## API Key Setup

Each player needs its own auth. **Web-search the latest install + auth instructions** (they change between versions):

| Player | Auth setup (run once) | Verify |
|--------|----------------------|--------|
| **kimi** | `kimi login` or `export KIMI_API_KEY=...` | `kimi --print -p "hello"` |
| **codex** | `codex login` or `export OPENAI_API_KEY=...` | `which codex && codex --version` |
| **deepseek** | `deepseek login` or `export DEEPSEEK_API_KEY=...` | `which deepseek && deepseek --version` |
| **claude** | `export ANTHROPIC_API_KEY=...` (or `claude login` for OAuth) | `echo $ANTHROPIC_API_KEY` |

For CLI-wrapped players (kimi/codex/deepseek): if `which <player>` fails, guide the user to install first. For Claude (SDK): only the API key matters.
