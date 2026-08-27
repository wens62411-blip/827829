# Social review local evidence

- Contract: frozen `1.0.0`
- Evidence ceiling: `LOCAL_TEST_PASS`
- Runtime: dependency-injected in-memory transaction model
- Not evidence of: CloudBase execution, Developer Tools preview, device run,
  development upload, release, or human review

## Relationship state matrix

`BLOCKED` is an independent active block record. `REMOVED` is the frozen
friendship tombstone and is treated as no active relationship: it grants no
access and may be reused as the one normalized pair record for a later request.

| Current relationship | Actor/action | Result | FRIENDS_ONLY | Invalidation |
|---|---|---|---|---|
| none | either active, unblocked user / `friend.request` | `PENDING` | denied | `RELATIONSHIP_CHANGED` |
| `PENDING` | same requester / duplicate `friend.request` | same pair and version; idempotent | denied | no duplicate append |
| `PENDING` | opposite user / concurrent `friend.request` | same `PENDING` pair; never implicit accept | denied | one pair remains |
| `PENDING` | addressee / `friend.accept` | `ACCEPTED` | granted only while no block exists | `RELATIONSHIP_CHANGED` |
| `PENDING` | addressee / `friend.reject` | `REJECTED` | denied | `RELATIONSHIP_CHANGED` |
| `PENDING` | requester / `friend.cancel` | `CANCELLED` | denied | `RELATIONSHIP_CHANGED` |
| `PENDING` | wrong participant/action | rejected (`FORBIDDEN` or `NOT_FOUND`) | denied | none |
| `ACCEPTED` | either participant / `friend.remove` | `REMOVED` | revoked immediately | `RELATIONSHIP_CHANGED` |
| `ACCEPTED` | accept/reject/cancel again | rejected (`CONFLICT`) | unchanged until a valid remove/block | none |
| `REJECTED` or `CANCELLED` | new `friend.request` | rejected (`CONFLICT`) | denied | none |
| `REMOVED` | either unblocked user / `friend.request` | same normalized pair reopens as `PENDING` | denied | `RELATIONSHIP_CHANGED` |
| any active relationship | either user / `block.create` | active block plus friendship `REMOVED` | revoked immediately | block and friendship invalidations |
| active block | blocker / `block.remove` | block removed; friendship stays `REMOVED` | denied | `RELATIONSHIP_CHANGED` |
| active block | either direction / `friend.request` | rejected (`BLOCKED_RELATIONSHIP`) | denied | none |

The normalized pair key is server-derived and the in-memory repository
serializes transactions. A database unique index is still a frozen-contract
proposal and is not claimed as deployed evidence.

## Public tag matrix

| Category/state | May apply in P0 | May appear publicly |
|---|---:|---:|
| enabled `PUBLIC_IDENTITY_TAG` | yes | only after every proof gate below passes |
| enabled `PUBLIC_INTEREST_TAG` | yes | same full human-review proof as identity tags |
| high-risk wealth/assets/vehicles/family | yes, application path retained | no in P0 (`publicEligible=false`, compliance disabled) |
| future high-risk configuration | contract-dependent | only with independent compliance enabled and at least two distinct valid human reviewers |
| `PRIVATE_PREFERENCE` | not through the public-verification catalog | never |
| `SYSTEM_ROLE` | no | never; it is permission, not an honor |
| disabled or unknown label | no | never |
| `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `NEEDS_CHANGES`, `REJECTED` | owner state only | never |
| `APPROVED` without a complete matching ReviewLog | n/a | never |
| `EXPIRED` or `REVOKED` | n/a | never |

An `APPROVED` claim projects only if all of these are true: matching enabled
public catalog category, `publicEligible`, explicit owner publication choice,
`publicVisible`, `HUMAN_REVIEWED`, valid `reviewedBy`, `reviewedAt` and
`reviewScope`, a matching successful human `review.approve` ReviewLog, valid
label/scope/time binding, and no expiry or revocation. Public output is rebuilt
from audited claim records and does not trust a pre-populated card `claims`
array. AI/OCR confidence is never one of these proof gates.

## Material and ownership negative tests

| Negative case | Expected result |
|---|---|
| payload supplies `ownerId`, `userId`, `openid`, `_openid` or roles | `INVALID_REQUEST`; server principal remains authoritative |
| another user requests upload policy or reads/withdraws the application | `NOT_FOUND`; no existence disclosure |
| unknown, disabled, private-preference or system-role label | `NOT_FOUND` or `FORBIDDEN` |
| second active case for the same owner and label | existing draft idempotently reused, or `CONFLICT` after submission |
| media type outside label allowlist | `VALIDATION_FAILED` |
| file exceeds label byte limit | `VALIDATION_FAILED` |
| malformed SHA-256 | `VALIDATION_FAILED` |
| upload authorization expired, upload completed after expiry, or asset belongs to another request | `MEDIA_RIGHTS_REQUIRED`; request remains draft |
| missing, unuploaded or excessive evidence | `REVIEW_EVIDENCE_REQUIRED` or `VALIDATION_FAILED`; no partial transition |
| AI/OCR result has confidence `1.0` | request remains `SUBMITTED`; no ReviewLog, claim or `APPROVED` state |
| owner/public response inspection | no `storageFileId`, `cloudPath`, original/download/evidence URL, or raw OCR text |

The private path is opaque and contains neither the user ID nor verification
request ID. Its real CloudBase ACL and digest-to-stored-byte enforcement remain
unverified because no authorized storage adapter or environment was supplied.

## Redacted visual evidence

- Fixture: `tests/components/social/fixtures/review-timeline-demo-only.json`
- PNG: `tests/components/social/artifacts/review-timeline-demo-only.png`
- SVG source: `tests/components/social/artifacts/review-timeline-demo-only.svg`

All three are explicitly `SYNTHETIC` and `DEMO_ONLY`. The PNG is a local static
render for layout review, not a WeChat Developer Tools screenshot. It labels the
timeline as a state path, not a ReviewLog, and does not infer reviewer identity
or time from `updatedAt`.

## Command and exit-code ledger

Passing module evidence:

| Command | Exit | Result |
|---|---:|---|
| explicit five-file `node --test --test-isolation=none tests/cloud/social/...` | 0 | 38/38 passed |
| `node --test --test-isolation=none tests/components/social/social-ui.test.mjs` | 0 | 8/8 passed; one non-failing Node module-type warning |
| strict direct `tsc` for `cloudfunctions/socialApi/index.ts` | 0 | no diagnostics |
| `npm run typecheck:miniprogram` | 0 | no diagnostics |
| latest `npm run typecheck:cloud` | 0 | no diagnostics across cloud modules |
| `npm run typecheck:contracts` | 0 | no diagnostics |
| `npm run validate` | 0 | 337/337 validations passed |
| `npm run build:test-runtime` | 0 | test runtime emitted |
| targeted esbuild of `cloudfunctions/socialApi/index.ts` | 0 | self-contained `index.js` emitted during scoped iteration |
| latest `npm run check:cloud-runtime` | 0 | all 13 bundles match source SHA-256 `df7d5b8fa877874e3e3c68b3f6a265d0385a9e10a515534a97d448a0cebd1972` |
| final `npm run build` | 0 | all typechecks, 337 validations, runtime hashes and static package budget passed; Node: 213 passed, 0 failed, 6 optional jsdom-dependent checks skipped |

Repository-wide diagnostics, not promoted to social evidence:

| Command | Exit | Result |
|---|---:|---|
| earlier `npm run build` during an out-of-scope manifest replacement | 1 | Node reached 208/215 while `integration/manifests/art.json` was briefly absent; the file returned and the final build exited 0 |
| earlier `npm run typecheck:cloud` during concurrent event work | 1 | transient out-of-scope eventApi diagnostics; the latest run is exit 0 |
| earlier `npm run check:cloud-runtime` during concurrent shared work | 1 | transient `_shared/auth/index.js` staleness; the latest run is exit 0 |
| earlier direct `node --test --test-isolation=none` | 1 | 196/208 passed with six out-of-scope identity/share-contract failures; those later passed in the latest build run |
| `node --test --test-isolation=none tests/cloud/social` | 1 | discarded invocation: Node does not accept a directory as a test module; replaced by the explicit five-file command above |

The final social claim is based on the scoped compile, current generated bundle,
38/38 cloud suite, 8/8 component suite and final full build exit `0`. Transient
concurrent failures are retained above for a complete command ledger but are
not presented as current social-module failures.
