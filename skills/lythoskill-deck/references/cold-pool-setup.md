# Cold Pool Setup
The cold pool stores skills when they are not active. Deck does **not** download
skills — filling the cold pool is your responsibility.
## Filling Methods
| Method | Command | Best for |
|--------|---------|----------|
| git clone | `git clone https://github.com/owner/repo ~/.agents/skill-repos/github.com/owner/repo` | Any git repo |
| Vercel skills | `npx skills add owner/repo -g --skill skill-name` | Vercel-compatible repos |
| Manual copy | `cp -r ./my-skill ~/.agents/skill-repos/localhost/my-skill` | Local experiments |
## Directory Structure
Go-module-style paths for global uniqueness and source traceability:
```
~/.agents/skill-repos/
├── github.com/<owner>/<repo>/
│   └── skills/<skill-name>/SKILL.md     # monorepo
├── gitlab.com/<owner>/<repo>/SKILL.md   # standalone
└── localhost/<name>/SKILL.md            # local-only
```
Deck only checks whether `SKILL.md` exists at the resolved path.
It does not care how the skill arrived.
## Local Development Shortcut
```toml
[deck]
cold_pool = "."    # project root = cold pool entry
```
Skills at `./skills/<name>/` become directly available without copying to the global pool.
## Quick Reference
```bash
# Clone to cold pool
git clone https://github.com/lythos-labs/lythoskill \
  ~/.agents/skill-repos/github.com/lythos-labs/lythoskill
# Declare and sync
# (edit skill-deck.toml to add the skill, then:)
bunx @lythos/skill-deck link
```
