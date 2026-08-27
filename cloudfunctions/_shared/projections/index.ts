import { ApiErrorCode } from '../../../miniprogram/shared/types/api';
import {
  EventState,
  FriendshipState,
  MediaRightsState,
  OperationalState,
  ProjectionInvalidationKind,
  PublicationState,
  RecordOrigin,
  ReviewStatus,
  VerificationState,
} from '../../../miniprogram/shared/types/enums';
import type {
  ProjectionInvalidationKind as ProjectionInvalidationKindValue,
} from '../../../miniprogram/shared/types/enums';
import type {
  ProjectionInvalidation,
  PublicEventProjection,
  PublicVerificationClaimProjection,
  ReviewCaseProjection,
  ViewerRelationshipProjection,
} from '../../../miniprogram/shared/types/projections';
import type {
  OptimisticVersion,
  ProjectionInvalidationId,
  RequestId,
  Sha256Digest,
  StableId,
  UtcInstant,
} from '../../../miniprogram/shared/types/primitives';
import { IanaTimezone } from '../../../miniprogram/shared/types/primitives';
import { CITY_DIRECTORY } from '../../../miniprogram/shared/constants/geography';
import type { BusinessCollection } from '../../../miniprogram/shared/contracts/action-registry';
import { SafeApiError } from '../errors';
import { isPlainRecord } from '../validation';

export type ReadOnlyProjectionKind =
  | 'ViewerRelationshipProjection'
  | 'PublicVerificationClaimProjection'
  | 'PublicEventProjection'
  | 'ReviewCaseProjection';

export interface ReadOnlyProjectionMap {
  readonly ViewerRelationshipProjection: ViewerRelationshipProjection;
  readonly PublicVerificationClaimProjection: PublicVerificationClaimProjection;
  readonly PublicEventProjection: PublicEventProjection;
  readonly ReviewCaseProjection: ReviewCaseProjection;
}

export interface ProjectionDirtyMarker {
  readonly dirty: true;
  readonly invalidationEventId: ProjectionInvalidationId;
  readonly requiredSourceVersion: OptimisticVersion;
  readonly dirtySince: UtcInstant;
}

export interface ProjectionReadState {
  readonly projectionType: ReadOnlyProjectionKind;
  readonly dirty: boolean;
  readonly projectedSourceVersion: number;
  readonly requiredSourceVersion: number;
  readonly sourceAllowsRead: boolean;
}

export interface ProjectionInvalidationWriter {
  add(input: { readonly data: Readonly<ProjectionInvalidation> }): Promise<{ readonly id: string }>;
}

type RevocationPatchField =
  | 'state'
  | 'recordType'
  | 'status'
  | 'reviewStatus'
  | 'operationalState'
  | 'publicationState'
  | 'mediaRightsState'
  | 'rights'
  | 'blocked'
  | 'publicVisible'
  | 'reservationAvailable';

type StrictRevocationPatch<Fields extends object> = Readonly<
  { readonly version: OptimisticVersion }
  & Fields
  & { readonly [Key in Exclude<RevocationPatchField, keyof Fields>]?: never }
>;

export type FriendshipRevocationPatch = StrictRevocationPatch<{
  readonly state:
    | typeof FriendshipState.REMOVED
    | typeof FriendshipState.CANCELLED
    | typeof FriendshipState.REJECTED;
}>;

export type BlockRevocationPatch = StrictRevocationPatch<{
  readonly recordType: 'BLOCK';
  readonly state: 'ACTIVE';
}>;

export type VerificationRequestRevocationPatch = StrictRevocationPatch<{
  readonly status:
    | typeof ReviewStatus.REJECTED
    | typeof ReviewStatus.EXPIRED
    | typeof ReviewStatus.REVOKED;
}>;

export type VerificationClaimRevocationPatch = StrictRevocationPatch<{
  readonly reviewStatus:
    | typeof ReviewStatus.REJECTED
    | typeof ReviewStatus.EXPIRED
    | typeof ReviewStatus.REVOKED;
  readonly publicVisible: false;
}>;

export type EventRevocationPatch = StrictRevocationPatch<{
  readonly state:
    | typeof EventState.CANCELLED
    | typeof EventState.PAUSED
    | typeof EventState.REJECTED;
  readonly reservationAvailable: false;
}>;

export type OrganizerRevocationPatch = StrictRevocationPatch<{
  readonly reviewStatus:
    | typeof ReviewStatus.REJECTED
    | typeof ReviewStatus.EXPIRED
    | typeof ReviewStatus.REVOKED;
}>;

export type ClubNodeRevocationPatch =
  | StrictRevocationPatch<{
      readonly operationalState:
        | typeof OperationalState.PAUSED
        | typeof OperationalState.DISABLED;
    }>
  | StrictRevocationPatch<{
      readonly reviewStatus:
        | typeof ReviewStatus.REJECTED
        | typeof ReviewStatus.EXPIRED
        | typeof ReviewStatus.REVOKED;
    }>;

export type ContentRevocationPatch = StrictRevocationPatch<{
  readonly publicationState:
    | typeof PublicationState.UNPUBLISHED
    | typeof PublicationState.REJECTED;
}>;

export interface RevokedMediaRights {
  readonly state:
    | typeof MediaRightsState.REJECTED
    | typeof MediaRightsState.EXPIRED
    | typeof MediaRightsState.REVOKED;
  readonly rightsHolderName: string;
  readonly sourceDescription: string;
  readonly permittedUses: readonly [];
  readonly reviewedAt: UtcInstant;
  readonly evidenceDigest?: Sha256Digest;
}

/** Revocation replaces the canonical `rights` object with zero permitted uses. */
export type MediaRevocationPatch = StrictRevocationPatch<{
  readonly rights: Readonly<RevokedMediaRights>;
}>;

export type ProjectionRevocationPatch =
  | FriendshipRevocationPatch
  | BlockRevocationPatch
  | VerificationRequestRevocationPatch
  | VerificationClaimRevocationPatch
  | EventRevocationPatch
  | OrganizerRevocationPatch
  | ClubNodeRevocationPatch
  | ContentRevocationPatch
  | MediaRevocationPatch;

type RevocationSource<Collection extends BusinessCollection, Patch extends ProjectionRevocationPatch> = Readonly<{
  readonly collection: Collection;
  readonly aggregateId: StableId;
  readonly expectedVersion: OptimisticVersion;
  readonly patch: Patch;
}>;

type InvalidationOf<Kind extends ProjectionInvalidationKindValue> = Readonly<
  Omit<ProjectionInvalidation, 'kind'> & { readonly kind: Kind }
>;

export type ProjectionRevocationInput =
  | {
      readonly kind: typeof ProjectionInvalidationKind.RELATIONSHIP_CHANGED;
      readonly source:
        | RevocationSource<'friendships', FriendshipRevocationPatch>
        | RevocationSource<'blocks_reports', BlockRevocationPatch>;
      readonly invalidation: InvalidationOf<typeof ProjectionInvalidationKind.RELATIONSHIP_CHANGED>;
    }
  | {
      readonly kind: typeof ProjectionInvalidationKind.VERIFICATION_CHANGED;
      readonly source:
        | RevocationSource<'verification_requests', VerificationRequestRevocationPatch>
        | RevocationSource<'verification_claims', VerificationClaimRevocationPatch>;
      readonly invalidation: InvalidationOf<typeof ProjectionInvalidationKind.VERIFICATION_CHANGED>;
    }
  | {
      readonly kind: typeof ProjectionInvalidationKind.EVENT_CHANGED;
      readonly source:
        | RevocationSource<'club_nodes', ClubNodeRevocationPatch>
        | RevocationSource<'organizers', OrganizerRevocationPatch>
        | RevocationSource<'events', EventRevocationPatch>;
      readonly invalidation: InvalidationOf<typeof ProjectionInvalidationKind.EVENT_CHANGED>;
    }
  | {
      readonly kind: typeof ProjectionInvalidationKind.CONTENT_CHANGED;
      readonly source:
        | RevocationSource<'art_items', ContentRevocationPatch>
        | RevocationSource<'art_collections', ContentRevocationPatch>;
      readonly invalidation: InvalidationOf<typeof ProjectionInvalidationKind.CONTENT_CHANGED>;
    }
  | {
      readonly kind: typeof ProjectionInvalidationKind.MEDIA_RIGHTS_CHANGED;
      readonly source: RevocationSource<'media_assets', MediaRevocationPatch>;
      readonly invalidation: InvalidationOf<typeof ProjectionInvalidationKind.MEDIA_RIGHTS_CHANGED>;
    };

export interface ProjectionRevocationTransaction {
  updateSource(input: ProjectionRevocationInput['source']): Promise<void>;
  appendInvalidation(
    invalidation: Readonly<ProjectionInvalidation>,
  ): Promise<{ readonly id: string }>;
}

export interface ProjectionTransactionRunner {
  runTransaction<Result>(
    operation: (transaction: ProjectionRevocationTransaction) => Promise<Result>,
  ): Promise<Result>;
}

const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PROJECTION_FIELDS = Object.freeze({
  ViewerRelationshipProjection: Object.freeze([
    'version', 'createdAt', 'updatedAt', 'viewerUserId', 'subjectUserId',
    'friendshipId', 'friendshipState', 'viewerBlockedSubject',
    'subjectBlockedViewer', 'mayViewFriendsOnlyFields', 'sourceVersion',
  ]),
  PublicVerificationClaimProjection: Object.freeze([
    'version', 'createdAt', 'updatedAt', 'claimId', 'subjectUserId', 'labelId',
    'labelText', 'reviewStatus', 'verificationState', 'publicVisible',
    'validFrom', 'validUntil',
  ]),
  PublicEventProjection: Object.freeze([
    'version', 'createdAt', 'updatedAt', 'eventId', 'clubNodeId', 'organizerId',
    'cityId', 'title', 'summary', 'startsAt', 'endsAt', 'timezone', 'state',
    'publicationState', 'reservationAvailable', 'coverAssetId', 'origin',
    'verificationState',
  ]),
  ReviewCaseProjection: Object.freeze([
    'version', 'createdAt', 'updatedAt', 'reviewCaseId', 'domain', 'aggregateId',
    'status', 'title', 'summary', 'submitterUserId', 'evidenceAssetIds',
    'assignedReviewerUserId',
  ]),
} satisfies Readonly<Record<ReadOnlyProjectionKind, readonly string[]>>);
const RELATIONSHIP_REVOCATION_STATES: readonly string[] = Object.freeze([
  FriendshipState.REMOVED, FriendshipState.CANCELLED, FriendshipState.REJECTED,
]);
const VERIFICATION_REVOCATION_STATES: readonly string[] = Object.freeze([
  ReviewStatus.REJECTED, ReviewStatus.EXPIRED, ReviewStatus.REVOKED,
]);
const EVENT_REVOCATION_STATES: readonly string[] = Object.freeze([
  EventState.CANCELLED, EventState.PAUSED, EventState.REJECTED,
]);
const CONTENT_REVOCATION_STATES: readonly string[] = Object.freeze([
  PublicationState.UNPUBLISHED, PublicationState.REJECTED,
]);
const MEDIA_REVOCATION_STATES: readonly string[] = Object.freeze([
  MediaRightsState.REJECTED, MediaRightsState.EXPIRED, MediaRightsState.REVOKED,
]);

function hasExactFields(record: Readonly<Record<string, unknown>>, fields: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const expected = [...fields].sort();
  return actual.length === expected.length && actual.every((field, index) => field === expected[index]);
}

function isRevokedMediaRights(value: unknown): value is Readonly<RevokedMediaRights> {
  if (!isPlainRecord(value)) return false;
  const hasRequiredFields = hasExactFields(value, [
    'state', 'rightsHolderName', 'sourceDescription', 'permittedUses', 'reviewedAt',
  ]);
  const hasRequiredFieldsAndDigest = hasExactFields(value, [
    'state', 'rightsHolderName', 'sourceDescription', 'permittedUses', 'reviewedAt',
    'evidenceDigest',
  ]);
  if (!hasRequiredFields && !hasRequiredFieldsAndDigest) return false;
  if (typeof value.state !== 'string' || !MEDIA_REVOCATION_STATES.includes(value.state)) return false;
  if (typeof value.rightsHolderName !== 'string' || value.rightsHolderName.length === 0) return false;
  if (typeof value.sourceDescription !== 'string' || value.sourceDescription.length === 0) return false;
  if (!Array.isArray(value.permittedUses) || value.permittedUses.length !== 0) return false;
  if (
    typeof value.reviewedAt !== 'string'
    || !UTC_PATTERN.test(value.reviewedAt)
    || Number.isNaN(Date.parse(value.reviewedAt))
  ) return false;
  return value.evidenceDigest === undefined
    || (typeof value.evidenceDigest === 'string' && SHA256_PATTERN.test(value.evidenceDigest));
}

function validateRevocationPolicy(
  kind: ProjectionInvalidationKindValue,
  collection: unknown,
  patch: Readonly<Record<string, unknown>>,
): void {
  let collectionAllowed = false;
  let patchAllowed = false;

  switch (kind) {
    case ProjectionInvalidationKind.RELATIONSHIP_CHANGED:
      if (collection === 'friendships') {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ['version', 'state'])
          && typeof patch.state === 'string'
          && RELATIONSHIP_REVOCATION_STATES.includes(patch.state);
      } else if (collection === 'blocks_reports') {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ['version', 'recordType', 'state'])
          && patch.recordType === 'BLOCK'
          && patch.state === 'ACTIVE';
      }
      break;
    case ProjectionInvalidationKind.VERIFICATION_CHANGED:
      if (collection === 'verification_requests') {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ['version', 'status'])
          && typeof patch.status === 'string'
          && VERIFICATION_REVOCATION_STATES.includes(patch.status);
      } else if (collection === 'verification_claims') {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ['version', 'reviewStatus', 'publicVisible'])
          && typeof patch.reviewStatus === 'string'
          && VERIFICATION_REVOCATION_STATES.includes(patch.reviewStatus)
          && patch.publicVisible === false;
      }
      break;
    case ProjectionInvalidationKind.EVENT_CHANGED:
      if (collection === 'events') {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ['version', 'state', 'reservationAvailable'])
          && typeof patch.state === 'string'
          && EVENT_REVOCATION_STATES.includes(patch.state)
          && patch.reservationAvailable === false;
      } else if (collection === 'organizers') {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ['version', 'reviewStatus'])
          && typeof patch.reviewStatus === 'string'
          && VERIFICATION_REVOCATION_STATES.includes(patch.reviewStatus);
      } else if (collection === 'club_nodes') {
        collectionAllowed = true;
        patchAllowed = (
          hasExactFields(patch, ['version', 'operationalState'])
          && (patch.operationalState === OperationalState.PAUSED
            || patch.operationalState === OperationalState.DISABLED)
        ) || (
          hasExactFields(patch, ['version', 'reviewStatus'])
          && typeof patch.reviewStatus === 'string'
          && VERIFICATION_REVOCATION_STATES.includes(patch.reviewStatus)
        );
      }
      break;
    case ProjectionInvalidationKind.CONTENT_CHANGED:
      if (collection === 'art_items' || collection === 'art_collections') {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ['version', 'publicationState'])
          && typeof patch.publicationState === 'string'
          && CONTENT_REVOCATION_STATES.includes(patch.publicationState);
      }
      break;
    case ProjectionInvalidationKind.MEDIA_RIGHTS_CHANGED:
      if (collection === 'media_assets') {
        collectionAllowed = true;
        patchAllowed = hasExactFields(patch, ['version', 'rights'])
          && isRevokedMediaRights(patch.rights);
      }
      break;
  }

  if (!collectionAllowed) throw new Error('Source collection is not allowed for invalidation kind');
  if (!patchAllowed) throw new Error('Revocation patch does not match the exact shape for invalidation kind');
}

function rejectUnexpectedFields(
  record: Readonly<Record<string, unknown>>,
  allowedFields: readonly string[],
  projectionType: string,
): void {
  const unexpected = Object.keys(record).filter((field) => !allowedFields.includes(field));
  if (unexpected.length > 0) {
    throw new Error(`${projectionType} contains forbidden fields: ${unexpected.sort().join(',')}`);
  }
}

function requireLocalizedName(record: Readonly<Record<string, unknown>>, field: string): void {
  const value = record[field];
  if (!isPlainRecord(value)) throw new Error(`Invalid ${field}`);
  rejectUnexpectedFields(value, ['zh', 'en'], field);
  requireString(value, 'zh');
  requireString(value, 'en');
}

function requireString(record: Readonly<Record<string, unknown>>, field: string): string {
  const value = record[field];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Invalid ${field}`);
  return value;
}

function requireBoolean(record: Readonly<Record<string, unknown>>, field: string): boolean {
  const value = record[field];
  if (typeof value !== 'boolean') throw new Error(`Invalid ${field}`);
  return value;
}

function requireOptionalString(record: Readonly<Record<string, unknown>>, field: string): void {
  const value = record[field];
  if (value !== undefined && (typeof value !== 'string' || value.length === 0)) {
    throw new Error(`Invalid ${field}`);
  }
}

function requireEnum(
  record: Readonly<Record<string, unknown>>,
  field: string,
  allowed: readonly string[],
): string {
  const value = requireString(record, field);
  if (!allowed.includes(value)) throw new Error(`Invalid ${field}`);
  return value;
}

function requireVersion(record: Readonly<Record<string, unknown>>, field = 'version'): number {
  const value = record[field];
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${field}`);
  return value;
}

function requireUtc(record: Readonly<Record<string, unknown>>, field: string): string {
  const value = requireString(record, field);
  if (!UTC_PATTERN.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`Invalid ${field}`);
  return value;
}

function cloneAndFreeze<T>(value: T): Readonly<T> {
  const clone = JSON.parse(JSON.stringify(value)) as T;
  const freeze = (candidate: object): void => {
    Object.values(candidate).forEach((child) => {
      if (child !== null && typeof child === 'object' && !Object.isFrozen(child)) freeze(child);
    });
    Object.freeze(candidate);
  };
  if (clone !== null && typeof clone === 'object') freeze(clone);
  return clone;
}

function validateVersioned(record: Readonly<Record<string, unknown>>): void {
  requireVersion(record);
  const createdAt = requireUtc(record, 'createdAt');
  const updatedAt = requireUtc(record, 'updatedAt');
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw new Error('updatedAt must not precede createdAt');
}

function validateRelationship(record: Readonly<Record<string, unknown>>): void {
  validateVersioned(record);
  requireString(record, 'viewerUserId');
  requireString(record, 'subjectUserId');
  requireOptionalString(record, 'friendshipId');
  requireBoolean(record, 'viewerBlockedSubject');
  requireBoolean(record, 'subjectBlockedViewer');
  requireBoolean(record, 'mayViewFriendsOnlyFields');
  requireVersion(record, 'sourceVersion');
  const state = record.friendshipState;
  const allowed = Object.values(FriendshipState);
  if (state !== undefined && (typeof state !== 'string' || !allowed.includes(state as (typeof allowed)[number]))) {
    throw new Error('Invalid friendshipState');
  }
  if ((record.viewerBlockedSubject === true || record.subjectBlockedViewer === true)
      && record.mayViewFriendsOnlyFields === true) {
    throw new Error('Blocked relationships cannot grant friend visibility');
  }
  if (record.mayViewFriendsOnlyFields === true && record.friendshipState !== FriendshipState.ACCEPTED) {
    throw new Error('Friends-only visibility requires an accepted friendship');
  }
}

function validatePublicClaim(record: Readonly<Record<string, unknown>>): void {
  validateVersioned(record);
  requireString(record, 'claimId');
  requireString(record, 'subjectUserId');
  requireString(record, 'labelId');
  requireLocalizedName(record, 'labelText');
  requireUtc(record, 'validFrom');
  if (record.validUntil !== undefined) requireUtc(record, 'validUntil');
  if (typeof record.validUntil === 'string'
      && Date.parse(record.validUntil) <= Date.parse(record.validFrom as string)) {
    throw new Error('validUntil must be after validFrom');
  }
  if (record.reviewStatus !== ReviewStatus.APPROVED
      || record.verificationState !== VerificationState.HUMAN_REVIEWED
      || record.publicVisible !== true) {
    throw new Error('Only active human-approved claims are public projections');
  }
}

export function assertVerificationClaimEffective(
  claim: Readonly<PublicVerificationClaimProjection>,
  evaluatedAt: string,
): void {
  if (!UTC_PATTERN.test(evaluatedAt) || Number.isNaN(Date.parse(evaluatedAt))) {
    throw new Error('Invalid evaluation instant');
  }
  const instant = Date.parse(evaluatedAt);
  const starts = Date.parse(claim.validFrom);
  const ends = claim.validUntil === undefined ? Number.POSITIVE_INFINITY : Date.parse(claim.validUntil);
  if (claim.reviewStatus !== ReviewStatus.APPROVED
      || claim.verificationState !== VerificationState.HUMAN_REVIEWED
      || !claim.publicVisible
      || instant < starts
      || instant >= ends) {
    throw new SafeApiError(ApiErrorCode.ELIGIBILITY_NOT_MET, 'The verification claim is not effective.', {
      details: { code: ApiErrorCode.ELIGIBILITY_NOT_MET, missingLabelIds: [claim.labelId] },
    });
  }
}

function validatePublicEvent(record: Readonly<Record<string, unknown>>): void {
  validateVersioned(record);
  requireString(record, 'eventId');
  requireString(record, 'clubNodeId');
  requireString(record, 'organizerId');
  requireString(record, 'cityId');
  requireString(record, 'title');
  requireString(record, 'summary');
  const startsAt = requireUtc(record, 'startsAt');
  const endsAt = requireUtc(record, 'endsAt');
  if (Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('endsAt must be after startsAt');
  const timezone = requireEnum(record, 'timezone', Object.values(IanaTimezone));
  const city = CITY_DIRECTORY.find((entry) => entry.id === record.cityId);
  if (city === undefined || city.timezone !== timezone) {
    throw new Error('Event timezone must match the frozen city directory');
  }
  requireEnum(record, 'state', Object.values(EventState));
  requireEnum(record, 'publicationState', Object.values(PublicationState));
  requireBoolean(record, 'reservationAvailable');
  requireOptionalString(record, 'coverAssetId');
  requireEnum(record, 'origin', Object.values(RecordOrigin));
  requireEnum(record, 'verificationState', Object.values(VerificationState));
  if (record.state !== EventState.PUBLISHED || record.publicationState !== PublicationState.PUBLISHED) {
    if (record.reservationAvailable === true) throw new Error('Unavailable events cannot be reservable');
  }
}

function validateReviewCase(record: Readonly<Record<string, unknown>>): void {
  validateVersioned(record);
  requireString(record, 'reviewCaseId');
  requireEnum(record, 'domain', ['SOCIAL', 'EVENT', 'CONTENT', 'ORGANIZER', 'REPORT']);
  requireString(record, 'aggregateId');
  requireEnum(record, 'status', Object.values(ReviewStatus));
  requireString(record, 'title');
  requireString(record, 'summary');
  requireOptionalString(record, 'submitterUserId');
  requireOptionalString(record, 'assignedReviewerUserId');
  if (!Array.isArray(record.evidenceAssetIds)
      || !record.evidenceAssetIds.every((assetId) => typeof assetId === 'string' && assetId.length > 0)) {
    throw new Error('Invalid evidenceAssetIds');
  }
}

export function parseReadOnlyProjection<Kind extends ReadOnlyProjectionKind>(
  kind: Kind,
  value: unknown,
): Readonly<ReadOnlyProjectionMap[Kind]> {
  if (!isPlainRecord(value)) throw new Error(`Invalid ${kind}`);
  rejectUnexpectedFields(value, PROJECTION_FIELDS[kind], kind);
  switch (kind) {
    case 'ViewerRelationshipProjection': validateRelationship(value); break;
    case 'PublicVerificationClaimProjection': validatePublicClaim(value); break;
    case 'PublicEventProjection': validatePublicEvent(value); break;
    case 'ReviewCaseProjection': validateReviewCase(value); break;
  }
  return cloneAndFreeze(value as unknown as ReadOnlyProjectionMap[Kind]);
}

export function createProjectionInvalidation(input: {
  readonly eventId: string;
  readonly kind: ProjectionInvalidationKindValue;
  readonly sourceAggregateId: string;
  readonly sourceVersion: number;
  readonly occurredAt: string;
  readonly reason: string;
  readonly requestId: string;
}): Readonly<ProjectionInvalidation> {
  if (!STABLE_ID_PATTERN.test(input.eventId)
      || !STABLE_ID_PATTERN.test(input.sourceAggregateId)
      || !STABLE_ID_PATTERN.test(input.requestId)
      || !Number.isSafeInteger(input.sourceVersion)
      || input.sourceVersion < 1
      || !UTC_PATTERN.test(input.occurredAt)
      || Number.isNaN(Date.parse(input.occurredAt))
      || input.reason.trim().length === 0
      || input.reason.length > 240
      || !Object.values(ProjectionInvalidationKind).includes(input.kind)) {
    throw new Error('Invalid ProjectionInvalidation');
  }
  return Object.freeze({
    eventId: input.eventId as ProjectionInvalidationId,
    kind: input.kind,
    sourceAggregateId: input.sourceAggregateId as StableId,
    sourceVersion: input.sourceVersion as OptimisticVersion,
    occurredAt: input.occurredAt as UtcInstant,
    reason: input.reason,
    requestId: input.requestId as RequestId,
  });
}

export function markProjectionDirty(
  invalidation: Readonly<ProjectionInvalidation>,
): Readonly<ProjectionDirtyMarker> {
  return Object.freeze({
    dirty: true,
    invalidationEventId: invalidation.eventId,
    requiredSourceVersion: invalidation.sourceVersion,
    dirtySince: invalidation.occurredAt,
  });
}

export function assertProjectionReadable(state: ProjectionReadState): void {
  const invalidFields: { readonly field: string; readonly rule: string }[] = [];
  if (typeof state.dirty !== 'boolean') invalidFields.push({ field: 'dirty', rule: 'BOOLEAN' });
  if (typeof state.sourceAllowsRead !== 'boolean') invalidFields.push({ field: 'sourceAllowsRead', rule: 'BOOLEAN' });
  if (!Number.isSafeInteger(state.projectedSourceVersion) || state.projectedSourceVersion < 1) {
    invalidFields.push({ field: 'projectedSourceVersion', rule: 'POSITIVE_SAFE_INTEGER' });
  }
  if (!Number.isSafeInteger(state.requiredSourceVersion) || state.requiredSourceVersion < 1) {
    invalidFields.push({ field: 'requiredSourceVersion', rule: 'POSITIVE_SAFE_INTEGER' });
  }
  if (invalidFields.length > 0) {
    throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, 'Projection read state is malformed.', {
      details: { code: ApiErrorCode.VALIDATION_FAILED, issues: invalidFields },
    });
  }
  if (state.dirty || state.projectedSourceVersion < state.requiredSourceVersion) {
    throw new SafeApiError(ApiErrorCode.PROJECTION_STALE, 'The projection is stale and cannot grant access.', {
      details: {
        code: ApiErrorCode.PROJECTION_STALE,
        projectionType: state.projectionType,
        requiredSourceVersion: state.requiredSourceVersion as OptimisticVersion,
      },
    });
  }
  if (!state.sourceAllowsRead) {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'The authoritative source denies this read.', {
      details: { code: ApiErrorCode.FORBIDDEN, policy: 'AUTHORITATIVE_SOURCE_DENY' },
    });
  }
}

export async function appendProjectionInvalidation(
  writer: ProjectionInvalidationWriter,
  invalidation: Readonly<ProjectionInvalidation>,
): Promise<string> {
  const result = await writer.add({ data: invalidation });
  return result.id;
}

/**
 * The runner must bind the callback to one real database transaction. Both the
 * authoritative revocation and invalidation append receive only that transaction
 * capability, so callers cannot claim atomicity with matching string identifiers.
 */
export async function revokeAccessAndInvalidateAtomically(
  runner: ProjectionTransactionRunner,
  input: ProjectionRevocationInput,
): Promise<string> {
  if (typeof runner.runTransaction !== 'function') {
    throw new Error('A real transaction runner is required');
  }
  if (!isPlainRecord(input)) throw new Error('Invalid revocation input');
  rejectUnexpectedFields(input, ['kind', 'source', 'invalidation'], 'ProjectionRevocationInput');
  const { kind, source, invalidation } = input;
  if (!isPlainRecord(source)) throw new Error('Invalid revocation source');
  rejectUnexpectedFields(source, ['collection', 'aggregateId', 'expectedVersion', 'patch'], 'ProjectionRevocationSource');
  if (!isPlainRecord(invalidation)) throw new Error('Invalid projection invalidation');
  rejectUnexpectedFields(invalidation, [
    'eventId', 'kind', 'sourceAggregateId', 'sourceVersion', 'occurredAt', 'reason', 'requestId',
  ], 'ProjectionInvalidation');
  if (kind !== invalidation.kind) throw new Error('Input kind must equal invalidation kind');
  const validatedInvalidation = createProjectionInvalidation({
    eventId: invalidation.eventId,
    kind: invalidation.kind,
    sourceAggregateId: invalidation.sourceAggregateId,
    sourceVersion: invalidation.sourceVersion,
    occurredAt: invalidation.occurredAt,
    reason: invalidation.reason,
    requestId: invalidation.requestId,
  });
  if (source.aggregateId !== validatedInvalidation.sourceAggregateId) {
    throw new Error('Revocation source and invalidation must reference the same aggregate');
  }
  if (!Number.isSafeInteger(source.expectedVersion) || source.expectedVersion < 1) {
    throw new Error('expectedVersion must be a positive safe integer');
  }
  if (!isPlainRecord(source.patch)) throw new Error('Invalid revocation patch');
  const patch = source.patch;
  validateRevocationPolicy(kind, source.collection, patch);
  const patchVersion = patch.version;
  if (!Number.isSafeInteger(patchVersion)
      || patchVersion !== source.expectedVersion + 1
      || validatedInvalidation.sourceVersion !== patchVersion) {
    throw new Error('Revocation and invalidation versions must equal expectedVersion + 1');
  }
  return runner.runTransaction(async (transaction) => {
    if (typeof transaction.updateSource !== 'function'
        || typeof transaction.appendInvalidation !== 'function') {
      throw new Error('Invalid projection transaction capability');
    }
    await transaction.updateSource(source);
    const result = await transaction.appendInvalidation(validatedInvalidation);
    return result.id;
  });
}
