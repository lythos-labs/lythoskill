<!-- AUTO-GENERATED -->
Usage: lythoskill-curator [pool-path] [--output <dir>]
       lythoskill-curator add <github.com/owner/repo> --pool <dir> [--reason <text>] [--forked-from <locator>] [--branch <name>] [--full]
       lythoskill-curator tag <skill-name> --niche <value> [--qa <json>]
       lythoskill-curator refresh-plan [--pool <dir>]
       lythoskill-curator refresh-execute [--pool <dir>]
       lythoskill-curator query <SQL> [--db <path>]
       lythoskill-curator audit [--db <path>]
       lythoskill-curator find <bare-name> [--db <path>]
       lythoskill-curator restore [--output <dir>]

Commands:
  (no args)             Scan cold pool and build REGISTRY.json + catalog.db
  add <locator>         Download a skill to cold pool (no install, no deck.toml)
                         --dry-run           Show plan without executing
                         --output <dir>       Index output directory (default: ~/.agents/lythoskill/curator/)
                         --reason <text>      Why this skill was added
                         --forked-from <loc>  Original skill if this is a fork
                         --branch <name>      Specific branch (default: default branch)
                         --full              Full clone (default: --depth 1 shallow)
  tag <skill-name>      Write agent-enriched metadata (niche + QA) to indexed skill
                         --niche <value>      Niche tag (repeatable)
                         --qa <json>          QA signal with provenance
  refresh-plan          Scan cold pool for git repos, check upstreams, write TODO
                         --pool <dir>        Cold pool path
  refresh-execute       Pull behind repos one by one, marking progress in plan
                         --pool <dir>        Cold pool path
  query <SQL>           Query the catalog SQLite database (output: Markdown table)
  audit                 Run structural + legacy checks and output an audit report
  find <bare-name>      Look up a skill by bare name, return full path + deck add command
                         --db <path>      Use a specific catalog database
  restore               Roll back to the most recent backup

Options:
  --output, -o <dir>    Output directory (default: <pool>/.lythoskill-curator/)
  --pool <dir>          Cold pool path for add (default: ~/.agents/skill-repos)
  --db, -d <path>       Database path for query/audit/tag (default: ./catalog.db)
