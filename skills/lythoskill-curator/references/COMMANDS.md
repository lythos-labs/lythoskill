<!-- AUTO-GENERATED -->
Usage: lythoskill-curator [pool-path] [--output <dir>]
       lythoskill-curator add <github.com/owner/repo> --pool <dir> [--reason <text>] [--forked-from <locator>]
       lythoskill-curator query <SQL> [--db <path>]
       lythoskill-curator audit [--db <path>]
       lythoskill-curator restore [--output <dir>]

Commands:
  (no args)             Scan cold pool and build REGISTRY.json + catalog.db
  add <locator>         Download a skill to cold pool (no install, no deck.toml)
                         --reason <text>      Why this skill was added
                         --forked-from <loc>  Original skill if this is a fork
  query <SQL>           Query the catalog SQLite database (output: Markdown table)
  audit                 Run predefined checks and output an audit report
  restore               Roll back to the most recent backup

Options:
  --output, -o <dir>    Output directory (default: <pool>/.lythoskill-curator/)
  --pool <dir>          Cold pool path for add (default: ~/.agents/skill-repos)
  --db, -d <path>       Database path for query/audit (default: ./catalog.db)
