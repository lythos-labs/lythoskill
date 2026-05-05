# Test Results

Per-commit test output + coverage snapshots.

## Run locally

```bash
bun scripts/test-report.ts
```

Produces `test-results/<YYYYMMDD-HHMMSS>-<short-hash>.txt` with full suite output + coverage tables.

## CI artifacts

Every push to `main` uploads the test report as a CI artifact.
Download from the latest workflow run:

→ [Latest CI run](https://github.com/lythos-labs/lythoskill/actions/workflows/test.yml)

Click the run → scroll to **Artifacts** → download `test-report`.
