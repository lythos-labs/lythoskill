# SUPERSEDED: ADR-20260529002942317 — CLI Entry Point IO Injection Exemption

> ⚠️ **Superseded by user decision on 2026-05-29**.
> The "unified style > exemption complexity" principle was adopted: all CLI entry
> points must use IO injection, no exemptions. The 60 lines of boilerplate are
> cheaper than the cognitive tax of remembering when an exemption applies.
>
> **What changed**: `runAdd`, `runFind`, `runCurator`, `removeSkill`,
> `toSymlinkSkill`, and `toSnapshotSkill` were all refactored to accept injectable
> IO interfaces (`CuratorIO`, `DeckIO`, `SymlinkSnapshotIO`). Zero `spyOn(console)`
> remains in the codebase.
>
> **Full history**: `git log -- cortex/adr/03-superseded/SUPERSEDED-ADR-20260529002942317-*.md`
>
> This file is intentionally stripped. The original content is in git history.
> This ADR is preserved — not deleted — as a governance sample: a proposed
> exemption that was accepted, then superseded. The record of the reversal is
> as important as the record of the original decision.
