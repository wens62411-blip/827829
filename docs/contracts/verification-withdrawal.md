# Verification withdrawal — v1.0.0

`verification.withdraw` is a terminal deletion operation, not a
`ReviewStatus` transition. No `WITHDRAWN` status exists and no ninth review
transition is permitted.

Only the owning user may withdraw a request whose current status is `DRAFT` or
`SUBMITTED`. The service must compare `expectedVersion` and execute the
following atomically: physically delete the `verification_requests` document,
append the namespaced idempotency result, append an immutable audit record, and
append a `VERIFICATION_CHANGED` projection invalidation using the deleted
record's version. The invalidation reason is
`VERIFICATION_REQUEST_WITHDRAWN`.

The successful response is a `VerificationWithdrawalTombstone` containing the
stable request ID, previous status, deleted version, withdrawal UTC instant,
physical-deletion marker, and invalidation marker. It is not a surviving
`VerificationRequestProjection`. An idempotent retry returns the stored first
result. `UNDER_REVIEW`, `NEEDS_CHANGES`, `APPROVED`, `REJECTED`, `EXPIRED`, or
`REVOKED` returns `REVIEW_INVALID_TRANSITION` without deletion.

