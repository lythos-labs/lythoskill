<!-- AUTO-GENERATED -->
Usage: lythoskill-curator [pool-path] [--output <dir>]
       lythoskill-curator query <SQL> [--db <path>]
       lythoskill-curator audit [--db <path>]
       lythoskill-curator restore [--output <dir>]

Commands:
  (no args)             Scan cold pool and build REGISTRY.json + catalog.db
  query <SQL>           Query the catalog SQLite database (output: Markdown table)
  audit                 Run predefined checks and output an audit report
  restore               Roll back to the most recent backup

Options:
  --output, -o <dir>    Output directory (default: <pool>/.lythoskill-curator/)
  --db, -d <path>       Database path for query/audit (default: ./catalog.db)
