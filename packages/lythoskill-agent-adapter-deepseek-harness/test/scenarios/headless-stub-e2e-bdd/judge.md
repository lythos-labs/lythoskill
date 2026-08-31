# Judge criteria — headless-stub-e2e-bdd

Deterministic scenario (stubbed upstream, no LLM) — `reproduce.sh` self-asserts
and its exit code IS the verdict. This table documents what each assertion proves.

| ID | Criterion | Weight | How to Verify |
|----|-----------|--------|---------------|
| happy-path | `dsh --profile headless` final text (stdout) travels through the full arena CLI stack — player resolution → adapter import → upstream probe → spawn → artifact capture | 1 | `STUB-HEADLESS-OUTPUT: e2e stub task` found under scenario A `--out` dir |
| fail-closed | upstream reporting version 1.0.0 (outside declared `>=0.1.0 <1.0.0`) is rejected before spawn with a HATEOAS error, non-zero exit | 1 | exit ≠ 0 AND `dsh upstream probe failed` in scenario B log |
| alias | `--player dsh` resolves to `deepseek-harness` via built-in alias and runs | 0.5 | alias note in scenario C log + stub output in artifacts |

Verdict: PASS (all 1-weight criteria) / FAIL (any 1-weight fails). The stub
emulates the documented contract only — a PASS here does NOT replace the real-dsh
smoke run (acceptance item on TASK-20260829090402490, blocked on dsh install).
