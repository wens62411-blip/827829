import { CLOUD_ACTION_REGISTRY, type CloudAction } from '../../miniprogram/shared/contracts';
import { isLegalReviewTransition } from '../../miniprogram/shared/constants/review-transitions';
import { ApiErrorCode } from '../../miniprogram/shared/types/api';
import {
  MediaRightsState,
  ProjectionInvalidationKind,
  ReviewStatus,
  VerificationState,
} from '../../miniprogram/shared/types/enums';
import type {
  AuditEntryProjection,
  ProjectionInvalidation,
  ReportProjection,
  ReviewCaseProjection,
} from '../../miniprogram/shared/types/projections';
import type {
  IdempotencyKey,
  OptimisticVersion,
  PaginationCursor,
  ReportId,
  RequestId,
  ReviewCaseId,
  StableId,
  UtcInstant,
} from '../../miniprogram/shared/types/primitives';
import { requireTrustedOpenId } from '../_shared/auth';
import { SafeApiError } from '../_shared/errors';
import { fingerprintPayload, type JsonValue } from '../_shared/idempotency';
import {
  assertVerificationClaimEffective,
  createProjectionInvalidation,
} from '../_shared/projections';
import { isPlainRecord, requireExpectedVersion } from '../_shared/validation';
import {
  assertContentDecisionResult,
  assertEventDecisionResult,
  sanitizeAuditEntry,
  sanitizeCaseMutationResponse,
  sanitizeCursorResult,
  sanitizePublicContent,
  sanitizePublicEvent,
  sanitizePublicOrganizer,
  sanitizePublicVerificationClaim,
  sanitizeReport,
  sanitizeReportResolveResponse,
  sanitizeReviewCase,
  sanitizeVerificationClaimRevocation,
} from './dto';
import type {
  AdminApiDependencies,
  AdminIdempotencyRecord,
  AdminMutationResult,
  AdminPrincipal,
  AdminReviewLogRecord,
  ApprovedDataAuditInput,
  ApprovedDataAuditResult,
  AuditListQuery,
  CursorResult,
  OriginalApplicationSnapshot,
  ReportListQuery,
  ReviewDomain,
  ReviewListQuery,
  ReviewScope,
} from './model';
import { AdminRole } from './model';
import { isStrictUtcInstant } from './time';
import {
  auditActorRole,
  availableQueues,
  domainsForPrincipal,
  requireActionRole,
  requireActiveAllowlistedAdmin,
  requireDomainAccess,
  requireRequestedScope,
  sessionRoles,
} from './policy';

export const AI_AUTOMATION_DISABLED = true as const;
const REDACTED_TARGET_ID = 'REDACTED_TARGET' as StableId;
const REDACTED_AUDIT_ENTRY_ID = 'audit_REDACTED' as AuditEntryProjection['auditEntryId'];
const REDACTED_REQUEST_ID = 'request_REDACTED' as RequestId;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

type CaseMutationAction =
  | 'review.approve'
  | 'review.reject'
  | 'review.requestChanges'
  | 'review.revoke'
  | 'organizer.review'
  | 'event.review'
  | 'content.review';

interface TransitionPlan {
  readonly domain: ReviewDomain;
  readonly nextStatus: ReviewCaseProjection['status'];
  readonly reviewScope: ReviewScope;
  readonly reasonCode: string;
  readonly reason: string;
  readonly invalidationKind: ProjectionInvalidationKind;
}

function notFound(resourceType: string, resourceId: StableId): never {
  throw new SafeApiError(ApiErrorCode.NOT_FOUND, 'The requested admin resource was not found.', {
    details: { code: ApiErrorCode.NOT_FOUND, resourceType, resourceId },
  });
}

function invalidTransition(from: string, to: string): never {
  throw new SafeApiError(ApiErrorCode.REVIEW_INVALID_TRANSITION, 'The review state does not allow this decision.', {
    details: { code: ApiErrorCode.REVIEW_INVALID_TRANSITION, from, to },
  });
}

function requireMutationField<T>(
  value: T | undefined,
  field: string,
): T {
  if (value === undefined) {
    throw new SafeApiError(ApiErrorCode.INTERNAL_ERROR, 'The review adapter returned an incomplete result.', {
      details: { code: ApiErrorCode.INTERNAL_ERROR, incidentId: `admin-result-${field}` },
    });
  }
  return value;
}

function assertMutationResultEnvelope(
  action: CaseMutationAction | 'report.resolve',
  mutation: Readonly<AdminMutationResult>,
): void {
  const expectedFields: Readonly<Record<CaseMutationAction | 'report.resolve', readonly string[]>> = {
    'review.approve': ['reviewCase', 'approvedClaim', 'sourceAggregateId', 'sourceVersion'],
    'review.reject': ['reviewCase', 'sourceAggregateId', 'sourceVersion'],
    'review.requestChanges': ['reviewCase', 'sourceAggregateId', 'sourceVersion'],
    'review.revoke': ['reviewCase', 'revokedClaim', 'sourceAggregateId', 'sourceVersion'],
    'organizer.review': ['reviewCase', 'organizer', 'sourceAggregateId', 'sourceVersion'],
    'event.review': ['reviewCase', 'event', 'sourceAggregateId', 'sourceVersion'],
    'content.review': ['reviewCase', 'content', 'sourceAggregateId', 'sourceVersion'],
    'report.resolve': ['report', 'sourceAggregateId', 'sourceVersion'],
  };
  const required = expectedFields[action];
  if (!isPlainRecord(mutation)
      || Object.keys(mutation).length !== required.length
      || required.some((field) => !Object.prototype.hasOwnProperty.call(mutation, field))
      || Object.keys(mutation).some((field) => !required.includes(field))) {
    throw new Error('Admin adapter returned an unexpected mutation result envelope');
  }
}

function plusTtl(instant: UtcInstant): UtcInstant {
  return new Date(Date.parse(instant) + IDEMPOTENCY_TTL_MS).toISOString() as UtcInstant;
}

function assertPrincipalMatchesTrustedOpenId(
  principal: Readonly<AdminPrincipal> | null,
  openId: string,
): void {
  if (principal !== null && principal.openId !== openId) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, 'Authentication is required.', {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true },
    });
  }
}

async function authenticate(
  dependencies: Readonly<AdminApiDependencies>,
  action: CloudAction,
): Promise<Readonly<AdminPrincipal>> {
  const openId = requireTrustedOpenId(dependencies.getWxContext);
  const loaded = await dependencies.loadAdminPrincipal(openId);
  assertPrincipalMatchesTrustedOpenId(loaded, openId);
  const principal = requireActiveAllowlistedAdmin(loaded, dependencies.now());
  requireActionRole(principal, action as keyof typeof import('./policy').ADMIN_RBAC_MATRIX);
  return principal;
}

export function redactReviewCaseForList(
  reviewCase: Readonly<ReviewCaseProjection>,
): Readonly<ReviewCaseProjection> {
  return Object.freeze({
    reviewCaseId: reviewCase.reviewCaseId,
    domain: reviewCase.domain,
    aggregateId: REDACTED_TARGET_ID,
    status: reviewCase.status,
    title: `${reviewCase.domain} 受限审核案件`,
    summary: '详情仅在服务端授权后返回；冻结协议未提供材料访问审计，原始材料保持不可见。',
    evidenceAssetIds: Object.freeze([]),
    version: reviewCase.version,
    createdAt: reviewCase.createdAt,
    updatedAt: reviewCase.updatedAt,
  });
}

export function redactReportForList(report: Readonly<ReportProjection>): Readonly<ReportProjection> {
  return Object.freeze({
    reportId: report.reportId,
    targetType: report.targetType,
    targetId: REDACTED_TARGET_ID,
    status: report.status,
    reasonCode: report.reasonCode,
    version: report.version,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  });
}

export function redactAuditEntry(
  entry: Readonly<AuditEntryProjection>,
): Readonly<AuditEntryProjection> {
  return Object.freeze({
    auditEntryId: REDACTED_AUDIT_ENTRY_ID,
    actorRole: entry.actorRole,
    action: entry.action,
    targetType: entry.targetType,
    targetId: REDACTED_TARGET_ID,
    requestId: REDACTED_REQUEST_ID,
    occurredAt: entry.occurredAt,
    result: entry.result,
    ...(entry.reasonCode === undefined ? {} : { reasonCode: entry.reasonCode }),
  });
}

function freezePage<T>(
  result: Readonly<CursorResult<T>>,
  items: readonly T[],
): Readonly<CursorResult<T>> {
  return Object.freeze({
    items: Object.freeze([...items]),
    hasMore: result.hasMore,
    ...(result.nextCursor === undefined ? {} : { nextCursor: result.nextCursor }),
  });
}

function readListQuery(
  payload: Readonly<Record<string, unknown>>,
  domains: readonly ReviewDomain[],
): ReviewListQuery {
  return {
    domains,
    limit: payload.limit as number,
    ...(payload.status === undefined ? {} : { status: payload.status as ReviewCaseProjection['status'] }),
    ...(payload.cursor === undefined ? {} : { cursor: payload.cursor as PaginationCursor }),
  };
}

function readReportListQuery(payload: Readonly<Record<string, unknown>>): ReportListQuery {
  return {
    limit: payload.limit as number,
    ...(payload.status === undefined ? {} : { status: payload.status as ReportProjection['status'] }),
    ...(payload.cursor === undefined ? {} : { cursor: payload.cursor as PaginationCursor }),
  };
}

function readAuditListQuery(payload: Readonly<Record<string, unknown>>): AuditListQuery {
  return {
    limit: payload.limit as number,
    ...(payload.action === undefined ? {} : { action: payload.action as string }),
    ...(payload.targetId === undefined ? {} : { targetId: payload.targetId as StableId }),
    ...(payload.occurredAfter === undefined ? {} : { occurredAfter: payload.occurredAfter as UtcInstant }),
    ...(payload.occurredBefore === undefined ? {} : { occurredBefore: payload.occurredBefore as UtcInstant }),
    ...(payload.cursor === undefined ? {} : { cursor: payload.cursor as PaginationCursor }),
  };
}

function reviewPlan(
  action: CaseMutationAction,
  payload: Readonly<Record<string, unknown>>,
): TransitionPlan {
  switch (action) {
    case 'review.approve':
      return {
        domain: 'SOCIAL',
        nextStatus: ReviewStatus.APPROVED,
        reviewScope: 'TAG_VERIFICATION',
        reasonCode: 'ADMIN_REVIEW_APPROVED',
        reason: payload.decisionNote as string,
        invalidationKind: ProjectionInvalidationKind.VERIFICATION_CHANGED,
      };
    case 'review.reject':
      return {
        domain: 'SOCIAL',
        nextStatus: ReviewStatus.REJECTED,
        reviewScope: 'TAG_VERIFICATION',
        reasonCode: payload.reasonCode as string,
        reason: payload.decisionNote as string,
        invalidationKind: ProjectionInvalidationKind.VERIFICATION_CHANGED,
      };
    case 'review.requestChanges':
      return {
        domain: 'SOCIAL',
        nextStatus: ReviewStatus.NEEDS_CHANGES,
        reviewScope: 'TAG_VERIFICATION',
        reasonCode: 'ADMIN_REVIEW_CHANGES_REQUESTED',
        reason: (payload.requiredChanges as readonly string[]).join('；'),
        invalidationKind: ProjectionInvalidationKind.VERIFICATION_CHANGED,
      };
    case 'review.revoke':
      return {
        domain: 'SOCIAL',
        nextStatus: ReviewStatus.REVOKED,
        reviewScope: 'TAG_VERIFICATION',
        reasonCode: payload.reasonCode as string,
        reason: payload.reasonCode as string,
        invalidationKind: ProjectionInvalidationKind.VERIFICATION_CHANGED,
      };
    case 'organizer.review': {
      const decision = payload.decision as string;
      if (decision !== 'APPROVE') {
        throw new SafeApiError(ApiErrorCode.NOT_IMPLEMENTED, 'The frozen response cannot represent a non-approved organizer.', {
          details: { code: ApiErrorCode.NOT_IMPLEMENTED, action, contractVersion: '1.0.0' },
        });
      }
      return {
        domain: 'ORGANIZER',
        nextStatus: ReviewStatus.APPROVED,
        reviewScope: 'ORGANIZER_APPLICATION',
        reasonCode: 'ORGANIZER_APPROVED',
        reason: payload.note as string,
        invalidationKind: ProjectionInvalidationKind.EVENT_CHANGED,
      };
    }
    case 'event.review': {
      const decision = payload.decision as string;
      const nextStatus = decision === 'APPROVE'
        ? ReviewStatus.APPROVED
        : decision === 'REJECT'
          ? ReviewStatus.REJECTED
          : decision === 'REQUEST_CHANGES'
            ? ReviewStatus.NEEDS_CHANGES
            : ReviewStatus.REVOKED;
      return {
        domain: 'EVENT',
        nextStatus,
        reviewScope: 'EVENT_PUBLICATION',
        reasonCode: `EVENT_${decision}`,
        reason: payload.note as string,
        invalidationKind: ProjectionInvalidationKind.EVENT_CHANGED,
      };
    }
    case 'content.review': {
      const decision = payload.decision as string;
      const nextStatus = decision === 'APPROVE'
        ? ReviewStatus.APPROVED
        : decision === 'REJECT'
          ? ReviewStatus.REJECTED
          : decision === 'REQUEST_CHANGES'
            ? ReviewStatus.NEEDS_CHANGES
            : ReviewStatus.REVOKED;
      return {
        domain: 'CONTENT',
        nextStatus,
        reviewScope: 'CONTENT_PUBLICATION',
        reasonCode: `CONTENT_${decision}`,
        reason: payload.note as string,
        invalidationKind: ProjectionInvalidationKind.CONTENT_CHANGED,
      };
    }
  }
}

function assertOriginalSnapshot(
  snapshot: Readonly<OriginalApplicationSnapshot> | null,
  reviewCase: Readonly<ReviewCaseProjection>,
  occurredAt: UtcInstant,
): asserts snapshot is Readonly<OriginalApplicationSnapshot> {
  if (snapshot === null
      || !isPlainRecord(snapshot)
      || Object.keys(snapshot).length !== 5
      || Object.keys(snapshot).some((field) => ![
        'reviewCaseId', 'aggregateId', 'sourceVersion', 'capturedAt', 'raw',
      ].includes(field))
      || snapshot.reviewCaseId !== reviewCase.reviewCaseId
      || snapshot.aggregateId !== reviewCase.aggregateId
      || !Number.isSafeInteger(snapshot.sourceVersion)
      || snapshot.sourceVersion < 1
      || typeof snapshot.capturedAt !== 'string'
      || !isValidUtcInstant(snapshot.capturedAt)
      || Date.parse(snapshot.capturedAt) > Date.parse(occurredAt)
      || snapshot.raw === null
      || snapshot.raw === undefined) {
    throw new SafeApiError(ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, 'The immutable original application snapshot is required.', {
      details: { code: ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, missingEvidenceKinds: ['ORIGINAL_APPLICATION_SNAPSHOT'] },
    });
  }
}

function createAuditEntryId(
  dependencies: Readonly<AdminApiDependencies>,
): StableId<'audit-entry'> {
  const value = dependencies.createId('audit-entry');
  if (typeof value !== 'string' || !DATA_AUDIT_ID_PATTERN.test(value)) {
    throw new Error('Admin audit ID generator returned an invalid identifier');
  }
  return value as StableId<'audit-entry'>;
}

function assertApprovalEvidence(
  action: CaseMutationAction,
  plan: Readonly<TransitionPlan>,
  reviewCase: Readonly<ReviewCaseProjection>,
): void {
  if (action === 'review.approve' && reviewCase.submitterUserId === undefined) {
    throw new SafeApiError(ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, 'A subject binding is required for verification approval.', {
      details: {
        code: ApiErrorCode.REVIEW_EVIDENCE_REQUIRED,
        missingEvidenceKinds: ['SUBMITTER_BINDING'],
      },
    });
  }
  if (plan.nextStatus === ReviewStatus.APPROVED
      && (action === 'review.approve' || action === 'content.review')
      && reviewCase.evidenceAssetIds.length === 0) {
    throw new SafeApiError(ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, 'Human approval requires submitted evidence.', {
      details: {
        code: ApiErrorCode.REVIEW_EVIDENCE_REQUIRED,
        missingEvidenceKinds: [action === 'content.review' ? 'MEDIA_RIGHTS_EVIDENCE' : 'APPLICATION_EVIDENCE'],
      },
    });
  }
}

function requireCaseAssignment(
  principal: Readonly<AdminPrincipal>,
  reviewCase: Readonly<ReviewCaseProjection>,
): void {
  if (reviewCase.assignedReviewerUserId !== undefined
      && reviewCase.assignedReviewerUserId !== principal.userId
      && !principal.roles.includes(AdminRole.SUPER_ADMIN)) {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'The case is assigned to another reviewer.', {
      details: { code: ApiErrorCode.FORBIDDEN, policy: 'CASE_ASSIGNED_TO_ANOTHER_REVIEWER' },
    });
  }
}

function requireActionAggregateMatch(
  action: CaseMutationAction,
  payload: Readonly<Record<string, unknown>>,
  reviewCase: Readonly<ReviewCaseProjection>,
): void {
  const actionAggregateId = action === 'organizer.review'
    ? payload.organizerId
    : action === 'event.review'
      ? payload.eventId
      : action === 'content.review'
        ? payload.contentId
        : reviewCase.aggregateId;
  if (actionAggregateId !== reviewCase.aggregateId) {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'The action target does not match the review case.', {
      details: { code: ApiErrorCode.FORBIDDEN, policy: 'ACTION_AGGREGATE_MISMATCH' },
    });
  }
}

function assertCaseMutationResult(
  before: Readonly<ReviewCaseProjection>,
  after: Readonly<ReviewCaseProjection>,
  plan: Readonly<TransitionPlan>,
  occurredAt: UtcInstant,
): Readonly<ReviewCaseProjection> {
  const parsed = sanitizeReviewCase(after);
  if (parsed.reviewCaseId !== before.reviewCaseId
      || parsed.aggregateId !== before.aggregateId
      || parsed.domain !== before.domain
      || parsed.title !== before.title
      || parsed.summary !== before.summary
      || parsed.submitterUserId !== before.submitterUserId
      || parsed.assignedReviewerUserId !== before.assignedReviewerUserId
      || parsed.evidenceAssetIds.length !== before.evidenceAssetIds.length
      || parsed.evidenceAssetIds.some((assetId, index) => assetId !== before.evidenceAssetIds[index])
      || parsed.status !== plan.nextStatus
      || parsed.version !== before.version + 1
      || parsed.createdAt !== before.createdAt
      || Date.parse(occurredAt) < Date.parse(before.updatedAt)
      || parsed.updatedAt !== occurredAt) {
    throw new Error('Admin adapter returned a non-sequential or mismatched ReviewCaseProjection');
  }
  return parsed;
}

function assertAuthoritativeMutationBinding(
  action: CaseMutationAction,
  before: Readonly<ReviewCaseProjection>,
  snapshot: Readonly<OriginalApplicationSnapshot>,
  mutation: Readonly<AdminMutationResult>,
  payload: Readonly<Record<string, unknown>>,
  occurredAt: UtcInstant,
): void {
  if ((action === 'review.reject' || action === 'review.requestChanges')
      && (mutation.sourceAggregateId !== snapshot.aggregateId
        || mutation.sourceVersion !== snapshot.sourceVersion + 1)) {
    throw new Error('Verification-request invalidation must reference the sequential reviewed source version');
  }
  if (action === 'review.revoke') {
    const proof = sanitizeVerificationClaimRevocation(
      requireMutationField(mutation.revokedClaim, 'revokedClaim'),
    );
    if (proof.reviewCaseId !== before.reviewCaseId
        || mutation.sourceAggregateId !== proof.source.aggregateId
        || mutation.sourceVersion !== proof.source.patch.version) {
      throw new Error('Verification revocation invalidation must reference its sequential claim patch');
    }
  } else if (mutation.revokedClaim !== undefined) {
    throw new Error('Only review.revoke may return a verification claim revocation proof');
  }
  if (action === 'organizer.review') {
    const organizer = sanitizePublicOrganizer(requireMutationField(mutation.organizer, 'organizer'));
    if (organizer.organizerId !== before.aggregateId
        || mutation.sourceAggregateId !== organizer.organizerId
        || mutation.sourceVersion !== organizer.version
        || organizer.updatedAt !== occurredAt) {
      throw new Error('Organizer review returned a mismatched public projection');
    }
  }
  if (action === 'event.review') {
    const event = sanitizePublicEvent(requireMutationField(mutation.event, 'event'));
    if (event.eventId !== before.aggregateId
        || mutation.sourceAggregateId !== event.eventId
        || mutation.sourceVersion !== event.version
        || event.updatedAt !== occurredAt) {
      throw new Error('Event review returned a mismatched public projection');
    }
    assertEventDecisionResult(
      payload.decision as 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'PAUSE' | 'CANCEL',
      event,
    );
  }
  if (action === 'content.review') {
    const content = sanitizePublicContent(requireMutationField(mutation.content, 'content'));
    if (content.contentId !== before.aggregateId
        || mutation.sourceAggregateId !== content.contentId
        || mutation.sourceVersion !== content.version
        || content.updatedAt !== occurredAt) {
      throw new Error('Content review returned a mismatched public projection');
    }
    assertContentDecisionResult(
      payload.decision as 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'UNPUBLISH',
      content,
    );
  }
}

function createReviewLog(
  dependencies: Readonly<AdminApiDependencies>,
  principal: Readonly<AdminPrincipal>,
  action: CaseMutationAction,
  requestId: RequestId,
  occurredAt: UtcInstant,
  before: Readonly<ReviewCaseProjection>,
  after: Readonly<ReviewCaseProjection>,
  snapshot: Readonly<OriginalApplicationSnapshot>,
  plan: Readonly<TransitionPlan>,
): Readonly<AdminReviewLogRecord> {
  return Object.freeze({
    auditEntryId: createAuditEntryId(dependencies),
    actorUserId: principal.userId,
    actorRole: auditActorRole(principal),
    action,
    targetType: 'REVIEW_CASE',
    targetId: before.aggregateId,
    requestId,
    occurredAt,
    result: 'SUCCEEDED',
    reasonCode: plan.reasonCode,
    reviewCaseId: before.reviewCaseId,
    reviewedBy: principal.userId,
    reviewedAt: occurredAt,
    reviewScope: plan.reviewScope,
    reason: plan.reason,
    beforeStatus: before.status,
    afterStatus: after.status,
    expectedVersion: before.version,
    sourceSnapshotVersion: snapshot.sourceVersion,
    version: after.version,
  });
}

function idempotencyNamespace(
  action: CloudAction,
  principal: Readonly<AdminPrincipal>,
  key: IdempotencyKey,
): string {
  return `adminApi:${action}:${principal.openId}:${key}`;
}

const IDEMPOTENCY_RECORD_FIELDS = Object.freeze([
  'namespace', 'requestFingerprint', 'requestId', 'status', 'result', 'expiresAt', 'createdAt',
]);
const SHA256_FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;

function sanitizeIdempotencyRecord(
  existing: Readonly<AdminIdempotencyRecord> | null,
  expectedNamespace: string,
): Readonly<AdminIdempotencyRecord> | null {
  if (existing === null) return null;
  const record = existing as unknown as Readonly<Record<string, unknown>>;
  if (!isPlainRecord(existing)
      || Object.keys(existing).length !== IDEMPOTENCY_RECORD_FIELDS.length
      || Object.keys(existing).some((field) => !IDEMPOTENCY_RECORD_FIELDS.includes(field))
      || record.namespace !== expectedNamespace
      || typeof record.requestFingerprint !== 'string'
      || !SHA256_FINGERPRINT_PATTERN.test(record.requestFingerprint)
      || typeof record.requestId !== 'string'
      || !DATA_AUDIT_REQUEST_ID_PATTERN.test(record.requestId)
      || record.status !== 'COMPLETED'
      || typeof record.createdAt !== 'string'
      || typeof record.expiresAt !== 'string'
      || !isValidUtcInstant(record.createdAt)
      || !isValidUtcInstant(record.expiresAt)
      || Date.parse(record.expiresAt) <= Date.parse(record.createdAt)) {
    throw new Error('Admin repository returned a malformed idempotency record');
  }
  return Object.freeze({
    namespace: record.namespace,
    requestFingerprint: record.requestFingerprint,
    requestId: record.requestId as RequestId,
    status: 'COMPLETED',
    result: record.result,
    expiresAt: record.expiresAt as UtcInstant,
    createdAt: record.createdAt as UtcInstant,
  });
}

function idempotencyReplayOrConflict(
  existing: Readonly<AdminIdempotencyRecord> | null,
  expectedNamespace: string,
  fingerprint: string,
): unknown | undefined {
  const safeExisting = sanitizeIdempotencyRecord(existing, expectedNamespace);
  if (safeExisting === null) return undefined;
  if (safeExisting.requestFingerprint !== fingerprint) {
    throw new SafeApiError(ApiErrorCode.IDEMPOTENCY_CONFLICT, 'The idempotency key was already used.', {
      details: { code: ApiErrorCode.IDEMPOTENCY_CONFLICT, firstRequestId: safeExisting.requestId },
    });
  }
  return safeExisting.result;
}

function responseForCaseMutation(
  action: CaseMutationAction,
  result: Readonly<AdminMutationResult>,
  reviewCase: Readonly<ReviewCaseProjection>,
  payload: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  switch (action) {
    case 'review.approve':
    case 'review.reject':
    case 'review.revoke':
      return Object.freeze({ reviewCase, projectionInvalidated: true });
    case 'review.requestChanges':
      return Object.freeze({ reviewCase });
    case 'organizer.review': {
      const organizer = sanitizePublicOrganizer(requireMutationField(result.organizer, 'organizer'));
      if (organizer.reviewStatus !== ReviewStatus.APPROVED
          || organizer.verificationState !== VerificationState.HUMAN_REVIEWED) {
        throw new Error('Organizer approval adapter returned a non-public organizer projection');
      }
      return Object.freeze({ reviewCase, organizer });
    }
    case 'event.review': {
      const event = sanitizePublicEvent(requireMutationField(result.event, 'event'));
      assertEventDecisionResult(
        payload.decision as 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'PAUSE' | 'CANCEL',
        event,
      );
      return Object.freeze({ reviewCase, event });
    }
    case 'content.review': {
      const content = sanitizePublicContent(requireMutationField(result.content, 'content'));
      assertContentDecisionResult(
        payload.decision as 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'UNPUBLISH',
        content,
      );
      return Object.freeze({
        reviewCase,
        content,
      });
    }
  }
}

function sameReviewCase(
  left: Readonly<ReviewCaseProjection>,
  right: Readonly<ReviewCaseProjection>,
): boolean {
  return left.reviewCaseId === right.reviewCaseId
    && left.domain === right.domain
    && left.aggregateId === right.aggregateId
    && left.status === right.status
    && left.title === right.title
    && left.summary === right.summary
    && left.submitterUserId === right.submitterUserId
    && left.assignedReviewerUserId === right.assignedReviewerUserId
    && left.version === right.version
    && left.createdAt === right.createdAt
    && left.updatedAt === right.updatedAt
    && left.evidenceAssetIds.length === right.evidenceAssetIds.length
    && left.evidenceAssetIds.every((assetId, index) => assetId === right.evidenceAssetIds[index]);
}

function sanitizeCaseMutationReplay(
  action: CaseMutationAction,
  value: unknown,
  current: Readonly<ReviewCaseProjection>,
  plan: Readonly<TransitionPlan>,
  payload: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const data = sanitizeCaseMutationResponse(action, value);
  const replayCase = sanitizeReviewCase(data.reviewCase);
  if (replayCase.status !== plan.nextStatus || !sameReviewCase(replayCase, current)) {
    throw new Error('Stored admin idempotency result does not match the current review case');
  }
  if (action === 'organizer.review') {
    const organizer = sanitizePublicOrganizer(data.organizer);
    if (organizer.organizerId !== current.aggregateId
        || organizer.updatedAt !== current.updatedAt) {
      throw new Error('Stored organizer idempotency result is stale or mismatched');
    }
  } else if (action === 'event.review') {
    const event = sanitizePublicEvent(data.event);
    if (event.eventId !== current.aggregateId
        || event.updatedAt !== current.updatedAt) {
      throw new Error('Stored event idempotency result is stale or mismatched');
    }
    assertEventDecisionResult(
      payload.decision as 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'PAUSE' | 'CANCEL',
      event,
    );
  } else if (action === 'content.review') {
    const content = sanitizePublicContent(data.content);
    if (content.contentId !== current.aggregateId
        || content.updatedAt !== current.updatedAt) {
      throw new Error('Stored content idempotency result is stale or mismatched');
    }
    assertContentDecisionResult(
      payload.decision as 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'UNPUBLISH',
      content,
    );
    if (payload.decision === 'APPROVE' && content.mediaRightsState !== MediaRightsState.APPROVED) {
      throw new Error('Stored approved content result no longer satisfies media-rights policy');
    }
  }
  return data;
}

function sameReport(left: Readonly<ReportProjection>, right: Readonly<ReportProjection>): boolean {
  return left.reportId === right.reportId
    && left.targetType === right.targetType
    && left.targetId === right.targetId
    && left.status === right.status
    && left.reasonCode === right.reasonCode
    && left.version === right.version
    && left.createdAt === right.createdAt
    && left.updatedAt === right.updatedAt;
}

async function executeCaseMutation(
  dependencies: Readonly<AdminApiDependencies>,
  principal: Readonly<AdminPrincipal>,
  action: CaseMutationAction,
  requestId: RequestId,
  payload: Readonly<Record<string, unknown>>,
): Promise<Readonly<Record<string, unknown>>> {
  const occurredAt = dependencies.now();
  const plan = reviewPlan(action, payload);
  const reviewCaseId = payload.reviewCaseId as ReviewCaseId;
  const expectedVersion = payload.expectedVersion as number;
  const key = payload.idempotencyKey as IdempotencyKey;
  const namespace = idempotencyNamespace(action, principal, key);
  const fingerprint = fingerprintPayload(payload as JsonValue);

  return dependencies.repository.runTransaction(async (transaction) => {
    const existing = await transaction.getIdempotency(namespace);
    const beforeCandidate = await transaction.getReviewCase(reviewCaseId);
    if (beforeCandidate === null) notFound('ReviewCase', reviewCaseId);
    const before = sanitizeReviewCase(beforeCandidate);
    requireDomainAccess(principal, before.domain);
    requireCaseAssignment(principal, before);
    requireActionAggregateMatch(action, payload, before);
    if (before.domain !== plan.domain) {
      throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'The action does not own this review domain.', {
        details: { code: ApiErrorCode.FORBIDDEN, policy: 'ACTION_DOMAIN_MISMATCH' },
      });
    }
    // Exact retries may replay only after current domain and assignment checks.
    // This prevents an old idempotency record from bypassing revoked case access.
    const replay = idempotencyReplayOrConflict(existing, namespace, fingerprint);
    if (replay !== undefined) return sanitizeCaseMutationReplay(action, replay, before, plan, payload);
    requireExpectedVersion(expectedVersion, before.version);
    if (!isLegalReviewTransition(before.status, plan.nextStatus)) {
      invalidTransition(before.status, plan.nextStatus);
    }

    const snapshot = await transaction.getOriginalApplicationSnapshot(reviewCaseId);
    assertOriginalSnapshot(snapshot, before, occurredAt);
    assertApprovalEvidence(action, plan, before);

    const mutation = await transaction.applyMutation(Object.freeze({
      action,
      writableCollections: CLOUD_ACTION_REGISTRY[action].writableCollections,
      payload,
      principal,
      requestId,
      occurredAt,
      beforeReviewCase: before,
      nextReviewStatus: plan.nextStatus,
      originalSnapshot: snapshot,
    }));
    assertMutationResultEnvelope(action, mutation);
    const after = assertCaseMutationResult(
      before,
      requireMutationField(mutation.reviewCase, 'reviewCase'),
      plan,
      occurredAt,
    );
    if (!Number.isSafeInteger(mutation.sourceVersion) || mutation.sourceVersion < 1) {
      throw new Error('Admin adapter returned an invalid authoritative source version');
    }
    if (action === 'review.approve') {
      const approvedClaim = sanitizePublicVerificationClaim(
        requireMutationField(mutation.approvedClaim, 'approvedClaim'),
      );
      try {
        assertVerificationClaimEffective(approvedClaim, occurredAt);
      } catch {
        throw new Error('Verification approval returned a claim that is not currently effective');
      }
      if (mutation.sourceAggregateId !== approvedClaim.claimId
          || mutation.sourceVersion !== approvedClaim.version
          || (before.submitterUserId !== undefined
            && approvedClaim.subjectUserId !== before.submitterUserId)
          || approvedClaim.reviewStatus !== ReviewStatus.APPROVED
          || approvedClaim.verificationState !== VerificationState.HUMAN_REVIEWED
          || approvedClaim.publicVisible !== true
          || approvedClaim.updatedAt !== occurredAt) {
        throw new Error('Verification approval invalidation must reference the approved claim version');
      }
    } else if (mutation.approvedClaim !== undefined) {
      throw new Error('Only review.approve may create an approved public verification claim');
    }
    assertAuthoritativeMutationBinding(action, before, snapshot, mutation, payload, occurredAt);
    if (action === 'content.review'
        && payload.decision === 'APPROVE'
        && sanitizePublicContent(
          requireMutationField(mutation.content, 'content'),
        ).mediaRightsState !== MediaRightsState.APPROVED) {
      throw new SafeApiError(ApiErrorCode.MEDIA_RIGHTS_REQUIRED, 'Approved media rights are required before publication.', {
        details: {
          code: ApiErrorCode.MEDIA_RIGHTS_REQUIRED,
          mediaAssetIds: [...before.evidenceAssetIds],
        },
      });
    }

    const invalidation = createProjectionInvalidation({
      eventId: dependencies.createId('projection-invalidation'),
      kind: plan.invalidationKind,
      sourceAggregateId: mutation.sourceAggregateId,
      sourceVersion: mutation.sourceVersion,
      occurredAt,
      reason: plan.reasonCode,
      requestId,
    });
    const reviewLog = createReviewLog(
      dependencies,
      principal,
      action,
      requestId,
      occurredAt,
      before,
      after,
      snapshot,
      plan,
    );
    if (after.status === ReviewStatus.APPROVED && !isCompleteApprovalLog(after, reviewLog)) {
      throw new Error('Generated approval ReviewLog failed the projection audit gate');
    }
    const data = responseForCaseMutation(action, mutation, after, payload);
    await transaction.appendReviewLog(reviewLog);
    await transaction.appendProjectionInvalidation(invalidation);
    await transaction.completeIdempotency(Object.freeze({
      namespace,
      requestFingerprint: fingerprint,
      requestId,
      status: 'COMPLETED',
      result: data,
      expiresAt: plusTtl(occurredAt),
      createdAt: occurredAt,
    }));
    return data;
  });
}

async function executeReportResolve(
  dependencies: Readonly<AdminApiDependencies>,
  principal: Readonly<AdminPrincipal>,
  requestId: RequestId,
  payload: Readonly<Record<string, unknown>>,
): Promise<Readonly<Record<string, unknown>>> {
  const occurredAt = dependencies.now();
  const reportId = payload.reportId as ReportId;
  const expectedVersion = payload.expectedVersion as number;
  const key = payload.idempotencyKey as IdempotencyKey;
  const namespace = idempotencyNamespace('report.resolve', principal, key);
  const fingerprint = fingerprintPayload(payload as JsonValue);

  return dependencies.repository.runTransaction(async (transaction) => {
    const existing = await transaction.getIdempotency(namespace);
    const beforeCandidate = await transaction.getReport(reportId);
    if (beforeCandidate === null) notFound('Report', reportId);
    const before = sanitizeReport(beforeCandidate);
    const replay = idempotencyReplayOrConflict(existing, namespace, fingerprint);
    if (replay !== undefined) {
      const data = sanitizeReportResolveResponse(replay);
      const replayReport = sanitizeReport(data.report);
      if (!sameReport(replayReport, before)) {
        throw new Error('Stored report idempotency result does not match the current report');
      }
      return data;
    }
    requireExpectedVersion(expectedVersion, before.version);
    if (before.status !== 'OPEN') invalidTransition(before.status, payload.resolution as string);

    const mutation = await transaction.applyMutation(Object.freeze({
      action: 'report.resolve',
      writableCollections: CLOUD_ACTION_REGISTRY['report.resolve'].writableCollections,
      payload,
      principal,
      requestId,
      occurredAt,
    }));
    assertMutationResultEnvelope('report.resolve', mutation);
    const report = sanitizeReport(requireMutationField(mutation.report, 'report'));
    const expectedStatus = payload.resolution === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED';
    if (report.reportId !== before.reportId
        || report.version !== before.version + 1
        || report.status !== expectedStatus
        || report.targetType !== before.targetType
        || report.targetId !== before.targetId
        || report.reasonCode !== before.reasonCode
        || report.createdAt !== before.createdAt
        || Date.parse(occurredAt) < Date.parse(before.updatedAt)
        || report.updatedAt !== occurredAt) {
      throw new Error('Admin adapter returned a mismatched ReportProjection');
    }
    if (mutation.sourceAggregateId !== report.reportId || mutation.sourceVersion !== report.version) {
      throw new Error('Report mutation source must match the resulting ReportProjection');
    }
    const audit: AuditEntryProjection = Object.freeze({
      auditEntryId: createAuditEntryId(dependencies),
      actorUserId: principal.userId,
      actorRole: auditActorRole(principal),
      action: 'report.resolve',
      targetType: 'REPORT',
      targetId: reportId,
      requestId,
      occurredAt,
      result: 'SUCCEEDED',
      reasonCode: payload.resolution as string,
    });
    const data = Object.freeze({ report });
    await transaction.appendAudit(audit);
    await transaction.completeIdempotency(Object.freeze({
      namespace,
      requestFingerprint: fingerprint,
      requestId,
      status: 'COMPLETED',
      result: data,
      expiresAt: plusTtl(occurredAt),
      createdAt: occurredAt,
    }));
    return data;
  });
}

async function getReviewDetail(
  dependencies: Readonly<AdminApiDependencies>,
  principal: Readonly<AdminPrincipal>,
  reviewCaseId: ReviewCaseId,
): Promise<Readonly<Record<string, unknown>>> {
  return dependencies.repository.runTransaction(async (transaction) => {
    const candidate = await transaction.getReviewCase(reviewCaseId);
    if (candidate === null) notFound('ReviewCase', reviewCaseId);
    const reviewCase = sanitizeReviewCase(candidate);
    requireDomainAccess(principal, reviewCase.domain);
    requireCaseAssignment(principal, reviewCase);
    // review.get is frozen as a read-only action (writableCollections=[]).
    // It returns contract projection fields only; no raw snapshot or material
    // URL can be disclosed until a future frozen access-grant DTO exists.
    return Object.freeze({ reviewCase });
  });
}

export async function executeAdminAction(
  dependencies: Readonly<AdminApiDependencies>,
  action: CloudAction,
  requestId: RequestId,
  payload: Readonly<Record<string, unknown>>,
): Promise<Readonly<Record<string, unknown>>> {
  const principal = await authenticate(dependencies, action);

  switch (action) {
    case 'admin.bootstrap': {
      requireRequestedScope(principal, payload.requestedScope as 'REVIEW' | 'OPERATIONS' | 'AUDIT');
      return Object.freeze({
        session: Object.freeze({
          userId: principal.userId,
          roles: sessionRoles(principal),
          runtimeMode: dependencies.runtimeMode,
          contractVersion: '1.0.0',
          profileComplete: true,
          expiresAt: principal.expiresAt,
        }),
        availableQueues: availableQueues(principal),
      });
    }
    case 'review.list': {
      const requestedDomain = payload.domain as ReviewDomain | undefined;
      if (requestedDomain !== undefined) requireDomainAccess(principal, requestedDomain);
      const domains = requestedDomain === undefined ? domainsForPrincipal(principal) : [requestedDomain];
      const limit = payload.limit as number;
      const result = sanitizeCursorResult(
        await dependencies.repository.listReviewCases(readListQuery(payload, domains)),
        limit,
        sanitizeReviewCase,
      );
      const requestedStatus = payload.status as ReviewCaseProjection['status'] | undefined;
      const filtered = result.items.filter((item) => (
        domains.includes(item.domain)
        && (requestedStatus === undefined || item.status === requestedStatus)
      ));
      const redacted = filtered.map(redactReviewCaseForList);
      return Object.freeze({ page: freezePage(result, redacted) });
    }
    case 'review.get':
      return getReviewDetail(dependencies, principal, payload.reviewCaseId as ReviewCaseId);
    case 'review.approve':
    case 'review.reject':
    case 'review.requestChanges':
    case 'review.revoke':
    case 'organizer.review':
    case 'event.review':
    case 'content.review':
      return executeCaseMutation(dependencies, principal, action, requestId, payload);
    case 'report.list': {
      const result = sanitizeCursorResult(
        await dependencies.repository.listReports(readReportListQuery(payload)),
        payload.limit as number,
        sanitizeReport,
      );
      const requestedStatus = payload.status as ReportProjection['status'] | undefined;
      const filtered = result.items.filter((item) => (
        requestedStatus === undefined || item.status === requestedStatus
      ));
      return Object.freeze({ page: freezePage(result, filtered.map(redactReportForList)) });
    }
    case 'report.resolve':
      return executeReportResolve(dependencies, principal, requestId, payload);
    case 'audit.list': {
      const result = sanitizeCursorResult(
        await dependencies.repository.listAuditEntries(readAuditListQuery(payload)),
        payload.limit as number,
        sanitizeAuditEntry,
      );
      return Object.freeze({ page: freezePage(result, result.items.map(redactAuditEntry)) });
    }
    default:
      throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, 'The action is not owned by adminApi.', {
        details: { code: ApiErrorCode.INVALID_REQUEST, field: 'action', reason: 'ACTION_NOT_REGISTERED' },
      });
  }
}

const DATA_AUDIT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
const DATA_AUDIT_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const DATA_AUDIT_FORBIDDEN_REASON_PATTERN = /(?:[a-z][a-z0-9+.-]*:\/\/|(?:blob|data):|\/\/[A-Za-z0-9]|[\u0000-\u001F\u007F])/i;
const DATA_AUDIT_REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_:-]{1,63}$/;
const REDACTED_REVIEW_CASE_ID = 'review_case_REDACTED' as ReviewCaseId;
const REVIEW_LOG_FIELDS: readonly string[] = Object.freeze([
  'auditEntryId', 'actorUserId', 'actorRole', 'action', 'targetType', 'targetId',
  'requestId', 'occurredAt', 'result', 'reasonCode', 'reviewCaseId', 'reviewedBy',
  'reviewedAt', 'reviewScope', 'reason', 'beforeStatus', 'afterStatus',
  'expectedVersion', 'sourceSnapshotVersion', 'version',
]);
const REVIEW_LOG_STRING_FIELDS: readonly string[] = Object.freeze([
  'auditEntryId', 'actorUserId', 'actorRole', 'action', 'targetType', 'targetId',
  'requestId', 'occurredAt', 'result', 'reasonCode', 'reviewCaseId', 'reviewedBy',
  'reviewedAt', 'reviewScope', 'reason', 'beforeStatus', 'afterStatus',
]);

function expectedApprovalLogIdentity(reviewCase: Readonly<ReviewCaseProjection>): Readonly<{
  readonly action: CaseMutationAction;
  readonly scope: ReviewScope;
  readonly reasonCode: string;
  readonly actorRoles: readonly ('REVIEWER' | 'ADMIN')[];
}> | null {
  switch (reviewCase.domain) {
    case 'SOCIAL':
      return {
        action: 'review.approve', scope: 'TAG_VERIFICATION', reasonCode: 'ADMIN_REVIEW_APPROVED',
        actorRoles: ['REVIEWER', 'ADMIN'],
      };
    case 'ORGANIZER':
      return {
        action: 'organizer.review', scope: 'ORGANIZER_APPLICATION', reasonCode: 'ORGANIZER_APPROVED',
        actorRoles: ['ADMIN'],
      };
    case 'EVENT':
      return {
        action: 'event.review', scope: 'EVENT_PUBLICATION', reasonCode: 'EVENT_APPROVE',
        actorRoles: ['ADMIN'],
      };
    case 'CONTENT':
      return {
        action: 'content.review', scope: 'CONTENT_PUBLICATION', reasonCode: 'CONTENT_APPROVE',
        actorRoles: ['ADMIN'],
      };
    case 'REPORT':
      return null;
  }
}

function isValidUtcInstant(value: string): boolean {
  return isStrictUtcInstant(value);
}

function isCompleteApprovalLog(
  reviewCase: Readonly<ReviewCaseProjection>,
  log: Readonly<AdminReviewLogRecord>,
): boolean {
  const logRecord = log as unknown as Readonly<Record<string, unknown>>;
  if (!isPlainRecord(log)
      || Object.keys(log).length !== REVIEW_LOG_FIELDS.length
      || Object.keys(log).some((field) => !REVIEW_LOG_FIELDS.includes(field))
      || REVIEW_LOG_STRING_FIELDS.some((field) => typeof logRecord[field] !== 'string')
      || typeof log.expectedVersion !== 'number'
      || typeof log.sourceSnapshotVersion !== 'number'
      || typeof log.version !== 'number') {
    return false;
  }
  let safeReviewCase: Readonly<ReviewCaseProjection>;
  try {
    safeReviewCase = sanitizeReviewCase(reviewCase);
  } catch {
    return false;
  }
  const identity = expectedApprovalLogIdentity(safeReviewCase);
  if (identity === null) return false;
  return log.reviewCaseId === safeReviewCase.reviewCaseId
    && log.targetType === 'REVIEW_CASE'
    && log.targetId === safeReviewCase.aggregateId
    && log.action === identity.action
    && log.reviewScope === identity.scope
    && log.result === 'SUCCEEDED'
    && identity.actorRoles.includes(log.actorRole)
    && log.actorUserId === log.reviewedBy
    && (log.actorRole !== 'REVIEWER'
      || safeReviewCase.assignedReviewerUserId === undefined
      || log.reviewedBy === safeReviewCase.assignedReviewerUserId)
    && DATA_AUDIT_ID_PATTERN.test(log.reviewedBy)
    && DATA_AUDIT_ID_PATTERN.test(log.auditEntryId)
    && DATA_AUDIT_REQUEST_ID_PATTERN.test(log.requestId)
    && isValidUtcInstant(log.reviewedAt)
    && isValidUtcInstant(log.occurredAt)
    && log.reviewedAt === log.occurredAt
    && log.reviewedAt === safeReviewCase.updatedAt
    && log.beforeStatus === ReviewStatus.UNDER_REVIEW
    && log.afterStatus === ReviewStatus.APPROVED
    && isLegalReviewTransition(log.beforeStatus, log.afterStatus)
    && Number.isSafeInteger(log.expectedVersion)
    && log.expectedVersion > 0
    && log.expectedVersion + 1 === log.version
    && log.version === safeReviewCase.version
    && Number.isSafeInteger(log.sourceSnapshotVersion)
    && log.sourceSnapshotVersion > 0
    && typeof log.reasonCode === 'string'
    && DATA_AUDIT_REASON_CODE_PATTERN.test(log.reasonCode)
    && log.reasonCode === identity.reasonCode
    && typeof log.reason === 'string'
    && log.reason === log.reason.trim()
    && log.reason.length >= 2
    && log.reason.length <= 500
    && !DATA_AUDIT_FORBIDDEN_REASON_PATTERN.test(log.reason);
}

export function auditApprovedData(
  input: Readonly<ApprovedDataAuditInput>,
): Readonly<ApprovedDataAuditResult> {
  const missing = input.reviewCases
    .filter((reviewCase) => reviewCase.status === ReviewStatus.APPROVED)
    .filter((reviewCase) => !input.reviewLogs.some((log) => isCompleteApprovalLog(reviewCase, log)))
    .map((reviewCase) => typeof reviewCase.reviewCaseId === 'string'
      && DATA_AUDIT_ID_PATTERN.test(reviewCase.reviewCaseId)
      ? reviewCase.reviewCaseId
      : REDACTED_REVIEW_CASE_ID);
  return Object.freeze({ ok: missing.length === 0, missingReviewLogCaseIds: Object.freeze(missing) });
}

export function assertApprovedDataMayProject(
  reviewCase: Readonly<ReviewCaseProjection>,
  reviewLogs: readonly Readonly<AdminReviewLogRecord>[],
): void {
  const result = auditApprovedData({ reviewCases: [reviewCase], reviewLogs });
  if (!result.ok) {
    throw new Error('APPROVED data without a complete ReviewLog cannot be projected');
  }
}

export function invalidationUpdatesEveryViewer(
  invalidation: Readonly<ProjectionInvalidation>,
): Readonly<{
  publicTagDirty: boolean;
  oldShareDirty: boolean;
  friendViewDirty: boolean;
}> {
  const verificationChanged = invalidation.kind === ProjectionInvalidationKind.VERIFICATION_CHANGED;
  return Object.freeze({
    publicTagDirty: verificationChanged,
    oldShareDirty: verificationChanged,
    friendViewDirty: verificationChanged,
  });
}
