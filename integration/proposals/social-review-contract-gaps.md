# Social review contract change proposal

- Requesting module: `social review`
- Current authoritative contract: `1.0.0`
- Required owners for acceptance: `foundation`, `integration`
- Status: `PROPOSED_ONLY`

This proposal does not change the frozen 1.0.0 contract. Until both owners
accept a replacement contract, the social module fails closed: it never emits
an unprovable public tag and never invents a review timeline.

## 1. Label policy metadata

Affected type: `LabelDefinitionProjection`.

Add server-authored fields (or a new `SocialLabelPolicyProjection`) for:

- `category`: `PUBLIC_IDENTITY_TAG | PUBLIC_INTEREST_TAG | PRIVATE_PREFERENCE | SYSTEM_ROLE`
- `publicEligible`: boolean
- `riskLevel`: `STANDARD | HIGH_RISK`
- `materialPolicy`: allowed media types, per-file bytes, maximum item count, and redaction guidance
- `independentComplianceGateRequired`: boolean
- `minimumHumanReviewerCount`: positive integer

High-risk wealth, assets, vehicles, and family-background labels must remain
`publicEligible=false` in P0. A later release may only enable one with an
independent compliance feature flag and at least two distinct human reviewers.

Affected action: `tag.catalog`. Its response must expose only the safe policy
metadata needed by the authenticated applicant; it must not expose internal
role mappings or reviewer rules beyond the public application requirements.

## 2. Explicit user choice to publish

Affected actions/types: `verification.createDraft`, `verification.submit`,
`VerificationRequestProjection`.

Add an explicit, versioned `requestedPublicVisible` boolean written only by the
request owner. Do not infer consent from `userStatement`, evidence, label type,
or an administrator decision. Approval and the owner's publication choice are
independent facts. Consider a dedicated idempotent
`verification.setPublicVisibility` action so consent can be withdrawn without
re-running review.

## 3. Human review proof and owner timeline

Affected types: `PublicVerificationClaimProjection`,
`VerificationRequestProjection`, `ReviewCaseProjection`.

Introduce an immutable review-log contract and storage owner. A public claim
must be constructible only when it can bind to a valid log containing:

- `reviewLogId`, aggregate ID, aggregate version, and decision
- `reviewedBy`, `reviewedAt`, and `reviewScope`
- human actor kind and server-assigned reviewer role
- evidence digest and policy version
- for dual review, distinct reviewer IDs and both decision instants

The public projection needs enough proof metadata (or a signed proof reference)
for downstream producers to verify the binding without reading social-domain
internals. The owner projection needs a redacted `timeline` that can show real
submitted/reviewed/changes/decision events. OCR or AI findings must remain
separate advisory records and can never supply the human fields.

Affected actions: Prompt 06 `adminApi` review actions are the only actions that
may append human decision logs or create/revoke claims. This proposal adds no
administrator decision action to `socialApi`.

## 4. Normalized relationship-pair uniqueness

Affected schema/indexes: `friendships`.

Freeze a server-derived normalized `pairKey` (sorted user IDs or an equivalent
collision-resistant deterministic document key) and a unique index. Client
payloads must never supply it. A transaction must resolve same-direction retry
and opposite-direction concurrency against that one key. The conservative P0
rule is that a reverse request against an existing `PENDING` record returns the
same pending relationship and does not implicitly accept it. Terminal records
may be reopened only through a versioned, audited transition on the same pair.

## Backward compatibility

Prefer additive optional fields and a new item/proof projection during a
versioned compatibility window. Existing 1.0.0 consumers continue to receive
the current shapes. New public-tag behavior remains disabled until every
producer and consumer validates the new proof fields. Do not reinterpret an
existing 1.0.0 field to mean consent, review proof, or category.

## Migration plan

1. Foundation and integration approve the exact enums, DTOs, action registry,
   review-log collection owner, normalized-pair unique index, and security rules.
2. Freeze a new contract version and regenerate action/contract tests.
3. Prompt 06 migrates administrator decisions to append immutable review logs
   and backfills no approval without existing human evidence.
4. Existing claims lacking a valid log remain non-public and are reported by a
   data audit; they are never auto-repaired into `HUMAN_REVIEWED`.
5. Social and identity consumers adopt the new proof and user-consent fields.
6. Only after local, Developer Tools, device, CloudBase, and revocation tests
   pass may the public-tag feature flag be considered for enablement.

## Required tests after acceptance

- Contract/type tests for all new exact shapes and cross-module import limits.
- A missing, mismatched, AI-authored, expired, revoked, or wrong-scope review
  log must reject public projection.
- High-risk labels require both the independent compliance flag and two
  distinct human decision logs.
- Approval without explicit owner publication choice stays private; revoking
  the choice removes public access atomically and appends
  `VERIFICATION_CHANGED`.
- Same-direction retry and simultaneous opposite-direction requests leave one
  pair record; neither request can create an implicit acceptance.
