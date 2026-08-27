# AB Club frozen shared contract

Version `1.0.0` is frozen by `foundation` and `integration`. Functional modules
may consume these files but must not edit or duplicate their enumerations.

The TypeScript source of truth is under `miniprogram/shared`. JSON under this
directory is the same-version machine-readable hand-off. Changes require a new
version, an integration proposal, migration notes, and contract-test updates.

Stable IDs are opaque non-empty identifiers. UTC instants must be RFC 3339
strings ending in `Z`. City time zones come only from `geography.json`.
Pagination cursors are opaque to callers, optimistic versions are monotonic,
and every mutating action requires an idempotency key. Media is public only
after its rights state is `APPROVED`.

Runtime state must be reported as `LIVE`, `DEGRADED`, or `OFFLINE_DEMO` without
silent demo fallback. A record's `REAL` or `SYNTHETIC` origin and its separate
verification state must remain visible in diagnostic and evidence paths.

