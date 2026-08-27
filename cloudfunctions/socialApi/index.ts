import type { CloudAction, CloudActionData } from '../../miniprogram/shared/contracts';
import type { ApiResult } from '../../miniprogram/shared/types/api';
import { ApiErrorCode } from '../../miniprogram/shared/types/api';
import {
  FriendshipState,
  ProjectionInvalidationKind,
  ReviewStatus,
  VerificationState,
} from '../../miniprogram/shared/types/enums';
import type {
  LabelDefinitionProjection,
  ProjectionInvalidation,
  PublicCardProjection,
  PublicVerificationClaimProjection,
  ReportProjection,
  VerificationRequestProjection,
  ViewerRelationshipProjection,
} from '../../miniprogram/shared/types/projections';
import type {
  MediaAssetId,
  OptimisticVersion,
  PaginationCursor,
  RequestId,
  StableId,
  UserId,
  UtcInstant,
  VerificationRequestId,
} from '../../miniprogram/shared/types/primitives';
import {
  requireTrustedPrincipal,
  type PrincipalLoader,
  type TrustedPrincipal,
  type WxContextProvider,
} from '../_shared/auth';
import { createAuditAppend } from '../_shared/audit';
import { SafeApiError, safeFailureFromError } from '../_shared/errors';
import { createNotImplementedEndpoint } from '../_shared/errors/envelope';
import {
  assertIdempotencyCompatible,
  createIdempotencyClaim,
  requireIdempotencyKey,
  type ExistingIdempotencyRecord,
  type JsonValue,
} from '../_shared/idempotency';
import { createProjectionInvalidation, parseReadOnlyProjection } from '../_shared/projections';
import {
  isPlainRecord,
  isValidRequestId,
  requireExpectedVersion,
  validateCallEnvelope,
} from '../_shared/validation';

export const ACTIONS = [
  'friend.request', 'friend.listIncoming', 'friend.listAccepted', 'friend.accept',
  'friend.reject', 'friend.cancel', 'friend.remove', 'block.create', 'block.remove',
  'report.create', 'tag.catalog', 'verification.createDraft', 'verification.uploadPolicy',
  'verification.submit', 'verification.listMine', 'verification.getMine', 'verification.withdraw',
] as const satisfies readonly CloudAction[];

export type SocialAction = (typeof ACTIONS)[number];
type SocialResponseData = CloudActionData<SocialAction>;
type EvidenceMediaType = 'IMAGE' | 'DOCUMENT';

interface MutableVersionedRecord {
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLabelRecord extends MutableVersionedRecord {
  _id: string;
  labelId?: string;
  name: { zh: string; en: string };
  description: { zh: string; en: string };
  /** Local fail-closed metadata pending the shared-contract proposal. */
  category: string;
  enabled: boolean;
  publicEligible: boolean;
  riskClass?: string;
  complianceGate?: 'DISABLED' | 'ENABLED';
  requiredHumanReviewCount?: number;
  maxEvidenceCount: number;
  maxFileBytes: number;
  allowedMediaTypes: readonly EvidenceMediaType[];
}

export interface FriendshipRecord extends MutableVersionedRecord {
  _id: string;
  friendshipId?: string;
  pairKey: string;
  requesterUserId: string;
  addresseeUserId: string;
  state: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'REMOVED';
  message?: string;
  rejectionReasonCode?: string;
}

export interface BlockReportRecord extends MutableVersionedRecord {
  _id: string;
  blockId?: string;
  reportId?: string;
  recordType: 'BLOCK' | 'REPORT';
  actorUserId: string;
  targetId: string;
  targetType?: 'USER' | 'EVENT' | 'CONTENT';
  state: 'ACTIVE' | 'REMOVED' | 'OPEN' | 'RESOLVED' | 'DISMISSED';
  reasonCode?: string;
  description?: string;
  evidenceAssetIds?: readonly string[];
}

export interface SocialVerificationRequestRecord extends MutableVersionedRecord {
  _id: string;
  verificationRequestId?: string;
  subjectUserId: string;
  labelId: string;
  status: string;
  evidenceAssetIds: readonly string[];
  userStatement?: string;
  reviewerNote?: string;
  aiCheck?: Readonly<Record<string, unknown>>;
}

export interface SocialMediaAssetRecord extends MutableVersionedRecord {
  _id: string;
  mediaAssetId?: string;
  ownerUserId: string;
  domain: 'VERIFICATION' | 'REPORT';
  verificationRequestId?: string;
  mediaType: EvidenceMediaType;
  fileSizeBytes: number;
  sha256: string;
  storageFileId: string;
  uploadExpiresAt: string;
  uploadedAt?: string;
  publicState: 'PRIVATE';
  origin: 'SYNTHETIC' | 'REAL';
  evidenceMode: 'DEMO_ONLY' | 'LIVE_PRIVATE';
}

interface StoredIdempotencyRecord extends ExistingIdempotencyRecord {
  result: SocialResponseData;
}

interface SocialState {
  principals: TrustedPrincipal[];
  cards: PublicCardProjection[];
  labels: SocialLabelRecord[];
  friendships: FriendshipRecord[];
  blocksReports: BlockReportRecord[];
  verificationRequests: SocialVerificationRequestRecord[];
  mediaAssets: SocialMediaAssetRecord[];
  reviewLogs: Readonly<Record<string, unknown>>[];
  verificationClaims: Readonly<Record<string, unknown>>[];
  idempotencyKeys: StoredIdempotencyRecord[];
  auditLogs: Readonly<Record<string, unknown>>[];
  projectionInvalidations: ProjectionInvalidation[];
}

export interface InMemorySocialSeed {
  readonly principals?: readonly TrustedPrincipal[];
  readonly users?: readonly TrustedPrincipal[];
  readonly cards?: readonly PublicCardProjection[];
  readonly labels?: readonly SocialLabelRecord[];
  readonly friendships?: readonly FriendshipRecord[];
  readonly blocksReports?: readonly BlockReportRecord[];
  readonly verificationRequests?: readonly SocialVerificationRequestRecord[];
  readonly mediaAssets?: readonly SocialMediaAssetRecord[];
  readonly reviewLogs?: readonly Readonly<Record<string, unknown>>[];
  readonly verificationClaims?: readonly Readonly<Record<string, unknown>>[];
}

export interface SocialRepositorySnapshot {
  readonly principals: readonly TrustedPrincipal[];
  readonly cards: readonly PublicCardProjection[];
  readonly labels: readonly SocialLabelRecord[];
  readonly friendships: readonly FriendshipRecord[];
  readonly blocksReports: readonly BlockReportRecord[];
  readonly verificationRequests: readonly SocialVerificationRequestRecord[];
  readonly mediaAssets: readonly SocialMediaAssetRecord[];
  readonly reviewLogs: readonly Readonly<Record<string, unknown>>[];
  readonly verificationClaims: readonly Readonly<Record<string, unknown>>[];
  readonly idempotencyKeys: readonly StoredIdempotencyRecord[];
  readonly auditLogs: readonly Readonly<Record<string, unknown>>[];
  readonly projectionInvalidations: readonly ProjectionInvalidation[];
}

export interface SocialRepository {
  loadPrincipal(openId: string): Promise<TrustedPrincipal | null>;
  read<T>(operation: (state: Readonly<SocialState>) => T | Promise<T>): Promise<T>;
  runTransaction<T>(operation: (state: SocialState) => T | Promise<T>): Promise<T>;
  snapshot(): SocialRepositorySnapshot;
  markMediaUploaded(mediaAssetId: string, uploadedAt: string): Promise<void>;
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

class InMemorySocialRepository implements SocialRepository {
  private state: SocialState;
  private queue: Promise<void> = Promise.resolve();

  constructor(seed: InMemorySocialSeed) {
    this.state = {
      principals: clone([...(seed.principals ?? seed.users ?? [])]),
      cards: clone([...(seed.cards ?? [])]),
      labels: clone([...(seed.labels ?? [])]),
      friendships: clone([...(seed.friendships ?? [])]),
      blocksReports: clone([...(seed.blocksReports ?? [])]),
      verificationRequests: clone([...(seed.verificationRequests ?? [])]),
      mediaAssets: clone([...(seed.mediaAssets ?? [])]),
      reviewLogs: clone([...(seed.reviewLogs ?? [])]),
      verificationClaims: clone([...(seed.verificationClaims ?? [])]),
      idempotencyKeys: [],
      auditLogs: [],
      projectionInvalidations: [],
    };
    assertStateIntegrity(this.state);
  }

  async loadPrincipal(openId: string): Promise<TrustedPrincipal | null> {
    await this.queue;
    const principal = this.state.principals.find((candidate) => candidate.openId === openId);
    return principal === undefined ? null : clone(principal);
  }

  async read<T>(operation: (state: Readonly<SocialState>) => T | Promise<T>): Promise<T> {
    await this.queue;
    return operation(clone(this.state));
  }

  async runTransaction<T>(operation: (state: SocialState) => T | Promise<T>): Promise<T> {
    let release: (() => void) | undefined;
    const previous = this.queue;
    this.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const draft = clone(this.state);
    try {
      const result = await operation(draft);
      this.state = draft;
      return clone(result);
    } finally {
      release?.();
    }
  }

  snapshot(): SocialRepositorySnapshot {
    return clone(this.state);
  }

  async markMediaUploaded(mediaAssetId: string, uploadedAt: string): Promise<void> {
    assertUtc(uploadedAt, 'uploadedAt');
    await this.runTransaction((state) => {
      const asset = state.mediaAssets.find((candidate) => candidate._id === mediaAssetId);
      if (asset === undefined) throw new Error('Unknown media asset');
      asset.uploadedAt = uploadedAt;
      asset.updatedAt = uploadedAt;
      asset.version += 1;
    });
  }
}

export function createInMemorySocialRepository(seed: InMemorySocialSeed = {}): SocialRepository {
  return new InMemorySocialRepository(seed);
}

function assertStateIntegrity(state: Readonly<SocialState>): void {
  const openIds = new Set<string>();
  const userIds = new Set<string>();
  for (const principal of state.principals) {
    if (openIds.has(principal.openId)) throw new Error('Duplicate principal openId');
    openIds.add(principal.openId);
    if (principal.userId !== undefined) {
      if (userIds.has(principal.userId)) throw new Error('Duplicate principal userId');
      userIds.add(principal.userId);
    }
  }
  const pairs = new Set<string>();
  for (const friendship of state.friendships) {
    const normalized = pairKey(friendship.requesterUserId, friendship.addresseeUserId);
    if (friendship.pairKey !== normalized) throw new Error('Friendship pairKey does not match its participants');
    if (pairs.has(normalized)) throw new Error('Duplicate normalized friendship pair');
    pairs.add(normalized);
    if (!Object.values(FriendshipState).includes(friendship.state)) throw new Error('Invalid friendship state');
  }
  for (const request of state.verificationRequests) {
    if (!Object.values(ReviewStatus).includes(request.status as ReviewStatus)) {
      throw new Error('Invalid verification request status');
    }
  }
}

function pairKey(firstUserId: string, secondUserId: string): string {
  return [firstUserId, secondUserId].sort().join('::');
}

function isUtc(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
    && !Number.isNaN(Date.parse(value));
}

function assertUtc(value: unknown, field: string): asserts value is string {
  if (!isUtc(value)) validation([{ field, rule: 'RFC3339_UTC' }]);
}

function defaultNow(): string {
  return new Date().toISOString();
}

function opaqueToken(): string {
  const cryptoCandidate = globalThis.crypto;
  if (cryptoCandidate !== undefined && typeof cryptoCandidate.randomUUID === 'function') {
    return cryptoCandidate.randomUUID();
  }
  throw new Error('Secure random identifier generation is unavailable');
}

function defaultCreateId(prefix: string): string {
  return `${prefix}_${opaqueToken().replace(/-/g, '')}`;
}

function requestIdForFailure(event: unknown, createId: (prefix: string) => string): RequestId {
  if (isPlainRecord(event) && isValidRequestId(event.requestId)) return event.requestId as RequestId;
  return createId('srv') as RequestId;
}

function invalidRequest(field: string | undefined, reason: string): never {
  throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, 'The request contains an unsupported or malformed field.', {
    details: {
      code: ApiErrorCode.INVALID_REQUEST,
      ...(field === undefined ? {} : { field }),
      reason,
    },
  });
}

function validation(issues: readonly { readonly field: string; readonly rule: string }[]): never {
  throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, 'The request did not pass validation.', {
    details: { code: ApiErrorCode.VALIDATION_FAILED, issues },
  });
}

function notFound(resourceType: string, resourceId?: string): never {
  throw new SafeApiError(ApiErrorCode.NOT_FOUND, 'The requested resource was not found.', {
    details: {
      code: ApiErrorCode.NOT_FOUND,
      resourceType,
      ...(resourceId === undefined ? {} : { resourceId: resourceId as StableId }),
    },
  });
}

function forbidden(policy: string): never {
  throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'This action is not allowed for the current account.', {
    details: { code: ApiErrorCode.FORBIDDEN, policy },
  });
}

function conflict(conflictType: string): never {
  throw new SafeApiError(ApiErrorCode.CONFLICT, 'The current resource state does not allow this action.', {
    details: { code: ApiErrorCode.CONFLICT, conflictType },
  });
}

function blocked(): never {
  throw new SafeApiError(ApiErrorCode.BLOCKED_RELATIONSHIP, 'The relationship is blocked.', {
    details: { code: ApiErrorCode.BLOCKED_RELATIONSHIP, blocksAccess: true },
  });
}

function reviewTransition(from: string, to: string): never {
  throw new SafeApiError(ApiErrorCode.REVIEW_INVALID_TRANSITION, 'The review transition is not allowed.', {
    details: { code: ApiErrorCode.REVIEW_INVALID_TRANSITION, from, to },
  });
}

function exactPayload(
  payload: Readonly<Record<string, unknown>>,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  const allowed = new Set([...required, ...optional, 'contractVersion']);
  const unexpected = Object.keys(payload).find((key) => !allowed.has(key));
  if (unexpected !== undefined) invalidRequest(unexpected, 'UNEXPECTED_FIELD');
  const missing = required.find((key) => payload[key] === undefined);
  if (missing !== undefined) invalidRequest(missing, 'REQUIRED_FIELD');
  if (payload.contractVersion !== undefined && payload.contractVersion !== '1.0.0') {
    invalidRequest('contractVersion', 'CONTRACT_VERSION_MISMATCH');
  }
}

function requireString(
  value: unknown,
  field: string,
  options: { readonly min?: number; readonly max?: number; readonly pattern?: RegExp } = {},
): string {
  if (typeof value !== 'string'
      || value.trim().length < (options.min ?? 1)
      || value.length > (options.max ?? 256)
      || (options.pattern !== undefined && !options.pattern.test(value))) {
    validation([{ field, rule: 'MALFORMED_STRING' }]);
  }
  return value;
}

function requireStableId(value: unknown, field: string): string {
  return requireString(value, field, { min: 6, max: 128, pattern: /^[A-Za-z0-9][A-Za-z0-9._:-]+$/ });
}

function requireReadStableId(value: unknown, field: string): string {
  if (typeof value !== 'string'
      || value.length < 6
      || value.length > 128
      || !/^[A-Za-z0-9][A-Za-z0-9._:-]+$/.test(value)) {
    invalidRequest(field, 'MALFORMED_STABLE_ID');
  }
  return value;
}

function requireLimit(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 50) {
    invalidRequest('limit', 'INTEGER_1_TO_50');
  }
  return value as number;
}

function requirePrincipalUserId(principal: TrustedPrincipal): string {
  if (principal.userId === undefined) forbidden('PROFILE_REQUIRED');
  return principal.userId;
}

function ensureExpectedVersion(value: unknown, currentVersion: number): void {
  if (value === undefined) return;
  requireExpectedVersion(value as number, currentVersion);
}

function requireMutationExpectedVersion(value: unknown, currentVersion: number): void {
  if (value === undefined) validation([{ field: 'expectedVersion', rule: 'REQUIRED_FOR_MUTATION' }]);
  requireExpectedVersion(value as number, currentVersion);
}

function findActiveBlock(
  state: Readonly<SocialState>,
  actorUserId: string,
  targetUserId: string,
): BlockReportRecord | undefined {
  return state.blocksReports.find((record) => record.recordType === 'BLOCK'
    && record.actorUserId === actorUserId && record.targetId === targetUserId && record.state === 'ACTIVE');
}

function pairIsBlocked(state: Readonly<SocialState>, firstUserId: string, secondUserId: string): boolean {
  return findActiveBlock(state, firstUserId, secondUserId) !== undefined
    || findActiveBlock(state, secondUserId, firstUserId) !== undefined;
}

function requireActiveTargetUser(state: Readonly<SocialState>, userId: string): void {
  const principal = state.principals.find((candidate) => candidate.userId === userId);
  if (principal === undefined || principal.accountState !== 'ACTIVE') notFound('USER', userId);
}

function findFriendshipByPair(
  state: Readonly<SocialState>,
  firstUserId: string,
  secondUserId: string,
): FriendshipRecord | undefined {
  const normalized = pairKey(firstUserId, secondUserId);
  return state.friendships.find((record) => record.pairKey === normalized
    && pairKey(record.requesterUserId, record.addresseeUserId) === normalized);
}

function findFriendshipForActor(
  state: Readonly<SocialState>,
  friendshipId: string,
  actorUserId: string,
): FriendshipRecord {
  const record = state.friendships.find((candidate) => candidate._id === friendshipId);
  if (record === undefined
      || (record.requesterUserId !== actorUserId && record.addresseeUserId !== actorUserId)) {
    notFound('FRIENDSHIP', friendshipId);
  }
  return record;
}

function otherParty(record: FriendshipRecord, userId: string): string {
  return record.requesterUserId === userId ? record.addresseeUserId : record.requesterUserId;
}

function relationshipProjection(
  state: Readonly<SocialState>,
  viewerUserId: string,
  subjectUserId: string,
  evaluatedAt: string,
): ViewerRelationshipProjection {
  const friendship = findFriendshipByPair(state, viewerUserId, subjectUserId);
  const viewerBlock = findActiveBlock(state, viewerUserId, subjectUserId);
  const subjectBlock = findActiveBlock(state, subjectUserId, viewerUserId);
  const sourceRecords = [friendship, viewerBlock, subjectBlock].filter(
    (record): record is FriendshipRecord | BlockReportRecord => record !== undefined,
  );
  const sourceVersion = Math.max(1, ...sourceRecords.map((record) => record.version));
  const createdAt = sourceRecords.length === 0
    ? evaluatedAt
    : [...sourceRecords].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0]!.createdAt;
  const updatedAt = sourceRecords.length === 0
    ? evaluatedAt
    : [...sourceRecords].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0]!.updatedAt;
  return parseReadOnlyProjection('ViewerRelationshipProjection', {
    version: sourceVersion,
    createdAt,
    updatedAt,
    viewerUserId,
    subjectUserId,
    ...(friendship === undefined ? {} : {
      friendshipId: friendship._id,
      friendshipState: friendship.state,
    }),
    viewerBlockedSubject: viewerBlock !== undefined,
    subjectBlockedViewer: subjectBlock !== undefined,
    mayViewFriendsOnlyFields: friendship?.state === FriendshipState.ACCEPTED
      && viewerBlock === undefined && subjectBlock === undefined,
    sourceVersion,
  });
}

function verificationProjection(record: SocialVerificationRequestRecord): VerificationRequestProjection {
  return {
    version: record.version as OptimisticVersion,
    createdAt: record.createdAt as UtcInstant,
    updatedAt: record.updatedAt as UtcInstant,
    verificationRequestId: record._id as VerificationRequestId,
    labelId: record.labelId as StableId<'label'>,
    status: record.status as VerificationRequestProjection['status'],
    evidenceAssetIds: record.evidenceAssetIds.map((assetId) => assetId as MediaAssetId),
    ...(record.reviewerNote === undefined ? {} : { reviewerNote: record.reviewerNote }),
  };
}

function labelProjection(record: SocialLabelRecord): LabelDefinitionProjection {
  return {
    version: record.version as OptimisticVersion,
    createdAt: record.createdAt as UtcInstant,
    updatedAt: record.updatedAt as UtcInstant,
    labelId: record._id as StableId<'label'>,
    name: clone(record.name),
    description: clone(record.description),
    enabled: record.enabled,
  };
}

function reportProjection(record: BlockReportRecord): ReportProjection {
  return {
    version: record.version as OptimisticVersion,
    createdAt: record.createdAt as UtcInstant,
    updatedAt: record.updatedAt as UtcInstant,
    reportId: record._id as StableId<'report'>,
    targetType: record.targetType ?? 'USER',
    targetId: record.targetId as StableId,
    status: record.state as ReportProjection['status'],
    reasonCode: record.reasonCode ?? 'OTHER',
  };
}

function appendInvalidation(
  state: SocialState,
  input: {
    readonly kind: 'RELATIONSHIP_CHANGED' | 'VERIFICATION_CHANGED';
    readonly sourceAggregateId: string;
    readonly sourceVersion: number;
    readonly occurredAt: string;
    readonly reason: string;
    readonly requestId: string;
    readonly createId: (prefix: string) => string;
  },
): void {
  state.projectionInvalidations.push(createProjectionInvalidation({
    eventId: input.createId('projection'),
    kind: input.kind === 'RELATIONSHIP_CHANGED'
      ? ProjectionInvalidationKind.RELATIONSHIP_CHANGED
      : ProjectionInvalidationKind.VERIFICATION_CHANGED,
    sourceAggregateId: input.sourceAggregateId,
    sourceVersion: input.sourceVersion,
    occurredAt: input.occurredAt,
    reason: input.reason,
    requestId: input.requestId,
  }));
}

function cursorChecksum(filter: string): string {
  let hash = 2166136261;
  for (const character of filter) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function invalidCursor(reason: 'MALFORMED' | 'EXPIRED' | 'FILTER_MISMATCH'): never {
  throw new SafeApiError(ApiErrorCode.INVALID_CURSOR, 'The pagination cursor is invalid.', {
    details: { code: ApiErrorCode.INVALID_CURSOR, reason },
  });
}

function decodeCursor(value: unknown, filter: string): number {
  if (value === undefined) return 0;
  if (typeof value !== 'string') invalidCursor('MALFORMED');
  const match = /^social:(\d+):([a-z0-9]+)$/.exec(value);
  if (match === null) invalidCursor('MALFORMED');
  if (match[2] !== cursorChecksum(filter)) invalidCursor('FILTER_MISMATCH');
  const offset = Number(match[1]);
  if (!Number.isSafeInteger(offset) || offset < 0) invalidCursor('MALFORMED');
  return offset;
}

function paginate<T>(items: readonly T[], limit: number, cursor: unknown, filter: string): {
  readonly items: readonly T[];
  readonly nextCursor?: PaginationCursor;
  readonly hasMore: boolean;
} {
  const offset = decodeCursor(cursor, filter);
  const pageItems = items.slice(offset, offset + limit);
  const nextOffset = offset + pageItems.length;
  const hasMore = nextOffset < items.length;
  return {
    items: pageItems,
    ...(hasMore ? { nextCursor: `social:${nextOffset}:${cursorChecksum(filter)}` as PaginationCursor } : {}),
    hasMore,
  };
}

function addReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

export interface PublicVerificationAuditInput {
  readonly claim: Readonly<Record<string, unknown>>;
  readonly label: Readonly<Record<string, unknown>>;
  readonly reviewLogs: readonly Readonly<Record<string, unknown>>[];
  readonly evaluatedAt: string;
}

export interface PublicVerificationAuditResult {
  readonly eligible: boolean;
  readonly reasons: readonly string[];
  readonly projection?: Readonly<PublicVerificationClaimProjection>;
}

export function auditPublicVerificationClaim(
  input: PublicVerificationAuditInput,
): PublicVerificationAuditResult {
  const { claim, label, reviewLogs, evaluatedAt } = input;
  const reasons: string[] = [];
  const reviewStatus = claim.reviewStatus;

  if (reviewStatus === ReviewStatus.REVOKED || claim.revokedAt !== undefined) addReason(reasons, 'CLAIM_REVOKED');
  if (reviewStatus !== ReviewStatus.APPROVED) addReason(reasons, 'REVIEW_STATUS_NOT_APPROVED');
  if (claim.verificationState !== VerificationState.HUMAN_REVIEWED) addReason(reasons, 'HUMAN_REVIEW_REQUIRED');
  if (claim.publicVisible !== true) addReason(reasons, 'PUBLIC_VISIBILITY_DISABLED');
  if (claim.userSelectedPublic !== true) addReason(reasons, 'USER_PUBLIC_OPT_IN_REQUIRED');
  if (label.enabled !== true) addReason(reasons, 'LABEL_DISABLED');
  if (label.category !== 'PUBLIC_IDENTITY_TAG' && label.category !== 'PUBLIC_INTEREST_TAG') {
    addReason(reasons, 'LABEL_CATEGORY_NOT_PUBLIC');
  }
  const expectedLabelId = label._id ?? label.labelId;
  if (typeof expectedLabelId !== 'string' || claim.labelId !== expectedLabelId) {
    addReason(reasons, 'LABEL_MISMATCH');
  }
  if (label.publicEligible !== true) addReason(reasons, 'LABEL_NOT_PUBLIC_ELIGIBLE');
  if (label.riskClass === 'WEALTH_ASSET_FAMILY') {
    if (label.complianceGate !== 'ENABLED') addReason(reasons, 'COMPLIANCE_GATE_DISABLED');
    const configuredReviewCount = typeof label.requiredHumanReviewCount === 'number'
      && Number.isSafeInteger(label.requiredHumanReviewCount)
      ? label.requiredHumanReviewCount
      : 0;
    const requiredReviewCount = Math.max(2, configuredReviewCount);
    const distinctHumanReviewers = new Set(reviewLogs
      .filter((log) => log.claimId === claim.claimId
        && log.verificationRequestId === claim.verificationRequestId
        && log.decision === 'APPROVED'
        && log.action === 'review.approve'
        && log.result === 'SUCCEEDED'
        && log.source === 'HUMAN'
        && (log.actorRole === 'REVIEWER' || log.actorRole === 'ADMIN')
        && typeof log.reviewedBy === 'string'
        && log.reviewedBy.length > 0
        && typeof log.reviewScope === 'string'
        && log.reviewScope === claim.reviewScope
        && typeof log.reviewedAt === 'string'
        && isUtc(log.reviewedAt)
        && isUtc(evaluatedAt)
        && Date.parse(log.reviewedAt) <= Date.parse(evaluatedAt))
      .map((log) => log.reviewedBy as string));
    if (distinctHumanReviewers.size < requiredReviewCount) {
      addReason(reasons, 'DUAL_HUMAN_REVIEW_REQUIRED');
    }
  }

  if (typeof claim.reviewedBy !== 'string' || claim.reviewedBy.length === 0) {
    addReason(reasons, 'REVIEWED_BY_REQUIRED');
  }
  if (claim.reviewedAt === undefined || claim.reviewedAt === '') {
    addReason(reasons, 'REVIEWED_AT_REQUIRED');
  } else if (!isUtc(claim.reviewedAt)) {
    addReason(reasons, 'REVIEWED_AT_INVALID');
  }
  if (typeof claim.reviewScope !== 'string' || claim.reviewScope.length === 0) {
    addReason(reasons, 'REVIEW_SCOPE_REQUIRED');
  } else if (claim.reviewScope !== label.category) {
    addReason(reasons, 'REVIEW_SCOPE_MISMATCH');
  }
  if (reviewLogs.length === 0 || typeof claim.reviewLogId !== 'string') {
    addReason(reasons, 'MISSING_REVIEW_LOG');
  }

  const matchingIdLog = typeof claim.reviewLogId === 'string'
    ? reviewLogs.find((log) => (log.reviewLogId ?? log._id) === claim.reviewLogId)
    : undefined;
  if (matchingIdLog !== undefined) {
    if (matchingIdLog.claimId !== claim.claimId
        || matchingIdLog.verificationRequestId !== claim.verificationRequestId
        || matchingIdLog.reviewedBy !== claim.reviewedBy
        || matchingIdLog.reviewedAt !== claim.reviewedAt
        || matchingIdLog.reviewScope !== claim.reviewScope) {
      addReason(reasons, 'REVIEW_LOG_MISMATCH');
    }
    if (matchingIdLog.decision !== 'APPROVED'
        || matchingIdLog.action !== 'review.approve'
        || matchingIdLog.result !== 'SUCCEEDED') {
      addReason(reasons, 'VALID_REVIEW_LOG_REQUIRED');
    }
    if (matchingIdLog.source !== 'HUMAN'
        || (matchingIdLog.actorRole !== 'REVIEWER' && matchingIdLog.actorRole !== 'ADMIN')) {
      addReason(reasons, 'HUMAN_REVIEW_REQUIRED');
    }
  } else if (reviewLogs.length > 0 && typeof claim.reviewLogId === 'string') {
    addReason(reasons, 'REVIEW_LOG_MISMATCH');
  }

  if (!isUtc(evaluatedAt)) addReason(reasons, 'EVALUATED_AT_INVALID');
  if (!isUtc(claim.validFrom)) addReason(reasons, 'CLAIM_VALID_FROM_INVALID');
  if (claim.validUntil !== undefined && !isUtc(claim.validUntil)) {
    addReason(reasons, 'CLAIM_VALID_UNTIL_INVALID');
  }
  if (isUtc(evaluatedAt) && isUtc(claim.reviewedAt)
      && Date.parse(claim.reviewedAt) > Date.parse(evaluatedAt)) {
    addReason(reasons, 'REVIEWED_AT_IN_FUTURE');
  }
  if (isUtc(evaluatedAt) && isUtc(claim.validFrom)) {
    if (Date.parse(evaluatedAt) < Date.parse(claim.validFrom)) addReason(reasons, 'CLAIM_NOT_YET_VALID');
    if (isUtc(claim.validUntil)) {
      if (Date.parse(claim.validUntil) <= Date.parse(claim.validFrom)) {
        addReason(reasons, 'CLAIM_VALIDITY_RANGE_INVALID');
      } else if (Date.parse(evaluatedAt) >= Date.parse(claim.validUntil)) {
        addReason(reasons, 'CLAIM_EXPIRED');
      }
    }
  }

  if (reasons.length > 0) return Object.freeze({ eligible: false, reasons: Object.freeze(reasons) });
  const projection = parseReadOnlyProjection('PublicVerificationClaimProjection', {
    version: claim.version,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
    claimId: claim.claimId,
    subjectUserId: claim.subjectUserId,
    labelId: label._id ?? label.labelId,
    labelText: label.name,
    reviewStatus: ReviewStatus.APPROVED,
    verificationState: VerificationState.HUMAN_REVIEWED,
    publicVisible: true,
    validFrom: claim.validFrom,
    ...(claim.validUntil === undefined ? {} : { validUntil: claim.validUntil }),
  });
  return Object.freeze({ eligible: true, reasons: Object.freeze([]), projection });
}

export interface SocialApiDependencies {
  readonly repository: SocialRepository;
  readonly getWxContext: WxContextProvider;
  readonly loadPrincipal?: PrincipalLoader;
  readonly now?: () => string;
  readonly createId?: (prefix: string) => string;
}

export interface SocialApiEndpoint {
  readonly actions: readonly SocialAction[];
  readonly writeGuardPlans: Readonly<Record<string, unknown>>;
  readonly main: (
    event: unknown,
    context?: Readonly<Record<string, unknown>>,
  ) => Promise<ApiResult<SocialResponseData>>;
}

interface MutationResult {
  readonly data: SocialResponseData;
  readonly targetType: string;
  readonly targetId: string;
}

interface RuntimeDependencies {
  readonly repository: SocialRepository;
  readonly getWxContext: WxContextProvider;
  readonly loadPrincipal: PrincipalLoader;
  readonly now: () => string;
  readonly createId: (prefix: string) => string;
}

function success(data: SocialResponseData, requestId: string): ApiResult<SocialResponseData> {
  return { ok: true, data, requestId: requestId as RequestId };
}

function auditedClaimsForSubject(
  state: Readonly<SocialState>,
  subjectUserId: string,
  evaluatedAt: string,
): readonly PublicVerificationClaimProjection[] {
  const projections: PublicVerificationClaimProjection[] = [];
  for (const claim of state.verificationClaims) {
    if (claim.subjectUserId !== subjectUserId || typeof claim.labelId !== 'string') continue;
    const label = state.labels.find((candidate) => candidate._id === claim.labelId);
    if (label === undefined) continue;
    const audit = auditPublicVerificationClaim({
      claim,
      label: label as unknown as Readonly<Record<string, unknown>>,
      reviewLogs: state.reviewLogs,
      evaluatedAt,
    });
    if (audit.eligible && audit.projection !== undefined) projections.push(audit.projection);
  }
  return projections;
}

function sanitizeCard(
  state: Readonly<SocialState>,
  card: PublicCardProjection,
  mayViewFriendsOnlyFields: boolean,
  evaluatedAt: string,
): PublicCardProjection {
  const exposesOptionalFields = card.visibility === 'PUBLIC'
    || (card.visibility === 'FRIENDS_ONLY' && mayViewFriendsOnlyFields);
  const claims = card.visibility === 'PRIVATE'
    ? []
    : auditedClaimsForSubject(state, card.ownerUserId, evaluatedAt);
  return {
    version: card.version,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    cardId: card.cardId,
    ownerUserId: card.ownerUserId,
    displayName: card.displayName,
    ...(!exposesOptionalFields || card.headline === undefined ? {} : { headline: card.headline }),
    ...(!exposesOptionalFields || card.cityId === undefined ? {} : { cityId: card.cityId }),
    ...(!exposesOptionalFields || card.avatarUrl === undefined ? {} : { avatarUrl: card.avatarUrl }),
    ...(!exposesOptionalFields || card.biography === undefined ? {} : { biography: card.biography }),
    visibility: card.visibility,
    claims,
    origin: card.origin,
    verificationState: card.verificationState,
  };
}

function mediaRightsRequired(mediaAssetIds: readonly string[]): never {
  throw new SafeApiError(ApiErrorCode.MEDIA_RIGHTS_REQUIRED, 'The private evidence is missing or outside its upload authorization.', {
    details: {
      code: ApiErrorCode.MEDIA_RIGHTS_REQUIRED,
      mediaAssetIds: mediaAssetIds.map((id) => id as MediaAssetId),
    },
  });
}

async function idempotentMutation(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  action: SocialAction,
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
  operation: (state: SocialState, now: string) => MutationResult | Promise<MutationResult>,
): Promise<SocialResponseData> {
  const openId = principal.openId;
  const userId = requirePrincipalUserId(principal);
  const idempotencyKey = requireIdempotencyKey(payload.idempotencyKey);
  const now = dependencies.now();
  assertUtc(now, 'now');
  const claim = createIdempotencyClaim({
    functionName: 'socialApi',
    action,
    openId,
    key: idempotencyKey,
    payload: payload as unknown as JsonValue,
    requestId: requestId as RequestId,
    expiresAt: new Date(Date.parse(now) + 24 * 60 * 60 * 1000).toISOString(),
  });

  return dependencies.repository.runTransaction(async (state) => {
    const existing = state.idempotencyKeys.find((record) => record.namespace === claim.namespace) ?? null;
    const compatibility = assertIdempotencyCompatible(claim, existing);
    if (compatibility === 'REPLAY' && existing !== null) return existing.result;
    if (compatibility === 'IN_PROGRESS') conflict('IDEMPOTENCY_IN_PROGRESS');

    const mutation = await operation(state, now);
    const actorRole = principal.roles[0] ?? 'MEMBER';
    const audit = createAuditAppend({
      auditEntryId: dependencies.createId('audit') as StableId<'audit-entry'>,
      actorUserId: userId as UserId,
      actorRole,
      action,
      targetType: mutation.targetType,
      targetId: mutation.targetId as StableId,
      requestId: requestId as RequestId,
      occurredAt: now as UtcInstant,
      result: 'SUCCEEDED',
    });
    state.auditLogs.push(audit as unknown as Readonly<Record<string, unknown>>);
    state.idempotencyKeys.push({
      ...claim,
      status: 'COMPLETED',
      result: clone(mutation.data),
    });
    return mutation.data;
  });
}

function requestFriend(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, ['recipientUserId', 'idempotencyKey'], ['message', 'expectedVersion']);
  const recipientUserId = requireStableId(payload.recipientUserId, 'recipientUserId');
  const requesterUserId = requirePrincipalUserId(principal);
  if (recipientUserId === requesterUserId) validation([{ field: 'recipientUserId', rule: 'MUST_DIFFER_FROM_ACTOR' }]);
  const message = payload.message === undefined
    ? undefined
    : requireString(payload.message, 'message', { max: 200 });

  return idempotentMutation(dependencies, principal, 'friend.request', requestId, payload, (state, now) => {
    requireActiveTargetUser(state, recipientUserId);
    if (pairIsBlocked(state, requesterUserId, recipientUserId)) blocked();
    const existing = findFriendshipByPair(state, requesterUserId, recipientUserId);
    if (existing !== undefined && (existing.state === 'PENDING' || existing.state === 'ACCEPTED')) {
      ensureExpectedVersion(payload.expectedVersion, existing.version);
      return {
        data: { relationship: relationshipProjection(state, requesterUserId, recipientUserId, now) },
        targetType: 'FRIENDSHIP',
        targetId: existing._id,
      } as MutationResult;
    }

    if (existing === undefined) {
      if (payload.expectedVersion !== undefined) validation([{ field: 'expectedVersion', rule: 'NOT_ALLOWED_FOR_NEW_PAIR' }]);
      const friendshipId = dependencies.createId('friendship');
      const created: FriendshipRecord = {
        _id: friendshipId,
        friendshipId,
        pairKey: pairKey(requesterUserId, recipientUserId),
        requesterUserId,
        addresseeUserId: recipientUserId,
        state: 'PENDING',
        ...(message === undefined ? {} : { message }),
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      state.friendships.push(created);
      appendInvalidation(state, {
        kind: 'RELATIONSHIP_CHANGED',
        sourceAggregateId: friendshipId,
        sourceVersion: 1,
        occurredAt: now,
        reason: 'FRIEND_REQUEST_CREATED',
        requestId,
        createId: dependencies.createId,
      });
      return {
        data: { relationship: relationshipProjection(state, requesterUserId, recipientUserId, now) },
        targetType: 'FRIENDSHIP',
        targetId: friendshipId,
      } as MutationResult;
    }

    if (existing.state !== 'REMOVED') conflict('FRIENDSHIP_STATE_TRANSITION');
    ensureExpectedVersion(payload.expectedVersion, existing.version);
    existing.requesterUserId = requesterUserId;
    existing.addresseeUserId = recipientUserId;
    existing.state = 'PENDING';
    if (message === undefined) delete existing.message;
    else existing.message = message;
    delete existing.rejectionReasonCode;
    existing.version += 1;
    existing.updatedAt = now;
    appendInvalidation(state, {
      kind: 'RELATIONSHIP_CHANGED',
      sourceAggregateId: existing._id,
      sourceVersion: existing.version,
      occurredAt: now,
      reason: 'FRIEND_REQUEST_REOPENED',
      requestId,
      createId: dependencies.createId,
    });
    return {
      data: { relationship: relationshipProjection(state, requesterUserId, recipientUserId, now) },
      targetType: 'FRIENDSHIP',
      targetId: existing._id,
    } as MutationResult;
  });
}

async function listIncoming(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, ['includeExpired', 'limit'], ['cursor']);
  if (typeof payload.includeExpired !== 'boolean') invalidRequest('includeExpired', 'BOOLEAN_REQUIRED');
  const limit = requireLimit(payload.limit);
  const userId = requirePrincipalUserId(principal);
  const evaluatedAt = dependencies.now();
  assertUtc(evaluatedAt, 'now');
  return dependencies.repository.read((state) => {
    const allowedStates = payload.includeExpired === true
      ? new Set(['PENDING', 'REJECTED', 'CANCELLED'])
      : new Set(['PENDING']);
    const records = state.friendships
      .filter((record) => record.addresseeUserId === userId
        && allowedStates.has(record.state)
        && !pairIsBlocked(state, record.requesterUserId, record.addresseeUserId))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const items = records.map((record) => {
      const card = state.cards.find((candidate) => candidate.ownerUserId === record.requesterUserId);
      if (card === undefined) notFound('PUBLIC_CARD', record.requesterUserId);
      return {
        version: record.version as OptimisticVersion,
        createdAt: record.createdAt as UtcInstant,
        updatedAt: record.updatedAt as UtcInstant,
        friendshipId: record._id as StableId<'friendship'>,
        requester: sanitizeCard(state, card, false, evaluatedAt),
        state: record.state,
        ...(record.message === undefined ? {} : { message: record.message }),
      };
    });
    return { page: paginate(items, limit, payload.cursor, `incoming:${userId}:${String(payload.includeExpired)}`) } as SocialResponseData;
  });
}

async function listAccepted(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, ['limit'], ['cursor', 'cityId']);
  const limit = requireLimit(payload.limit);
  const cityId = payload.cityId === undefined ? undefined : requireReadStableId(payload.cityId, 'cityId');
  const userId = requirePrincipalUserId(principal);
  const evaluatedAt = dependencies.now();
  assertUtc(evaluatedAt, 'now');
  return dependencies.repository.read((state) => {
    const cards = state.friendships
      .filter((record) => record.state === 'ACCEPTED'
        && (record.requesterUserId === userId || record.addresseeUserId === userId)
        && !pairIsBlocked(state, record.requesterUserId, record.addresseeUserId))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map((record) => state.cards.find((card) => card.ownerUserId === otherParty(record, userId)))
      .filter((card): card is PublicCardProjection => card !== undefined)
      .filter((card) => cityId === undefined || card.cityId === cityId)
      .map((card) => sanitizeCard(state, card, true, evaluatedAt));
    return { page: paginate(cards, limit, payload.cursor, `accepted:${userId}:${cityId ?? '*'}`) } as SocialResponseData;
  });
}

function transitionFriendship(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  action: 'friend.accept' | 'friend.reject' | 'friend.cancel',
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  const optional = action === 'friend.reject'
    ? ['expectedVersion', 'reasonCode']
    : ['expectedVersion'];
  exactPayload(payload, ['friendshipId', 'idempotencyKey'], optional);
  const friendshipId = requireStableId(payload.friendshipId, 'friendshipId');
  const actorUserId = requirePrincipalUserId(principal);
  if (payload.reasonCode !== undefined
      && !['NOT_KNOWN', 'NOT_NOW', 'OTHER'].includes(String(payload.reasonCode))) {
    validation([{ field: 'reasonCode', rule: 'ENUM' }]);
  }
  return idempotentMutation(dependencies, principal, action, requestId, payload, (state, now) => {
    const record = findFriendshipForActor(state, friendshipId, actorUserId);
    if (record.state !== 'PENDING') conflict('FRIENDSHIP_STATE_TRANSITION');
    if (action === 'friend.accept' || action === 'friend.reject') {
      if (record.addresseeUserId !== actorUserId) forbidden('FRIEND_REQUEST_RECIPIENT_REQUIRED');
    } else if (record.requesterUserId !== actorUserId) {
      forbidden('FRIEND_REQUEST_REQUESTER_REQUIRED');
    }
    if (action === 'friend.accept' && pairIsBlocked(state, record.requesterUserId, record.addresseeUserId)) blocked();
    requireMutationExpectedVersion(payload.expectedVersion, record.version);
    record.state = action === 'friend.accept' ? 'ACCEPTED'
      : action === 'friend.reject' ? 'REJECTED' : 'CANCELLED';
    if (action === 'friend.reject' && payload.reasonCode !== undefined) {
      record.rejectionReasonCode = String(payload.reasonCode);
    }
    record.version += 1;
    record.updatedAt = now;
    appendInvalidation(state, {
      kind: 'RELATIONSHIP_CHANGED',
      sourceAggregateId: record._id,
      sourceVersion: record.version,
      occurredAt: now,
      reason: action === 'friend.accept' ? 'FRIEND_REQUEST_ACCEPTED'
        : action === 'friend.reject' ? 'FRIEND_REQUEST_REJECTED' : 'FRIEND_REQUEST_CANCELLED',
      requestId,
      createId: dependencies.createId,
    });
    return {
      data: {
        relationship: relationshipProjection(state, actorUserId, otherParty(record, actorUserId), now),
      },
      targetType: 'FRIENDSHIP',
      targetId: record._id,
    } as MutationResult;
  });
}

function removeFriend(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, ['friendshipId', 'idempotencyKey'], ['expectedVersion']);
  const friendshipId = requireStableId(payload.friendshipId, 'friendshipId');
  const actorUserId = requirePrincipalUserId(principal);
  return idempotentMutation(dependencies, principal, 'friend.remove', requestId, payload, (state, now) => {
    const record = findFriendshipForActor(state, friendshipId, actorUserId);
    if (record.state !== 'ACCEPTED') conflict('FRIENDSHIP_STATE_TRANSITION');
    requireMutationExpectedVersion(payload.expectedVersion, record.version);
    record.state = 'REMOVED';
    record.version += 1;
    record.updatedAt = now;
    appendInvalidation(state, {
      kind: 'RELATIONSHIP_CHANGED',
      sourceAggregateId: record._id,
      sourceVersion: record.version,
      occurredAt: now,
      reason: 'FRIENDSHIP_REMOVED',
      requestId,
      createId: dependencies.createId,
    });
    return {
      data: { removedAt: now as UtcInstant, projectionDirty: true },
      targetType: 'FRIENDSHIP',
      targetId: record._id,
    } as MutationResult;
  });
}

function createBlock(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, ['blockedUserId', 'idempotencyKey'], ['expectedVersion', 'reasonCode']);
  const actorUserId = requirePrincipalUserId(principal);
  const blockedUserId = requireStableId(payload.blockedUserId, 'blockedUserId');
  if (blockedUserId === actorUserId) validation([{ field: 'blockedUserId', rule: 'MUST_DIFFER_FROM_ACTOR' }]);
  if (payload.reasonCode !== undefined
      && !['HARASSMENT', 'SPAM', 'PRIVACY', 'OTHER'].includes(String(payload.reasonCode))) {
    validation([{ field: 'reasonCode', rule: 'ENUM' }]);
  }
  return idempotentMutation(dependencies, principal, 'block.create', requestId, payload, (state, now) => {
    requireActiveTargetUser(state, blockedUserId);
    let blockRecord = state.blocksReports.find((record) => record.recordType === 'BLOCK'
      && record.actorUserId === actorUserId && record.targetId === blockedUserId);
    const blockWasActive = blockRecord?.state === 'ACTIVE';

    if (blockRecord === undefined) {
      if (payload.expectedVersion !== undefined) validation([{ field: 'expectedVersion', rule: 'NOT_ALLOWED_FOR_NEW_BLOCK' }]);
      const blockId = dependencies.createId('block');
      blockRecord = {
        _id: blockId,
        blockId,
        recordType: 'BLOCK',
        actorUserId,
        targetId: blockedUserId,
        state: 'ACTIVE',
        ...(payload.reasonCode === undefined ? {} : { reasonCode: String(payload.reasonCode) }),
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      state.blocksReports.push(blockRecord);
    } else if (!blockWasActive) {
      ensureExpectedVersion(payload.expectedVersion, blockRecord.version);
      blockRecord.state = 'ACTIVE';
      if (payload.reasonCode === undefined) delete blockRecord.reasonCode;
      else blockRecord.reasonCode = String(payload.reasonCode);
      blockRecord.version += 1;
      blockRecord.updatedAt = now;
    } else {
      ensureExpectedVersion(payload.expectedVersion, blockRecord.version);
    }

    if (!blockWasActive) {
      appendInvalidation(state, {
        kind: 'RELATIONSHIP_CHANGED',
        sourceAggregateId: blockRecord._id,
        sourceVersion: blockRecord.version,
        occurredAt: now,
        reason: 'BLOCK_CREATED',
        requestId,
        createId: dependencies.createId,
      });
    }
    const friendship = findFriendshipByPair(state, actorUserId, blockedUserId);
    if (friendship !== undefined && (friendship.state === 'PENDING' || friendship.state === 'ACCEPTED')) {
      friendship.state = 'REMOVED';
      friendship.version += 1;
      friendship.updatedAt = now;
      appendInvalidation(state, {
        kind: 'RELATIONSHIP_CHANGED',
        sourceAggregateId: friendship._id,
        sourceVersion: friendship.version,
        occurredAt: now,
        reason: 'FRIENDSHIP_REMOVED_BY_BLOCK',
        requestId,
        createId: dependencies.createId,
      });
    }
    return {
      data: {
        blockedUserId: blockedUserId as UserId,
        createdAt: blockRecord.createdAt as UtcInstant,
        projectionDirty: true,
      },
      targetType: 'BLOCK',
      targetId: blockRecord._id,
    } as MutationResult;
  });
}

function removeBlock(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, ['blockedUserId', 'idempotencyKey'], ['expectedVersion']);
  const actorUserId = requirePrincipalUserId(principal);
  const blockedUserId = requireStableId(payload.blockedUserId, 'blockedUserId');
  return idempotentMutation(dependencies, principal, 'block.remove', requestId, payload, (state, now) => {
    const blockRecord = state.blocksReports.find((record) => record.recordType === 'BLOCK'
      && record.actorUserId === actorUserId && record.targetId === blockedUserId && record.state === 'ACTIVE');
    if (blockRecord === undefined) notFound('BLOCK');
    ensureExpectedVersion(payload.expectedVersion, blockRecord.version);
    blockRecord.state = 'REMOVED';
    blockRecord.version += 1;
    blockRecord.updatedAt = now;
    appendInvalidation(state, {
      kind: 'RELATIONSHIP_CHANGED',
      sourceAggregateId: blockRecord._id,
      sourceVersion: blockRecord.version,
      occurredAt: now,
      reason: 'BLOCK_REMOVED',
      requestId,
      createId: dependencies.createId,
    });
    return {
      data: {
        blockedUserId: blockedUserId as UserId,
        removedAt: now as UtcInstant,
        projectionDirty: true,
      },
      targetType: 'BLOCK',
      targetId: blockRecord._id,
    } as MutationResult;
  });
}

function createReport(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, [
    'targetType', 'targetId', 'reasonCode', 'evidenceAssetIds', 'idempotencyKey',
  ], ['description', 'expectedVersion']);
  if (!['USER', 'EVENT', 'CONTENT'].includes(String(payload.targetType))) {
    validation([{ field: 'targetType', rule: 'ENUM' }]);
  }
  if (!['HARASSMENT', 'SPAM', 'MISLEADING', 'RIGHTS', 'OTHER'].includes(String(payload.reasonCode))) {
    validation([{ field: 'reasonCode', rule: 'ENUM' }]);
  }
  const targetId = requireStableId(payload.targetId, 'targetId');
  const actorUserId = requirePrincipalUserId(principal);
  if (payload.expectedVersion !== undefined) {
    validation([{ field: 'expectedVersion', rule: 'NOT_ALLOWED_FOR_NEW_REPORT' }]);
  }
  if (payload.targetType === 'USER' && targetId === actorUserId) {
    validation([{ field: 'targetId', rule: 'MUST_DIFFER_FROM_ACTOR' }]);
  }
  if (!Array.isArray(payload.evidenceAssetIds)
      || payload.evidenceAssetIds.length > 5
      || !payload.evidenceAssetIds.every((id) => typeof id === 'string')) {
    validation([{ field: 'evidenceAssetIds', rule: 'ARRAY_MAX_5' }]);
  }
  const evidenceAssetIds = payload.evidenceAssetIds as string[];
  if (new Set(evidenceAssetIds).size !== evidenceAssetIds.length) {
    validation([{ field: 'evidenceAssetIds', rule: 'UNIQUE_ITEMS' }]);
  }
  const description = payload.description === undefined
    ? undefined
    : requireString(payload.description, 'description', { max: 1000 });
  return idempotentMutation(dependencies, principal, 'report.create', requestId, payload, (state, now) => {
    if (payload.targetType === 'USER') requireActiveTargetUser(state, targetId);
    const invalidEvidence = evidenceAssetIds.filter((assetId) => {
      const asset = state.mediaAssets.find((candidate) => candidate._id === assetId);
      return asset === undefined || asset.ownerUserId !== actorUserId || asset.uploadedAt === undefined
        || Date.parse(asset.uploadedAt) > Date.parse(asset.uploadExpiresAt);
    });
    if (invalidEvidence.length > 0) {
      validation([{ field: 'evidenceAssetIds', rule: 'PRIVATE_UPLOADED_OWNER_REQUIRED' }]);
    }
    const reportId = dependencies.createId('report');
    const record: BlockReportRecord = {
      _id: reportId,
      reportId,
      recordType: 'REPORT',
      actorUserId,
      targetId,
      targetType: payload.targetType as 'USER' | 'EVENT' | 'CONTENT',
      state: 'OPEN',
      reasonCode: String(payload.reasonCode),
      ...(description === undefined ? {} : { description }),
      evidenceAssetIds: clone(evidenceAssetIds),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    state.blocksReports.push(record);
    return {
      data: { report: reportProjection(record) },
      targetType: 'REPORT',
      targetId: reportId,
    } as MutationResult;
  });
}

async function tagCatalog(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, ['includeDisabled']);
  requirePrincipalUserId(principal);
  if (payload.includeDisabled !== false) invalidRequest('includeDisabled', 'MUST_BE_FALSE');
  return dependencies.repository.read((state) => ({
    labels: state.labels
      .filter((label) => label.enabled
        && (label.category === 'PUBLIC_IDENTITY_TAG' || label.category === 'PUBLIC_INTEREST_TAG'))
      .map(labelProjection),
  } as SocialResponseData));
}

function findOwnedVerification(
  state: Readonly<SocialState>,
  verificationRequestId: string,
  ownerUserId: string,
): SocialVerificationRequestRecord {
  const record = state.verificationRequests.find((candidate) => candidate._id === verificationRequestId
    && candidate.subjectUserId === ownerUserId);
  if (record === undefined) notFound('VERIFICATION_REQUEST', verificationRequestId);
  return record;
}

function findApplicationLabel(state: Readonly<SocialState>, labelId: string): SocialLabelRecord {
  const label = state.labels.find((candidate) => candidate._id === labelId && candidate.enabled);
  if (label === undefined) notFound('LABEL', labelId);
  if (label.category === 'PRIVATE_PREFERENCE') forbidden('PRIVATE_PREFERENCE_NOT_A_PUBLIC_VERIFICATION');
  if (label.category === 'SYSTEM_ROLE') forbidden('SYSTEM_ROLE_NOT_A_PERSONAL_HONOR');
  return label;
}

function createVerificationDraft(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, ['labelId', 'idempotencyKey'], ['expectedVersion']);
  const labelId = requireStableId(payload.labelId, 'labelId');
  const ownerUserId = requirePrincipalUserId(principal);
  return idempotentMutation(dependencies, principal, 'verification.createDraft', requestId, payload, (state, now) => {
    findApplicationLabel(state, labelId);
    const existing = state.verificationRequests.find((record) => record.subjectUserId === ownerUserId
      && record.labelId === labelId
      && ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES'].includes(record.status));
    if (existing !== undefined) {
      if (existing.status === 'DRAFT') {
        ensureExpectedVersion(payload.expectedVersion, existing.version);
        return {
          data: { request: verificationProjection(existing) },
          targetType: 'VERIFICATION_REQUEST',
          targetId: existing._id,
        } as MutationResult;
      }
      conflict('ACTIVE_VERIFICATION_CASE_EXISTS');
    }
    if (payload.expectedVersion !== undefined) validation([{ field: 'expectedVersion', rule: 'NOT_ALLOWED_FOR_NEW_DRAFT' }]);
    const verificationRequestId = dependencies.createId('verification');
    const record: SocialVerificationRequestRecord = {
      _id: verificationRequestId,
      verificationRequestId,
      subjectUserId: ownerUserId,
      labelId,
      status: 'DRAFT',
      evidenceAssetIds: [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    state.verificationRequests.push(record);
    return {
      data: { request: verificationProjection(record) },
      targetType: 'VERIFICATION_REQUEST',
      targetId: verificationRequestId,
    } as MutationResult;
  });
}

function issueUploadPolicy(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, [
    'verificationRequestId', 'mediaType', 'fileSizeBytes', 'sha256', 'idempotencyKey',
  ], ['expectedVersion']);
  const verificationRequestId = requireStableId(payload.verificationRequestId, 'verificationRequestId');
  if (payload.mediaType !== 'IMAGE' && payload.mediaType !== 'DOCUMENT') {
    validation([{ field: 'mediaType', rule: 'ENUM' }]);
  }
  if (!Number.isSafeInteger(payload.fileSizeBytes) || (payload.fileSizeBytes as number) < 1) {
    validation([{ field: 'fileSizeBytes', rule: 'POSITIVE_INTEGER' }]);
  }
  const sha256 = requireString(payload.sha256, 'sha256', { min: 64, max: 64, pattern: /^[a-f0-9]{64}$/i });
  const ownerUserId = requirePrincipalUserId(principal);
  return idempotentMutation(dependencies, principal, 'verification.uploadPolicy', requestId, payload, (state, now) => {
    const request = findOwnedVerification(state, verificationRequestId, ownerUserId);
    if (request.status !== 'DRAFT' && request.status !== 'NEEDS_CHANGES') {
      conflict('VERIFICATION_UPLOAD_STATE');
    }
    ensureExpectedVersion(payload.expectedVersion, request.version);
    const label = findApplicationLabel(state, request.labelId);
    const mediaType = payload.mediaType as EvidenceMediaType;
    if (!label.allowedMediaTypes.includes(mediaType)) {
      validation([{ field: 'mediaType', rule: 'NOT_ALLOWED_FOR_LABEL' }]);
    }
    if ((payload.fileSizeBytes as number) > label.maxFileBytes) {
      validation([{ field: 'fileSizeBytes', rule: 'EXCEEDS_LABEL_MAX_BYTES' }]);
    }
    const mediaAssetId = dependencies.createId('media');
    const uploadExpiresAt = new Date(Date.parse(now) + 10 * 60 * 1000).toISOString();
    const cloudPath = `private/verification/${opaqueToken()}/${mediaAssetId}`;
    const record: SocialMediaAssetRecord = {
      _id: mediaAssetId,
      mediaAssetId,
      ownerUserId,
      domain: 'VERIFICATION',
      verificationRequestId,
      mediaType,
      fileSizeBytes: payload.fileSizeBytes as number,
      sha256,
      storageFileId: cloudPath,
      uploadExpiresAt,
      publicState: 'PRIVATE',
      origin: 'SYNTHETIC',
      evidenceMode: 'DEMO_ONLY',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    state.mediaAssets.push(record);
    return {
      data: {
        mediaAssetId: mediaAssetId as MediaAssetId,
        cloudPath,
        uploadExpiresAt: uploadExpiresAt as UtcInstant,
        maxBytes: label.maxFileBytes,
      },
      targetType: 'MEDIA_ASSET',
      targetId: mediaAssetId,
    } as MutationResult;
  });
}

function submitVerification(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, [
    'verificationRequestId', 'evidenceAssetIds', 'userStatement', 'idempotencyKey',
  ], ['expectedVersion']);
  const verificationRequestId = requireStableId(payload.verificationRequestId, 'verificationRequestId');
  if (!Array.isArray(payload.evidenceAssetIds)
      || !payload.evidenceAssetIds.every((id) => typeof id === 'string')) {
    validation([{ field: 'evidenceAssetIds', rule: 'STRING_ARRAY' }]);
  }
  const evidenceAssetIds = payload.evidenceAssetIds as string[];
  if (new Set(evidenceAssetIds).size !== evidenceAssetIds.length) {
    validation([{ field: 'evidenceAssetIds', rule: 'UNIQUE_ITEMS' }]);
  }
  const userStatement = requireString(payload.userStatement, 'userStatement', { min: 10, max: 1000 });
  const ownerUserId = requirePrincipalUserId(principal);
  return idempotentMutation(dependencies, principal, 'verification.submit', requestId, payload, (state, now) => {
    const request = findOwnedVerification(state, verificationRequestId, ownerUserId);
    if (request.status !== 'DRAFT' && request.status !== 'NEEDS_CHANGES') {
      conflict('VERIFICATION_SUBMIT_STATE');
    }
    requireMutationExpectedVersion(payload.expectedVersion, request.version);
    const label = findApplicationLabel(state, request.labelId);
    if (evidenceAssetIds.length === 0) {
      throw new SafeApiError(ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, 'At least one private evidence item is required.', {
        details: { code: ApiErrorCode.REVIEW_EVIDENCE_REQUIRED, missingEvidenceKinds: ['PRIVATE_SUPPORTING_MATERIAL'] },
      });
    }
    if (evidenceAssetIds.length > label.maxEvidenceCount) {
      validation([{ field: 'evidenceAssetIds', rule: 'EXCEEDS_LABEL_MAX_COUNT' }]);
    }
    const invalidEvidence = evidenceAssetIds.filter((assetId) => {
      const asset = state.mediaAssets.find((candidate) => candidate._id === assetId);
      return asset === undefined
        || asset.ownerUserId !== ownerUserId
        || asset.domain !== 'VERIFICATION'
        || asset.verificationRequestId !== verificationRequestId
        || !isUtc(asset.uploadedAt)
        || !isUtc(asset.uploadExpiresAt)
        || Date.parse(asset.uploadedAt) > Date.parse(now)
        || Date.parse(asset.uploadedAt) > Date.parse(asset.uploadExpiresAt)
        || asset.publicState !== 'PRIVATE'
        || !asset.storageFileId.startsWith('private/verification/')
        || !label.allowedMediaTypes.includes(asset.mediaType)
        || asset.fileSizeBytes > label.maxFileBytes;
    });
    if (invalidEvidence.length > 0) mediaRightsRequired(invalidEvidence);
    request.status = 'SUBMITTED';
    request.evidenceAssetIds = clone(evidenceAssetIds);
    request.userStatement = userStatement;
    request.version += 1;
    request.updatedAt = now;
    appendInvalidation(state, {
      kind: 'VERIFICATION_CHANGED',
      sourceAggregateId: request._id,
      sourceVersion: request.version,
      occurredAt: now,
      reason: 'VERIFICATION_SUBMITTED',
      requestId,
      createId: dependencies.createId,
    });
    return {
      data: { request: verificationProjection(request) },
      targetType: 'VERIFICATION_REQUEST',
      targetId: request._id,
    } as MutationResult;
  });
}

async function listMyVerifications(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, ['limit'], ['cursor', 'status']);
  const limit = requireLimit(payload.limit);
  if (payload.status !== undefined && !Object.values(ReviewStatus).includes(payload.status as ReviewStatus)) {
    invalidRequest('status', 'REVIEW_STATUS');
  }
  const ownerUserId = requirePrincipalUserId(principal);
  return dependencies.repository.read((state) => {
    const items = state.verificationRequests
      .filter((record) => record.subjectUserId === ownerUserId
        && (payload.status === undefined || record.status === payload.status))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .map(verificationProjection);
    return {
      page: paginate(items, limit, payload.cursor, `verification:${ownerUserId}:${String(payload.status ?? '*')}`),
    } as SocialResponseData;
  });
}

async function getMyVerification(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, ['verificationRequestId']);
  const verificationRequestId = requireReadStableId(payload.verificationRequestId, 'verificationRequestId');
  const ownerUserId = requirePrincipalUserId(principal);
  return dependencies.repository.read((state) => ({
    request: verificationProjection(findOwnedVerification(state, verificationRequestId, ownerUserId)),
  } as SocialResponseData));
}

function withdrawVerification(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  exactPayload(payload, [
    'verificationRequestId', 'expectedVersion', 'idempotencyKey',
  ]);
  const verificationRequestId = requireStableId(payload.verificationRequestId, 'verificationRequestId');
  const ownerUserId = requirePrincipalUserId(principal);
  return idempotentMutation(dependencies, principal, 'verification.withdraw', requestId, payload, (state, now) => {
    const request = findOwnedVerification(state, verificationRequestId, ownerUserId);
    if (request.status !== 'DRAFT' && request.status !== 'SUBMITTED') {
      reviewTransition(request.status, 'PHYSICAL_WITHDRAWAL');
    }
    requireExpectedVersion(payload.expectedVersion as number, request.version);
    const deletedVersion = request.version;
    const previousStatus = request.status as 'DRAFT' | 'SUBMITTED';
    state.verificationRequests = state.verificationRequests.filter((candidate) => candidate._id !== request._id);
    appendInvalidation(state, {
      kind: 'VERIFICATION_CHANGED',
      sourceAggregateId: request._id,
      sourceVersion: deletedVersion,
      occurredAt: now,
      reason: 'VERIFICATION_REQUEST_WITHDRAWN',
      requestId,
      createId: dependencies.createId,
    });
    return {
      data: {
        withdrawal: {
          verificationRequestId: request._id as VerificationRequestId,
          previousStatus,
          deletedVersion: deletedVersion as OptimisticVersion,
          withdrawnAt: now as UtcInstant,
          deletionMode: 'PHYSICAL',
          projectionInvalidationAppended: true,
        },
      },
      targetType: 'VERIFICATION_REQUEST',
      targetId: request._id,
    } as MutationResult;
  });
}

async function dispatch(
  dependencies: RuntimeDependencies,
  principal: TrustedPrincipal,
  action: SocialAction,
  requestId: string,
  payload: Readonly<Record<string, unknown>>,
): Promise<SocialResponseData> {
  switch (action) {
    case 'friend.request': return requestFriend(dependencies, principal, requestId, payload);
    case 'friend.listIncoming': return listIncoming(dependencies, principal, payload);
    case 'friend.listAccepted': return listAccepted(dependencies, principal, payload);
    case 'friend.accept': return transitionFriendship(dependencies, principal, action, requestId, payload);
    case 'friend.reject': return transitionFriendship(dependencies, principal, action, requestId, payload);
    case 'friend.cancel': return transitionFriendship(dependencies, principal, action, requestId, payload);
    case 'friend.remove': return removeFriend(dependencies, principal, requestId, payload);
    case 'block.create': return createBlock(dependencies, principal, requestId, payload);
    case 'block.remove': return removeBlock(dependencies, principal, requestId, payload);
    case 'report.create': return createReport(dependencies, principal, requestId, payload);
    case 'tag.catalog': return tagCatalog(dependencies, principal, payload);
    case 'verification.createDraft': return createVerificationDraft(dependencies, principal, requestId, payload);
    case 'verification.uploadPolicy': return issueUploadPolicy(dependencies, principal, requestId, payload);
    case 'verification.submit': return submitVerification(dependencies, principal, requestId, payload);
    case 'verification.listMine': return listMyVerifications(dependencies, principal, payload);
    case 'verification.getMine': return getMyVerification(dependencies, principal, payload);
    case 'verification.withdraw': return withdrawVerification(dependencies, principal, requestId, payload);
  }
}

const fallbackEndpoint = createNotImplementedEndpoint('socialApi', ACTIONS);

export function createSocialApiEndpoint(input: SocialApiDependencies): SocialApiEndpoint {
  const dependencies: RuntimeDependencies = {
    repository: input.repository,
    getWxContext: input.getWxContext,
    loadPrincipal: input.loadPrincipal ?? ((openId) => input.repository.loadPrincipal(openId)),
    now: input.now ?? defaultNow,
    createId: input.createId ?? defaultCreateId,
  };
  return Object.freeze({
    actions: ACTIONS,
    writeGuardPlans: fallbackEndpoint.writeGuardPlans as Readonly<Record<string, unknown>>,
    main: async (event: unknown): Promise<ApiResult<SocialResponseData>> => {
      const fallbackRequestId = requestIdForFailure(event, dependencies.createId);
      try {
        const envelope = validateCallEnvelope(event, ACTIONS);
        const principal = await requireTrustedPrincipal(dependencies.getWxContext, dependencies.loadPrincipal);
        const data = await dispatch(
          dependencies,
          principal,
          envelope.action,
          envelope.requestId,
          envelope.payload,
        );
        return success(data, envelope.requestId);
      } catch (error) {
        return safeFailureFromError(
          fallbackRequestId,
          error instanceof Error ? error : new Error('Non-error thrown at socialApi boundary'),
        );
      }
    },
  });
}

/**
 * The repository is LOCAL_ONLY and has no configured CloudBase adapter/AppID.
 * Keep the frozen safe fallback as the deploy entry until integration supplies
 * an authorized transactional adapter. Tests exercise createSocialApiEndpoint.
 */
export const endpoint = fallbackEndpoint;
export const main = endpoint.main;
