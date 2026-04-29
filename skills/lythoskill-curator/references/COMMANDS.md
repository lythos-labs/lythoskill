Usage: lythoskill-curator [pool-path] [--output <dir>]
       lythoskill-curator query <SQL> [--db <path>]

Commands:
  (no args)             Scan cold pool and build REGISTRY.json + catalog.db
  query <SQL>           Query the catalog SQLite database

Options:
  --output, -o <dir>    Output directory (default: <pool>/.lythoskill-curator/)
  --db, -d <path>       Database path for query subcommand
