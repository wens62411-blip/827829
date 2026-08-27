import type { CloudAction } from '../../miniprogram/shared/contracts';
import {
  EventState,
  MediaRightsState,
  PublicationState,
  RecordOrigin,
  ReviewStatus,
  VerificationState,
} from '../../miniprogram/shared/types/enums';
import type {
  AuditEntryProjection,
  PublicContentProjection,
  PublicEventProjection,
  PublicOrganizerProjection,
  PublicVerificationClaimProjection,
  ReportProjection,
  ReviewCaseProjection,
} from '../../miniprogram/shared/types/projections';
import type {
  CollectionId,
  MediaAssetId,
  OptimisticVersion,
  PaginationCursor,
  StableId,
  UserId,
  UtcInstant,
  VerificationClaimId,
} from '../../miniprogram/shared/types/primitives';
import { isPlainRecord } from '../_shared/validation';
import { parseReadOnlyProjection } from '../_shared/projections';
import type { CursorResult } from './model';
import { isStrictUtcInstant } from './time';

const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const CURSOR_PATTERN = /^[A-Za-z0-9._~:-]{1,512}$/;
const ACTION_PATTERN = /^[A-Za-z][A-Za-z0-9._:-]{0,99}$/;
const CODE_PATTERN = /^[A-Z][A-Z0-9_:-]{0,63}$/;
const TARGET_TYPE_PATTERN = /^[A-Za-z][A-Za-z0-9_:-]{0,63}$/;
const MATERIAL_LOCATOR_PATTERN = /(?:[a-z][a-z0-9+.-]*:\/\/|(?:blob|data):|\/\/[A-Za-z0-9])/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;

function fail(type: string): never {
  throw new Error(`Invalid ${type} returned by admin repository adapter`);
}

function exactRecord(
  value: unknown,
  type: string,
  required: readonly string[],
  optional: readonly string[] = [],
): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) fail(type);
  const keys = Object.keys(value);
  if (required.some((field) => !Object.prototype.hasOwnProperty.call(value, field))
      || keys.some((field) => !required.includes(field) && !optional.includes(field))) fail(type);
  return value;
}

function stringField(record: Readonly<Record<string, unknown>>, field: string, type: string): string {
  const value = record[field];
  if (typeof value !== 'string'
      || value.length === 0
      || value.length > 1000
      || value !== value.trim()
      || CONTROL_CHARACTER_PATTERN.test(value)
      || MATERIAL_LOCATOR_PATTERN.test(value)) fail(type);
  return value;
}

function idValue(value: unknown, type: string): string {
  if (typeof value !== 'string' || !STABLE_ID_PATTERN.test(value)) fail(type);
  return value;
}

function idField(record: Readonly<Record<string, unknown>>, field: string, type: string): string {
  return idValue(record[field], type);
}

function patternField(
  record: Readonly<Record<string, unknown>>,
  field: string,
  pattern: Readonly<RegExp>,
  type: string,
): string {
  const value = stringField(record, field, type);
  if (!pattern.test(value)) fail(type);
  return value;
}

function optionalString(
  record: Readonly<Record<string, unknown>>,
  field: string,
  type: string,
): string | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  return stringField(record, field, type);
}

function utcField(record: Readonly<Record<string, unknown>>, field: string, type: string): UtcInstant {
  const value = stringField(record, field, type);
  if (!isStrictUtcInstant(value)) fail(type);
  return value as UtcInstant;
}

function versionField(
  record: Readonly<Record<string, unknown>>,
  field: string,
  type: string,
): OptimisticVersion {
  const value = record[field];
  if (!Number.isSafeInteger(value) || (value as number) < 1) fail(type);
  return value as OptimisticVersion;
}

function versionedFields(
  record: Readonly<Record<string, unknown>>,
  type: string,
): Readonly<{
  readonly version: OptimisticVersion;
  readonly createdAt: UtcInstant;
  readonly updatedAt: UtcInstant;
}> {
  const version = versionField(record, 'version', type);
  const createdAt = utcField(record, 'createdAt', type);
  const updatedAt = utcField(record, 'updatedAt', type);
  if (Date.parse(updatedAt) < Date.parse(createdAt)) fail(type);
  return Object.freeze({ version, createdAt, updatedAt });
}

function enumField<T extends string>(
  record: Readonly<Record<string, unknown>>,
  field: string,
  allowed: readonly T[],
  type: string,
): T {
  const value = stringField(record, field, type);
  if (!allowed.includes(value as T)) fail(type);
  return value as T;
}

function localizedName(
  value: unknown,
  type: string,
): Readonly<{ readonly zh: string; readonly en: string }> {
  const record = exactRecord(value, type, ['zh', 'en']);
  return Object.freeze({
    zh: stringField(record, 'zh', type),
    en: stringField(record, 'en', type),
  });
}

export function sanitizeReviewCase(value: unknown): Readonly<ReviewCaseProjection> {
  const parsed = parseReadOnlyProjection('ReviewCaseProjection', value);
  idValue(parsed.reviewCaseId, 'ReviewCaseProjection');
  idValue(parsed.aggregateId, 'ReviewCaseProjection');
  stringField(parsed as unknown as Readonly<Record<string, unknown>>, 'title', 'ReviewCaseProjection');
  stringField(parsed as unknown as Readonly<Record<string, unknown>>, 'summary', 'ReviewCaseProjection');
  parsed.evidenceAssetIds.forEach((assetId) => idValue(assetId, 'ReviewCaseProjection'));
  if (parsed.submitterUserId !== undefined) idValue(parsed.submitterUserId, 'ReviewCaseProjection');
  if (parsed.assignedReviewerUserId !== undefined) idValue(parsed.assignedReviewerUserId, 'ReviewCaseProjection');
  if (!isStrictUtcInstant(parsed.createdAt) || !isStrictUtcInstant(parsed.updatedAt)) {
    fail('ReviewCaseProjection');
  }
  return parsed;
}

export function sanitizePublicEvent(value: unknown): Readonly<PublicEventProjection> {
  const parsed = parseReadOnlyProjection('PublicEventProjection', value);
  [parsed.eventId, parsed.clubNodeId, parsed.organizerId, parsed.cityId]
    .forEach((identifier) => idValue(identifier, 'PublicEventProjection'));
  if (parsed.coverAssetId !== undefined) idValue(parsed.coverAssetId, 'PublicEventProjection');
  if (![parsed.createdAt, parsed.updatedAt, parsed.startsAt, parsed.endsAt].every(isStrictUtcInstant)) {
    fail('PublicEventProjection');
  }
  const record = parsed as unknown as Readonly<Record<string, unknown>>;
  stringField(record, 'title', 'PublicEventProjection');
  stringField(record, 'summary', 'PublicEventProjection');
  return parsed;
}

export function sanitizePublicVerificationClaim(
  value: unknown,
): Readonly<PublicVerificationClaimProjection> {
  const parsed = parseReadOnlyProjection('PublicVerificationClaimProjection', value);
  [parsed.claimId, parsed.subjectUserId, parsed.labelId]
    .forEach((identifier) => idValue(identifier, 'PublicVerificationClaimProjection'));
  if (![parsed.createdAt, parsed.updatedAt, parsed.validFrom].every(isStrictUtcInstant)
      || (parsed.validUntil !== undefined && !isStrictUtcInstant(parsed.validUntil))) {
    fail('PublicVerificationClaimProjection');
  }
  stringField(
    parsed.labelText as unknown as Readonly<Record<string, unknown>>,
    'zh',
    'PublicVerificationClaimProjection.labelText',
  );
  stringField(
    parsed.labelText as unknown as Readonly<Record<string, unknown>>,
    'en',
    'PublicVerificationClaimProjection.labelText',
  );
  return parsed;
}

export function sanitizeReport(value: unknown): Readonly<ReportProjection> {
  const type = 'ReportProjection';
  const record = exactRecord(value, type, [
    'reportId', 'targetType', 'targetId', 'status', 'reasonCode',
    'version', 'createdAt', 'updatedAt',
  ]);
  const versioned = versionedFields(record, type);
  return Object.freeze({
    reportId: idField(record, 'reportId', type) as ReportProjection['reportId'],
    targetType: enumField(record, 'targetType', ['USER', 'EVENT', 'CONTENT'], type),
    targetId: idField(record, 'targetId', type) as StableId,
    status: enumField(record, 'status', ['OPEN', 'RESOLVED', 'DISMISSED'], type),
    reasonCode: patternField(record, 'reasonCode', CODE_PATTERN, type),
    ...versioned,
  });
}

export function sanitizeAuditEntry(value: unknown): Readonly<AuditEntryProjection> {
  const type = 'AuditEntryProjection';
  const record = exactRecord(value, type, [
    'auditEntryId', 'actorRole', 'action', 'targetType', 'targetId',
    'requestId', 'occurredAt', 'result',
  ], ['actorUserId', 'reasonCode']);
  const actorUserId = optionalString(record, 'actorUserId', type);
  const reasonCode = optionalString(record, 'reasonCode', type);
  return Object.freeze({
    auditEntryId: idField(record, 'auditEntryId', type) as AuditEntryProjection['auditEntryId'],
    ...(actorUserId === undefined ? {} : { actorUserId: idValue(actorUserId, type) as UserId }),
    actorRole: enumField(record, 'actorRole', ['SYSTEM', 'MEMBER', 'ORGANIZER', 'REVIEWER', 'ADMIN'], type),
    action: patternField(record, 'action', ACTION_PATTERN, type),
    targetType: patternField(record, 'targetType', TARGET_TYPE_PATTERN, type),
    targetId: idField(record, 'targetId', type) as StableId,
    requestId: patternField(record, 'requestId', REQUEST_ID_PATTERN, type) as AuditEntryProjection['requestId'],
    occurredAt: utcField(record, 'occurredAt', type),
    result: enumField(record, 'result', ['SUCCEEDED', 'FAILED'], type),
    ...(reasonCode === undefined ? {} : {
      reasonCode: patternField(record, 'reasonCode', CODE_PATTERN, type),
    }),
  });
}

export function sanitizePublicOrganizer(value: unknown): Readonly<PublicOrganizerProjection> {
  const type = 'PublicOrganizerProjection';
  const record = exactRecord(value, type, [
    'organizerId', 'name', 'summary', 'cityIds', 'reviewStatus', 'verificationState',
    'version', 'createdAt', 'updatedAt',
  ]);
  if (!Array.isArray(record.cityIds)
      || record.cityIds.length === 0
      || !record.cityIds.every((cityId) => typeof cityId === 'string' && cityId.length > 0)) fail(type);
  if (record.reviewStatus !== ReviewStatus.APPROVED
      || record.verificationState !== VerificationState.HUMAN_REVIEWED) fail(type);
  const versioned = versionedFields(record, type);
  return Object.freeze({
    organizerId: idField(record, 'organizerId', type) as PublicOrganizerProjection['organizerId'],
    name: localizedName(record.name, `${type}.name`),
    summary: stringField(record, 'summary', type),
    cityIds: Object.freeze(record.cityIds.map((cityId) => idValue(cityId, type))) as PublicOrganizerProjection['cityIds'],
    reviewStatus: ReviewStatus.APPROVED,
    verificationState: VerificationState.HUMAN_REVIEWED,
    ...versioned,
  });
}

export function sanitizePublicContent(value: unknown): Readonly<PublicContentProjection> {
  const type = 'PublicContentProjection';
  const record = exactRecord(value, type, [
    'contentId', 'creatorId', 'title', 'summary', 'category', 'publicationState',
    'mediaRightsState', 'origin', 'verificationState', 'version', 'createdAt', 'updatedAt',
  ], ['collectionId', 'coverAssetId']);
  const collectionId = optionalString(record, 'collectionId', type);
  const coverAssetId = optionalString(record, 'coverAssetId', type);
  const versioned = versionedFields(record, type);
  return Object.freeze({
    contentId: idField(record, 'contentId', type) as PublicContentProjection['contentId'],
    ...(collectionId === undefined ? {} : { collectionId: idValue(collectionId, type) as CollectionId }),
    creatorId: idField(record, 'creatorId', type) as PublicContentProjection['creatorId'],
    title: stringField(record, 'title', type),
    summary: stringField(record, 'summary', type),
    category: enumField(record, 'category', ['ART', 'ANTIQUE', 'JEWELRY'], type),
    publicationState: enumField(record, 'publicationState', Object.values(PublicationState), type),
    ...(coverAssetId === undefined ? {} : { coverAssetId: idValue(coverAssetId, type) as MediaAssetId }),
    mediaRightsState: enumField(record, 'mediaRightsState', Object.values(MediaRightsState), type),
    origin: enumField(record, 'origin', Object.values(RecordOrigin), type),
    verificationState: enumField(record, 'verificationState', Object.values(VerificationState), type),
    ...versioned,
  });
}

function exactResponse(value: unknown, action: CloudAction, keys: readonly string[]): Readonly<Record<string, unknown>> {
  return exactRecord(value, `${action} idempotency result`, keys);
}

export function sanitizeCaseMutationResponse(
  action: CloudAction,
  value: unknown,
): Readonly<Record<string, unknown>> {
  switch (action) {
    case 'review.approve':
    case 'review.reject':
    case 'review.revoke': {
      const record = exactResponse(value, action, ['reviewCase', 'projectionInvalidated']);
      if (record.projectionInvalidated !== true) fail(`${action} idempotency result`);
      return Object.freeze({ reviewCase: sanitizeReviewCase(record.reviewCase), projectionInvalidated: true });
    }
    case 'review.requestChanges': {
      const record = exactResponse(value, action, ['reviewCase']);
      return Object.freeze({ reviewCase: sanitizeReviewCase(record.reviewCase) });
    }
    case 'organizer.review': {
      const record = exactResponse(value, action, ['reviewCase', 'organizer']);
      return Object.freeze({
        reviewCase: sanitizeReviewCase(record.reviewCase),
        organizer: sanitizePublicOrganizer(record.organizer),
      });
    }
    case 'event.review': {
      const record = exactResponse(value, action, ['reviewCase', 'event']);
      return Object.freeze({
        reviewCase: sanitizeReviewCase(record.reviewCase),
        event: sanitizePublicEvent(record.event),
      });
    }
    case 'content.review': {
      const record = exactResponse(value, action, ['reviewCase', 'content']);
      return Object.freeze({
        reviewCase: sanitizeReviewCase(record.reviewCase),
        content: sanitizePublicContent(record.content),
      });
    }
    default:
      fail(`${action} idempotency result`);
  }
}

export function sanitizeReportResolveResponse(value: unknown): Readonly<Record<string, unknown>> {
  const record = exactRecord(value, 'report.resolve idempotency result', ['report']);
  return Object.freeze({ report: sanitizeReport(record.report) });
}

export function assertPublishedEventSafety(event: Readonly<PublicEventProjection>): void {
  if (event.state !== EventState.PUBLISHED || event.publicationState !== PublicationState.PUBLISHED) {
    if (event.reservationAvailable) fail('PublicEventProjection availability');
  }
}

export function sanitizeVerificationClaimRevocation(value: unknown): Readonly<{
  readonly reviewCaseId: ReviewCaseProjection['reviewCaseId'];
  readonly source: Readonly<{
    readonly collection: 'verification_claims';
    readonly aggregateId: VerificationClaimId;
    readonly expectedVersion: OptimisticVersion;
    readonly patch: Readonly<{
      readonly version: OptimisticVersion;
      readonly reviewStatus: 'REVOKED';
      readonly publicVisible: false;
    }>;
  }>;
}> {
  const type = 'VerificationClaimRevocationProof';
  const record = exactRecord(value, type, ['reviewCaseId', 'source']);
  const source = exactRecord(record.source, `${type}.source`, [
    'collection', 'aggregateId', 'expectedVersion', 'patch',
  ]);
  const patch = exactRecord(source.patch, `${type}.source.patch`, [
    'version', 'reviewStatus', 'publicVisible',
  ]);
  const expectedVersion = versionField(source, 'expectedVersion', type);
  const version = versionField(patch, 'version', type);
  if (source.collection !== 'verification_claims'
      || patch.reviewStatus !== ReviewStatus.REVOKED
      || patch.publicVisible !== false
      || version !== expectedVersion + 1) fail(type);
  return Object.freeze({
    reviewCaseId: idField(record, 'reviewCaseId', type) as ReviewCaseProjection['reviewCaseId'],
    source: Object.freeze({
      collection: 'verification_claims',
      aggregateId: idField(source, 'aggregateId', type) as VerificationClaimId,
      expectedVersion,
      patch: Object.freeze({
        version,
        reviewStatus: ReviewStatus.REVOKED,
        publicVisible: false,
      }),
    }),
  });
}

export function sanitizeCursorResult<T>(
  value: unknown,
  limit: number,
  itemSanitizer: (item: unknown) => T,
): Readonly<CursorResult<T>> {
  const type = 'CursorResult';
  const record = exactRecord(value, type, ['items', 'hasMore'], ['nextCursor']);
  if (!Array.isArray(record.items)
      || record.items.length > limit
      || typeof record.hasMore !== 'boolean') fail(type);
  const nextCursor = record.nextCursor;
  if (nextCursor !== undefined
      && (typeof nextCursor !== 'string' || !CURSOR_PATTERN.test(nextCursor))) fail(type);
  if (record.hasMore !== (nextCursor !== undefined)
      || (record.hasMore && record.items.length === 0)) fail(type);
  return Object.freeze({
    items: Object.freeze(record.items.map(itemSanitizer)),
    hasMore: record.hasMore,
    ...(nextCursor === undefined ? {} : { nextCursor: nextCursor as PaginationCursor }),
  });
}

export function assertEventDecisionResult(
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'PAUSE' | 'CANCEL',
  event: Readonly<PublicEventProjection>,
): void {
  const prePublicationStates: readonly string[] = Object.freeze([
    EventState.DRAFT, EventState.SUBMITTED, EventState.UNDER_REVIEW,
  ]);
  const prePublicationPublicationStates: readonly string[] = Object.freeze([
    PublicationState.DRAFT, PublicationState.SUBMITTED, PublicationState.UNDER_REVIEW,
  ]);
  const valid = decision === 'APPROVE'
    ? event.state === EventState.PUBLISHED
      && event.publicationState === PublicationState.PUBLISHED
      && event.verificationState === VerificationState.HUMAN_REVIEWED
    : decision === 'REJECT'
      ? event.state === EventState.REJECTED
        && event.publicationState === PublicationState.REJECTED
        && event.reservationAvailable === false
      : decision === 'REQUEST_CHANGES'
        ? prePublicationStates.includes(event.state)
          && prePublicationPublicationStates.includes(event.publicationState)
          && event.reservationAvailable === false
        : decision === 'PAUSE'
          ? event.state === EventState.PAUSED
            && event.publicationState === PublicationState.UNPUBLISHED
            && event.reservationAvailable === false
          : event.state === EventState.CANCELLED
            && event.publicationState === PublicationState.UNPUBLISHED
            && event.reservationAvailable === false;
  if (!valid) fail(`event.review ${decision} result`);
  assertPublishedEventSafety(event);
}

export function assertContentDecisionResult(
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'UNPUBLISH',
  content: Readonly<PublicContentProjection>,
): void {
  const prePublicationStates: readonly string[] = Object.freeze([
    PublicationState.DRAFT, PublicationState.SUBMITTED, PublicationState.UNDER_REVIEW,
  ]);
  const valid = decision === 'APPROVE'
    ? content.publicationState === PublicationState.PUBLISHED
      && content.verificationState === VerificationState.HUMAN_REVIEWED
    : decision === 'REJECT'
      ? content.publicationState === PublicationState.REJECTED
      : decision === 'REQUEST_CHANGES'
        ? prePublicationStates.includes(content.publicationState)
        : content.publicationState === PublicationState.UNPUBLISHED;
  if (!valid) fail(`content.review ${decision} result`);
}
