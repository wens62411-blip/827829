import { randomUUID } from 'node:crypto';
import { CITY_DIRECTORY, type CityId } from '../../miniprogram/shared/constants/geography';
import {
  CLOUD_ACTIONS_BY_FUNCTION,
  type CloudAction,
  type CloudActionData,
} from '../../miniprogram/shared/contracts';
import {
  EventState,
  MediaRightsState,
  PublicationState,
  RecordOrigin,
  VerificationState,
  type MediaRightsState as MediaRightsStateValue,
  type RecordOrigin as RecordOriginValue,
  type VerificationState as VerificationStateValue,
} from '../../miniprogram/shared/types/enums';
import {
  ApiErrorCode,
  type ApiResult,
} from '../../miniprogram/shared/types/api';
import type {
  AuditEntryId,
  ContentId,
  ContentIntentId,
  OptimisticVersion,
  PaginationCursor,
  RequestId,
  StableId,
  UserId,
  UtcInstant,
} from '../../miniprogram/shared/types/primitives';
import type {
  ContentCollectionProjection,
  ContentCreatorProjection,
  ContentIntentProjection,
  PublicContentProjection,
  PublicEventProjection,
} from '../../miniprogram/shared/types/projections';
import {
  requireTrustedPrincipal,
  type PrincipalLoader,
  type TrustedPrincipal,
  type WxContextProvider,
} from '../_shared/auth';
import { createAuditAppend, type AuditAppend } from '../_shared/audit';
import { SafeApiError, safeFailureFromError } from '../_shared/errors';
import { createNotImplementedEndpoint } from '../_shared/errors/envelope';
import {
  assertIdempotencyCompatible,
  createIdempotencyClaim,
  fingerprintPayload,
  requireIdempotencyKey,
  type ExistingIdempotencyRecord,
  type JsonValue,
} from '../_shared/idempotency';
import {
  assertProjectionReadable,
  parseReadOnlyProjection,
  type ProjectionReadState,
} from '../_shared/projections';
import { requireExpectedVersion, isPlainRecord, isValidRequestId, validateCallEnvelope } from '../_shared/validation';

const ACTIONS = CLOUD_ACTIONS_BY_FUNCTION.contentApi;
type ContentAction = (typeof ACTIONS)[number];
type ContentActionResult = CloudActionData<ContentAction>;
type ContentCategory = 'ART' | 'ANTIQUE' | 'JEWELRY';
type IntentPurpose = 'VIEWING' | 'COLLABORATION';

const CONTRACT_ENDPOINT = createNotImplementedEndpoint('contentApi', ACTIONS);
const CITY_IDS = new Set<string>(CITY_DIRECTORY.map((city) => city.id));
const CATEGORY_VALUES: readonly ContentCategory[] = Object.freeze(['ART', 'ANTIQUE', 'JEWELRY']);
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const HTTPS_PROTOCOL = 'https:';
const MAX_PAGE_SIZE = 20;
const MAX_CURSOR_LENGTH = 1024;
const MAX_MESSAGE_LENGTH = 600;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export interface ContentIntentRecord {
  readonly _id: ContentIntentId;
  readonly contentId: ContentId;
  readonly userId: UserId;
  readonly purpose: IntentPurpose;
  readonly message?: string;
  readonly state: 'ACTIVE' | 'CANCELLED';
  readonly history: readonly ContentIntentHistoryEntry[];
  readonly version: OptimisticVersion;
  readonly createdAt: UtcInstant;
  readonly updatedAt: UtcInstant;
}

export interface ContentIntentHistoryEntry {
  readonly state: 'ACTIVE' | 'CANCELLED';
  readonly purpose: IntentPurpose;
  readonly message?: string;
  readonly version: OptimisticVersion;
  readonly recordedAt: UtcInstant;
}

export interface StoredIdempotencyRecord extends ExistingIdempotencyRecord {
  readonly responseData: Readonly<{ readonly intent: ExtendedContentIntentProjection }>;
}

export interface RelatedEventCandidate {
  readonly projection: unknown;
  readonly readState: ProjectionReadState;
}

export interface ContentReadRepository {
  listContentRecords(): Promise<readonly unknown[]>;
  getContentRecord(contentId: string): Promise<unknown | null>;
  listCollectionRecords(): Promise<readonly unknown[]>;
  getCreatorRecord(creatorId: string): Promise<unknown | null>;
  getRelatedEventCandidates(eventIds: readonly string[]): Promise<readonly RelatedEventCandidate[]>;
}

export interface ContentIntentTransaction {
  getContentRecord(contentId: string): Promise<unknown | null>;
  getIntentById(intentId: string): Promise<Readonly<ContentIntentRecord> | null>;
  getIntentByUserContent(userId: string, contentId: string): Promise<Readonly<ContentIntentRecord> | null>;
  putIntent(intent: Readonly<ContentIntentRecord>): Promise<void>;
  getIdempotency(namespace: string): Promise<Readonly<StoredIdempotencyRecord> | null>;
  putIdempotency(record: Readonly<StoredIdempotencyRecord>): Promise<void>;
  appendAudit(entry: Readonly<AuditAppend>): Promise<void>;
}

export interface ContentIntentTransactionRunner {
  runTransaction<Result>(operation: (transaction: ContentIntentTransaction) => Promise<Result>): Promise<Result>;
}

export interface ContentApiDependencies {
  readonly getWxContext: WxContextProvider;
  readonly loadPrincipal: PrincipalLoader;
  readonly reads: ContentReadRepository;
  readonly intents: ContentIntentTransactionRunner;
  readonly now: () => string;
  readonly newId: (kind: 'content-intent' | 'audit-entry') => string;
}

export interface ContentApiEndpoint {
  readonly actions: readonly ContentAction[];
  readonly writeGuardPlans: typeof CONTRACT_ENDPOINT.writeGuardPlans;
  readonly main: (event: unknown) => Promise<ApiResult<ContentActionResult>>;
}

interface ArtDetails {
  readonly author: string;
  readonly workTitle: string;
  readonly year: string;
  readonly medium: string;
  readonly dimensions: string;
  readonly edition: string;
  readonly exhibitionHistory: string;
  readonly provenanceInformation: string;
  readonly imageRightsStatement: string;
}

interface AntiqueDetails {
  readonly dateRange: string;
  readonly objectType: string;
  readonly knownProvenance: string;
  readonly conditionStatement: string;
  readonly thirdPartyReportReferences: readonly string[];
  readonly platformAuthenticityStatement: string;
}

interface JewelryDetails {
  readonly subtype: 'GEMSTONE' | 'PEARL' | 'METALWORK' | 'OTHER';
  readonly materialStatement: string;
  readonly gemOrPearlInformation: string;
  readonly dimensions: string;
  readonly reportReferences: readonly string[];
  readonly displayAuthorization: string;
  readonly investmentDisclaimer: string;
}

type CategoryDetails =
  | { readonly category: 'ART'; readonly art: ArtDetails }
  | { readonly category: 'ANTIQUE'; readonly antique: AntiqueDetails }
  | { readonly category: 'JEWELRY'; readonly jewelry: JewelryDetails };

interface PublicImageProjection {
  readonly mediaAssetId: string;
  readonly url: string;
  readonly sourceUrl: string;
  readonly license: string;
  readonly rightsHolder: string;
  readonly sha256: string;
  readonly permittedUses: readonly string[];
  readonly alt: string;
  readonly rightsReviewedAt: UtcInstant;
}

interface ExtendedContentFields {
  readonly recordOrigin: RecordOriginValue;
  readonly evidenceScope: 'PUBLIC' | 'DEMO_ONLY';
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly rightsStatus: MediaRightsStateValue;
  readonly rightsSummary: string;
  readonly reviewedAt: UtcInstant;
  readonly rightsReviewedAt?: UtcInstant;
  readonly cityId: CityId;
  readonly alt: string;
  readonly creatorDisplayName: string;
  readonly evidenceLabel?: 'DEMO_ONLY';
  readonly image?: PublicImageProjection;
  readonly imageDisabled: boolean;
  readonly imageDisabledReason?: 'NO_MEDIA' | 'RIGHTS_NOT_PUBLIC';
  readonly details: CategoryDetails;
  readonly artwork?: {
    readonly author: string;
    readonly workTitle: string;
    readonly year: string;
    readonly medium: string;
    readonly dimensions: string;
    readonly edition: string;
    readonly exhibitionHistory: string;
    readonly provenanceInformation: string;
  };
  readonly antique?: {
    readonly periodRange: string;
    readonly objectType: string;
    readonly knownProvenance: string;
    readonly conditionStatement: string;
    readonly thirdPartyReportReference: string;
  };
  readonly jewelry?: {
    readonly jewelryKind: 'PEARL' | 'GEMSTONE' | 'METALWORK' | 'OTHER';
    readonly materialStatement: string;
    readonly gemstoneOrPearlInformation: string;
    readonly dimensions: string;
    readonly reportReference: string;
    readonly displayAuthorization: string;
  };
}

export type ExtendedPublicContentProjection = PublicContentProjection & ExtendedContentFields;

export interface ExtendedContentIntentProjection extends ContentIntentProjection {
  readonly purpose: IntentPurpose;
  readonly message?: string;
}

export type ExtendedContentCollectionProjection = ContentCollectionProjection & {
  readonly categories: readonly ContentCategory[];
  readonly recordOrigin: RecordOriginValue;
  readonly evidenceScope: 'PUBLIC' | 'DEMO_ONLY';
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly reviewedAt: UtcInstant;
};

export type ExtendedContentCreatorProjection = ContentCreatorProjection & {
  readonly creatorKind: 'ARTIST' | 'INSTITUTION' | 'MAKER';
  readonly recordOrigin: RecordOriginValue;
  readonly evidenceScope: 'PUBLIC' | 'DEMO_ONLY';
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly reviewedAt: UtcInstant;
  readonly cityId: CityId;
};

interface ParsedContentRecord {
  readonly _id: ContentId;
  readonly collectionId?: StableId<'collection'>;
  readonly creatorId: StableId<'creator'>;
  readonly title: string;
  readonly summary: string;
  readonly category: ContentCategory;
  readonly publicationState: typeof PublicationState.PUBLISHED;
  readonly publicVisible: true;
  readonly recordOrigin: RecordOriginValue;
  readonly verificationState: VerificationStateValue;
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly rightsStatus: MediaRightsStateValue;
  readonly rightsSummary: string;
  readonly reviewedAt: UtcInstant;
  readonly cityId: CityId;
  readonly alt: string;
  readonly creatorDisplayName: string;
  readonly evidenceLabel?: 'DEMO_ONLY';
  readonly relatedEventIds: readonly string[];
  readonly media?: unknown;
  readonly details: CategoryDetails;
  readonly version: OptimisticVersion;
  readonly createdAt: UtcInstant;
  readonly updatedAt: UtcInstant;
}

interface PageAnchor {
  readonly updatedAt: string;
  readonly id: string;
}

interface ParsedPageRequest {
  readonly limit: number;
  readonly cursor?: string;
}

function responseRequestId(event: unknown): RequestId {
  if (isPlainRecord(event) && isValidRequestId(event.requestId)) return event.requestId as RequestId;
  return `srv_${randomUUID()}` as RequestId;
}

function success<Data>(requestId: string, data: Data): ApiResult<Data> {
  return { ok: true, data, requestId: requestId as RequestId };
}

function invalidRequest(field: string, reason: string): never {
  throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, 'The request contains an invalid field.', {
    details: { code: ApiErrorCode.INVALID_REQUEST, field, reason },
  });
}

function validationFailed(field: string, rule: string): never {
  throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, 'The request failed validation.', {
    details: { code: ApiErrorCode.VALIDATION_FAILED, issues: [{ field, rule }] },
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

function conflict(conflictType: string): never {
  throw new SafeApiError(ApiErrorCode.CONFLICT, 'The request conflicts with the current resource state.', {
    details: { code: ApiErrorCode.CONFLICT, conflictType },
  });
}

function requireExactKeys(
  value: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
): void {
  const extra = Object.keys(value).find((key) => !allowed.includes(key));
  if (extra !== undefined) invalidRequest(extra, 'UNEXPECTED_FIELD');
}

function validateContractVersion(payload: Readonly<Record<string, unknown>>): void {
  if (payload.contractVersion !== undefined && payload.contractVersion !== '1.0.0') {
    invalidRequest('contractVersion', 'UNSUPPORTED_CONTRACT_VERSION');
  }
}

function requireStableId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !STABLE_ID_PATTERN.test(value)) invalidRequest(field, 'MALFORMED_STABLE_ID');
  return value;
}

function requireOptionalCategory(value: unknown): ContentCategory | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !CATEGORY_VALUES.includes(value as ContentCategory)) {
    invalidRequest('category', 'UNSUPPORTED_CATEGORY');
  }
  return value as ContentCategory;
}

function parsePageRequest(payload: Readonly<Record<string, unknown>>): ParsedPageRequest {
  if (!Number.isSafeInteger(payload.limit) || (payload.limit as number) < 1 || (payload.limit as number) > MAX_PAGE_SIZE) {
    invalidRequest('limit', 'LIMIT_OUT_OF_RANGE');
  }
  if (payload.cursor !== undefined
      && (typeof payload.cursor !== 'string' || payload.cursor.length < 1 || payload.cursor.length > MAX_CURSOR_LENGTH)) {
    invalidRequest('cursor', 'MALFORMED_CURSOR');
  }
  return {
    limit: payload.limit as number,
    ...(payload.cursor === undefined ? {} : { cursor: payload.cursor as string }),
  };
}

function requireCityId(value: unknown, field = 'cityId'): CityId {
  if (typeof value !== 'string' || !CITY_IDS.has(value)) invalidRequest(field, 'UNKNOWN_FROZEN_CITY_ID');
  return value as CityId;
}

function readRecord(value: unknown, name: string): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) throw new Error(`Invalid ${name} record`);
  return value;
}

function readString(record: Readonly<Record<string, unknown>>, field: string): string {
  const value = record[field];
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`Invalid ${field}`);
  return value;
}

function readOptionalString(record: Readonly<Record<string, unknown>>, field: string): string | undefined {
  const value = record[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`Invalid ${field}`);
  return value;
}

function readUtc(record: Readonly<Record<string, unknown>>, field: string): UtcInstant {
  const value = readString(record, field);
  if (!UTC_PATTERN.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`Invalid ${field}`);
  return value as UtcInstant;
}

function readVersion(record: Readonly<Record<string, unknown>>, field = 'version'): OptimisticVersion {
  const value = record[field];
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new Error(`Invalid ${field}`);
  return value as OptimisticVersion;
}

function readStringArray(record: Readonly<Record<string, unknown>>, field: string): readonly string[] {
  const value = record[field];
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.trim().length > 0)) {
    throw new Error(`Invalid ${field}`);
  }
  return Object.freeze([...value]) as readonly string[];
}

function readHttpsUrl(record: Readonly<Record<string, unknown>>, field: string): string {
  const raw = readString(record, field);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid ${field}`);
  }
  if (url.protocol !== HTTPS_PROTOCOL || url.username !== '' || url.password !== '') throw new Error(`Invalid ${field}`);
  return url.toString();
}

function readEnum<Value extends string>(
  record: Readonly<Record<string, unknown>>,
  field: string,
  values: readonly Value[],
): Value {
  const value = readString(record, field);
  if (!values.includes(value as Value)) throw new Error(`Invalid ${field}`);
  return value as Value;
}

function parseDetails(record: Readonly<Record<string, unknown>>, category: ContentCategory): CategoryDetails {
  const details = readRecord(record.details, 'details');
  if (category === 'ART') {
    requireExactInternalKeys(details, [
      'author', 'workTitle', 'year', 'medium', 'dimensions', 'edition',
      'exhibitionHistory', 'provenanceInformation', 'imageRightsStatement',
    ], 'art details');
    return Object.freeze({
      category,
      art: Object.freeze({
        author: readString(details, 'author'),
        workTitle: readString(details, 'workTitle'),
        year: readString(details, 'year'),
        medium: readString(details, 'medium'),
        dimensions: readString(details, 'dimensions'),
        edition: readString(details, 'edition'),
        exhibitionHistory: readString(details, 'exhibitionHistory'),
        provenanceInformation: readString(details, 'provenanceInformation'),
        imageRightsStatement: readString(details, 'imageRightsStatement'),
      }),
    });
  }
  if (category === 'ANTIQUE') {
    requireExactInternalKeys(details, [
      'dateRange', 'objectType', 'knownProvenance', 'conditionStatement',
      'thirdPartyReportReferences', 'platformAuthenticityStatement',
    ], 'antique details');
    return Object.freeze({
      category,
      antique: Object.freeze({
        dateRange: readString(details, 'dateRange'),
        objectType: readString(details, 'objectType'),
        knownProvenance: readString(details, 'knownProvenance'),
        conditionStatement: readString(details, 'conditionStatement'),
        thirdPartyReportReferences: readStringArray(details, 'thirdPartyReportReferences'),
        platformAuthenticityStatement: readString(details, 'platformAuthenticityStatement'),
      }),
    });
  }
  requireExactInternalKeys(details, [
    'subtype', 'materialStatement', 'gemOrPearlInformation', 'dimensions',
    'reportReferences', 'displayAuthorization', 'investmentDisclaimer',
  ], 'jewelry details');
  const subtype = readEnum(details, 'subtype', ['GEMSTONE', 'PEARL', 'METALWORK', 'OTHER'] as const);
  return Object.freeze({
    category,
    jewelry: Object.freeze({
      subtype,
      materialStatement: readString(details, 'materialStatement'),
      gemOrPearlInformation: readString(details, 'gemOrPearlInformation'),
      dimensions: readString(details, 'dimensions'),
      reportReferences: readStringArray(details, 'reportReferences'),
      displayAuthorization: readString(details, 'displayAuthorization'),
      investmentDisclaimer: readString(details, 'investmentDisclaimer'),
    }),
  });
}

function requireExactInternalKeys(
  record: Readonly<Record<string, unknown>>,
  fields: readonly string[],
  name: string,
): void {
  const actual = Object.keys(record).sort();
  const expected = [...fields].sort();
  if (actual.length !== expected.length || actual.some((field, index) => field !== expected[index])) {
    throw new Error(`Invalid ${name} shape`);
  }
}

function isPublicCandidate(value: unknown): value is Readonly<Record<string, unknown>> {
  return isPlainRecord(value)
    && value.publicationState === PublicationState.PUBLISHED
    && value.publicVisible === true;
}

function parsePublishedContent(value: unknown): ParsedContentRecord {
  const record = readRecord(value, 'art content');
  if (record.publicationState !== PublicationState.PUBLISHED || record.publicVisible !== true) {
    throw new Error('Only public PUBLISHED content may be projected');
  }
  const id = requireInternalStableId(record._id, '_id') as ContentId;
  const category = readEnum(record, 'category', CATEGORY_VALUES);
  const recordOrigin = readEnum(record, 'recordOrigin', Object.values(RecordOrigin));
  if (record.origin !== undefined && record.origin !== recordOrigin) throw new Error('origin and recordOrigin differ');
  const rightsStatus = readEnum(record, 'rightsStatus', Object.values(MediaRightsState));
  if (record.mediaRightsState !== rightsStatus) throw new Error('rightsStatus and mediaRightsState differ');
  const cityId = requireInternalCityId(record.cityId);
  const createdAt = readUtc(record, 'createdAt');
  const updatedAt = readUtc(record, 'updatedAt');
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw new Error('updatedAt precedes createdAt');
  const reviewedAt = readUtc(record, 'reviewedAt');
  const collectionId = readOptionalString(record, 'collectionId');
  const evidenceLabel = readOptionalString(record, 'evidenceLabel');
  if (evidenceLabel !== undefined && evidenceLabel !== 'DEMO_ONLY') throw new Error('Invalid evidenceLabel');
  if (evidenceLabel === 'DEMO_ONLY' && recordOrigin !== RecordOrigin.SYNTHETIC) {
    throw new Error('DEMO_ONLY content must be SYNTHETIC');
  }
  return Object.freeze({
    _id: id,
    ...(collectionId === undefined ? {} : { collectionId: requireInternalStableId(collectionId, 'collectionId') as StableId<'collection'> }),
    creatorId: requireInternalStableId(record.creatorId, 'creatorId') as StableId<'creator'>,
    title: readString(record, 'title'),
    summary: readString(record, 'summary'),
    category,
    publicationState: PublicationState.PUBLISHED,
    publicVisible: true,
    recordOrigin,
    verificationState: readEnum(record, 'verificationState', Object.values(VerificationState)),
    sourceTitle: readString(record, 'sourceTitle'),
    sourceUrl: readHttpsUrl(record, 'sourceUrl'),
    rightsStatus,
    rightsSummary: readString(record, 'rightsSummary'),
    reviewedAt,
    cityId,
    alt: readString(record, 'alt'),
    creatorDisplayName: readString(record, 'creatorDisplayName'),
    ...(evidenceLabel === undefined ? {} : { evidenceLabel: 'DEMO_ONLY' as const }),
    relatedEventIds: record.relatedEventIds === undefined ? Object.freeze([]) : readStringArray(record, 'relatedEventIds'),
    ...(record.media === undefined ? {} : { media: record.media }),
    details: parseDetails(record, category),
    version: readVersion(record),
    createdAt,
    updatedAt,
  });
}

function requireInternalStableId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !STABLE_ID_PATTERN.test(value)) throw new Error(`Invalid ${field}`);
  return value;
}

function requireInternalCityId(value: unknown): CityId {
  if (typeof value !== 'string' || !CITY_IDS.has(value)) throw new Error('Invalid cityId');
  return value as CityId;
}

function publicImage(
  record: ParsedContentRecord,
  usage: 'THUMBNAIL' | 'DETAIL',
  now: string,
): PublicImageProjection | undefined {
  if (record.media === undefined || record.rightsStatus !== MediaRightsState.APPROVED) return undefined;
  try {
    const media = readRecord(record.media, 'media');
    if (media.publicState !== 'PUBLIC') return undefined;
    const rights = readRecord(media.rights, 'media rights');
    if (rights.state !== MediaRightsState.APPROVED) return undefined;
    const permitted = readStringArray(rights, 'permittedUses');
    if (!permitted.every((item) => ['THUMBNAIL', 'DETAIL', 'SHARE'].includes(item))
        || !permitted.includes(usage)) return undefined;
    const reviewedAt = readUtc(rights, 'reviewedAt');
    if (Date.parse(reviewedAt) > Date.parse(now)) return undefined;
    const validFrom = readOptionalString(rights, 'validFrom');
    const validUntil = readOptionalString(rights, 'validUntil');
    if (validFrom !== undefined
        && (!UTC_PATTERN.test(validFrom) || Number.isNaN(Date.parse(validFrom)) || Date.parse(now) < Date.parse(validFrom))) return undefined;
    if (validUntil !== undefined
        && (!UTC_PATTERN.test(validUntil) || Number.isNaN(Date.parse(validUntil)) || Date.parse(now) >= Date.parse(validUntil))) return undefined;
    const sha256 = readString(media, 'sha256');
    if (!SHA256_PATTERN.test(sha256)) return undefined;
    return Object.freeze({
      mediaAssetId: requireInternalStableId(media.assetId, 'media.assetId'),
      url: readHttpsUrl(media, 'publicUrl'),
      sourceUrl: readHttpsUrl(media, 'sourceUrl'),
      license: readString(media, 'license'),
      rightsHolder: readString(rights, 'rightsHolderName'),
      sha256,
      permittedUses: permitted,
      alt: record.alt,
      rightsReviewedAt: reviewedAt,
    });
  } catch {
    return undefined;
  }
}

function categoryAliases(details: CategoryDetails): Pick<
  ExtendedContentFields,
  'artwork' | 'antique' | 'jewelry'
> {
  if (details.category === 'ART') {
    return {
      artwork: {
        author: details.art.author,
        workTitle: details.art.workTitle,
        year: details.art.year,
        medium: details.art.medium,
        dimensions: details.art.dimensions,
        edition: details.art.edition,
        exhibitionHistory: details.art.exhibitionHistory,
        provenanceInformation: details.art.provenanceInformation,
      },
    };
  }
  if (details.category === 'ANTIQUE') {
    return {
      antique: {
        periodRange: details.antique.dateRange,
        objectType: details.antique.objectType,
        knownProvenance: details.antique.knownProvenance,
        conditionStatement: details.antique.conditionStatement,
        thirdPartyReportReference: details.antique.thirdPartyReportReferences.join('；') || '未提供第三方报告引用',
      },
    };
  }
  return {
    jewelry: {
      jewelryKind: details.jewelry.subtype,
      materialStatement: details.jewelry.materialStatement,
      gemstoneOrPearlInformation: details.jewelry.gemOrPearlInformation,
      dimensions: details.jewelry.dimensions,
      reportReference: details.jewelry.reportReferences.join('；') || '未提供报告引用',
      displayAuthorization: details.jewelry.displayAuthorization,
    },
  };
}

function projectContent(
  value: unknown,
  usage: 'THUMBNAIL' | 'DETAIL',
  now: string,
): ExtendedPublicContentProjection {
  const record = parsePublishedContent(value);
  const image = publicImage(record, usage, now);
  const base = {
    contentId: record._id,
    ...(record.collectionId === undefined ? {} : { collectionId: record.collectionId }),
    creatorId: record.creatorId,
    title: record.title,
    summary: record.summary,
    category: record.category,
    publicationState: record.publicationState,
    ...(image === undefined ? {} : { coverAssetId: image.mediaAssetId as StableId<'media-asset'> }),
    mediaRightsState: record.rightsStatus,
    origin: record.recordOrigin,
    verificationState: record.verificationState,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    recordOrigin: record.recordOrigin,
    evidenceScope: record.evidenceLabel === 'DEMO_ONLY' ? 'DEMO_ONLY' as const : 'PUBLIC' as const,
    sourceTitle: record.sourceTitle,
    sourceUrl: record.sourceUrl,
    rightsStatus: record.rightsStatus,
    rightsSummary: record.rightsSummary,
    reviewedAt: record.reviewedAt,
    ...(image === undefined ? {} : { rightsReviewedAt: image.rightsReviewedAt }),
    cityId: record.cityId,
    alt: record.alt,
    creatorDisplayName: record.creatorDisplayName,
    ...(record.evidenceLabel === undefined ? {} : { evidenceLabel: record.evidenceLabel }),
    ...(image === undefined ? {} : { image }),
    imageDisabled: image === undefined,
    ...(image === undefined
      ? { imageDisabledReason: record.media === undefined ? 'NO_MEDIA' as const : 'RIGHTS_NOT_PUBLIC' as const }
      : {}),
    details: record.details,
    ...categoryAliases(record.details),
  } satisfies ExtendedPublicContentProjection;
  return deepFreezeClone(base);
}

function tryProjectContent(
  value: unknown,
  usage: 'THUMBNAIL' | 'DETAIL',
  now: string,
): ExtendedPublicContentProjection | undefined {
  try {
    return projectContent(value, usage, now);
  } catch {
    return undefined;
  }
}

function deepFreezeClone<Value>(value: Value): Value {
  const clone = JSON.parse(JSON.stringify(value)) as Value;
  const freeze = (candidate: object): void => {
    Object.values(candidate).forEach((child) => {
      if (child !== null && typeof child === 'object' && !Object.isFrozen(child)) freeze(child);
    });
    Object.freeze(candidate);
  };
  if (clone !== null && typeof clone === 'object') freeze(clone);
  return clone;
}

function sortContent(items: readonly ExtendedPublicContentProjection[]): readonly ExtendedPublicContentProjection[] {
  return [...items].sort((left, right) => {
    const byTime = right.updatedAt.localeCompare(left.updatedAt);
    return byTime === 0 ? left.contentId.localeCompare(right.contentId) : byTime;
  });
}

function encodeCursor(kind: string, filterHash: string, anchor: PageAnchor): PaginationCursor {
  const value = Buffer.from(JSON.stringify({ v: 1, kind, filterHash, ...anchor }), 'utf8').toString('base64url');
  return value as PaginationCursor;
}

function decodeCursor(
  raw: string,
  kind: string,
  filterHash: string,
): PageAnchor {
  try {
    const decoded = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown;
    if (!isPlainRecord(decoded)) invalidCursor('MALFORMED');
    requireExactInternalKeys(decoded, ['v', 'kind', 'filterHash', 'updatedAt', 'id'], 'cursor');
    if (decoded.v !== 1 || decoded.kind !== kind) invalidCursor('MALFORMED');
    if (decoded.filterHash !== filterHash) invalidCursor('FILTER_MISMATCH');
    if (typeof decoded.updatedAt !== 'string' || !UTC_PATTERN.test(decoded.updatedAt)) invalidCursor('MALFORMED');
    if (typeof decoded.id !== 'string' || !STABLE_ID_PATTERN.test(decoded.id)) invalidCursor('MALFORMED');
    return { updatedAt: decoded.updatedAt, id: decoded.id };
  } catch (error) {
    if (error instanceof SafeApiError) throw error;
    invalidCursor('MALFORMED');
  }
}

function invalidCursor(reason: 'MALFORMED' | 'EXPIRED' | 'FILTER_MISMATCH'): never {
  throw new SafeApiError(ApiErrorCode.INVALID_CURSOR, 'The pagination cursor is invalid.', {
    details: { code: ApiErrorCode.INVALID_CURSOR, reason },
  });
}

function paginate<Projection extends { readonly updatedAt: string }>(input: {
  readonly items: readonly Projection[];
  readonly idOf: (item: Projection) => string;
  readonly page: ParsedPageRequest;
  readonly cursorKind: string;
  readonly filterHash: string;
}): {
  readonly items: readonly Projection[];
  readonly nextCursor?: PaginationCursor;
  readonly hasMore: boolean;
} {
  let start = 0;
  if (input.page.cursor !== undefined) {
    const anchor = decodeCursor(input.page.cursor, input.cursorKind, input.filterHash);
    const index = input.items.findIndex((item) => item.updatedAt === anchor.updatedAt && input.idOf(item) === anchor.id);
    if (index < 0) invalidCursor('EXPIRED');
    start = index + 1;
  }
  const items = input.items.slice(start, start + input.page.limit);
  const hasMore = start + items.length < input.items.length;
  const last = items.length === 0 ? undefined : items[items.length - 1];
  return Object.freeze({
    items: Object.freeze(items),
    ...(hasMore && last !== undefined
      ? { nextCursor: encodeCursor(input.cursorKind, input.filterHash, { updatedAt: last.updatedAt, id: input.idOf(last) }) }
      : {}),
    hasMore,
  });
}

function parseCreator(value: unknown): ExtendedContentCreatorProjection {
  const record = readRecord(value, 'creator');
  const createdAt = readUtc(record, 'createdAt');
  const updatedAt = readUtc(record, 'updatedAt');
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw new Error('Creator updatedAt precedes createdAt');
  const recordOrigin = readEnum(record, 'recordOrigin', Object.values(RecordOrigin));
  const evidenceScope = readEnum(record, 'evidenceScope', ['PUBLIC', 'DEMO_ONLY'] as const);
  if (evidenceScope === 'DEMO_ONLY' && recordOrigin !== RecordOrigin.SYNTHETIC) {
    throw new Error('DEMO_ONLY creator must be SYNTHETIC');
  }
  return deepFreezeClone({
    creatorId: requireInternalStableId(record._id ?? record.creatorId, 'creatorId') as StableId<'creator'>,
    displayName: readString(record, 'displayName'),
    biography: readString(record, 'biography'),
    verificationState: readEnum(record, 'verificationState', Object.values(VerificationState)),
    creatorKind: readEnum(record, 'creatorKind', ['ARTIST', 'INSTITUTION', 'MAKER'] as const),
    recordOrigin,
    evidenceScope,
    sourceTitle: readString(record, 'sourceTitle'),
    sourceUrl: readHttpsUrl(record, 'sourceUrl'),
    reviewedAt: readUtc(record, 'reviewedAt'),
    cityId: requireInternalCityId(record.cityId),
    version: readVersion(record),
    createdAt,
    updatedAt,
  });
}

function parseCollection(value: unknown): ExtendedContentCollectionProjection {
  const record = readRecord(value, 'art collection');
  const title = readRecord(record.title, 'collection title');
  requireExactInternalKeys(title, ['zh', 'en'], 'collection title');
  const rawCategories = readStringArray(record, 'categories');
  if (!rawCategories.every((category) => CATEGORY_VALUES.includes(category as ContentCategory))) {
    throw new Error('Invalid collection categories');
  }
  if (rawCategories.length === 0 || new Set(rawCategories).size !== rawCategories.length) {
    throw new Error('Collection categories must be non-empty and unique');
  }
  const recordOrigin = readEnum(record, 'recordOrigin', Object.values(RecordOrigin));
  const evidenceScope = readEnum(record, 'evidenceScope', ['PUBLIC', 'DEMO_ONLY'] as const);
  if (evidenceScope === 'DEMO_ONLY' && recordOrigin !== RecordOrigin.SYNTHETIC) {
    throw new Error('DEMO_ONLY collection must be SYNTHETIC');
  }
  const createdAt = readUtc(record, 'createdAt');
  const updatedAt = readUtc(record, 'updatedAt');
  return deepFreezeClone({
    collectionId: requireInternalStableId(record._id, 'collectionId') as StableId<'collection'>,
    title: { zh: readString(title, 'zh'), en: readString(title, 'en') },
    summary: readString(record, 'summary'),
    publicationState: PublicationState.PUBLISHED,
    categories: rawCategories as readonly ContentCategory[],
    recordOrigin,
    evidenceScope,
    sourceTitle: readString(record, 'sourceTitle'),
    sourceUrl: readHttpsUrl(record, 'sourceUrl'),
    reviewedAt: readUtc(record, 'reviewedAt'),
    version: readVersion(record),
    createdAt,
    updatedAt,
  });
}

function tryParseCollection(value: unknown): ExtendedContentCollectionProjection | undefined {
  try {
    return parseCollection(value);
  } catch {
    return undefined;
  }
}

function isPublicCollection(value: unknown): value is Readonly<Record<string, unknown>> {
  return isPlainRecord(value)
    && value.publicationState === PublicationState.PUBLISHED
    && value.publicVisible === true;
}

function parsePurpose(message: unknown): { readonly purpose: IntentPurpose; readonly message?: string; readonly raw: string } {
  if (typeof message !== 'string' || message.length < 1 || message.length > MAX_MESSAGE_LENGTH) {
    validationFailed('message', 'PURPOSE_PREFIX_AND_OPTIONAL_BODY_REQUIRED');
  }
  const match = /^\[PURPOSE:(VIEWING|COLLABORATION)\](?:\r?\n([\s\S]*))?$/.exec(message);
  if (match === null) validationFailed('message', 'CONTROLLED_PURPOSE_PREFIX_MUST_BE_FIRST_LINE');
  const purpose = match[1] as IntentPurpose;
  const body = match[2]?.trim();
  if (body !== undefined && body.length > 500) validationFailed('message', 'BODY_MAX_500_CHARS');
  return Object.freeze({
    purpose,
    ...(body === undefined || body.length === 0 ? {} : { message: body }),
    raw: message,
  });
}

function projectIntent(record: Readonly<ContentIntentRecord>): ExtendedContentIntentProjection {
  return deepFreezeClone({
    intentId: record._id,
    contentId: record.contentId,
    userId: record.userId,
    state: record.state,
    purpose: record.purpose,
    ...(record.message === undefined ? {} : { message: record.message }),
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

function requirePrincipalUser(principal: TrustedPrincipal): UserId {
  if (principal.userId === undefined) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, 'Authentication is required.', {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true },
    });
  }
  return principal.userId;
}

function actorRole(principal: TrustedPrincipal): 'MEMBER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN' {
  for (const role of ['ADMIN', 'REVIEWER', 'ORGANIZER', 'MEMBER'] as const) {
    if (principal.roles.includes(role)) return role;
  }
  return 'MEMBER';
}

function assertReplayOwner(response: Readonly<{ readonly intent: ExtendedContentIntentProjection }>, userId: UserId): void {
  if (response.intent.userId !== userId) {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'The resource is not owned by this account.', {
      details: { code: ApiErrorCode.FORBIDDEN, policy: 'OBJECT_OWNER_REQUIRED' },
    });
  }
}

function completedIdempotency(input: {
  readonly claim: ReturnType<typeof createIdempotencyClaim>;
  readonly responseData: Readonly<{ readonly intent: ExtendedContentIntentProjection }>;
}): StoredIdempotencyRecord {
  return deepFreezeClone({
    ...input.claim,
    status: 'COMPLETED' as const,
    responseData: input.responseData,
  });
}

function assertValidNow(value: string): UtcInstant {
  if (!UTC_PATTERN.test(value) || Number.isNaN(Date.parse(value))) throw new Error('deps.now returned an invalid UTC instant');
  return value as UtcInstant;
}

function idempotencyExpiry(now: string): string {
  return new Date(Date.parse(now) + IDEMPOTENCY_TTL_MS).toISOString();
}

function auditEntry(input: {
  readonly dependencies: ContentApiDependencies;
  readonly principal: TrustedPrincipal;
  readonly action: Extract<CloudAction, 'content.intent.create' | 'content.intent.cancel'>;
  readonly targetId: string;
  readonly requestId: string;
  readonly occurredAt: UtcInstant;
}): Readonly<AuditAppend> {
  return createAuditAppend({
    auditEntryId: requireInternalStableId(input.dependencies.newId('audit-entry'), 'auditEntryId') as AuditEntryId,
    actorUserId: requirePrincipalUser(input.principal),
    actorRole: actorRole(input.principal),
    action: input.action,
    targetType: 'CONTENT_INTENT',
    targetId: input.targetId as StableId,
    requestId: input.requestId as RequestId,
    occurredAt: input.occurredAt,
    result: 'SUCCEEDED',
  });
}

async function listContent(
  dependencies: ContentApiDependencies,
  payload: Readonly<Record<string, unknown>>,
): Promise<CloudActionData<'content.list'>> {
  requireExactKeys(payload, ['contractVersion', 'cursor', 'limit', 'category', 'collectionId']);
  validateContractVersion(payload);
  const pageRequest = parsePageRequest(payload);
  const category = requireOptionalCategory(payload.category);
  const collectionId = payload.collectionId === undefined ? undefined : requireStableId(payload.collectionId, 'collectionId');
  const now = assertValidNow(dependencies.now());
  const raw = await dependencies.reads.listContentRecords();
  const projected = raw
    .filter(isPublicCandidate)
    .map((record) => tryProjectContent(record, 'THUMBNAIL', now))
    .filter((record): record is ExtendedPublicContentProjection => record !== undefined)
    .filter((record) => category === undefined || record.category === category)
    .filter((record) => collectionId === undefined || record.collectionId === collectionId);
  const items = sortContent(projected);
  const filterHash = fingerprintPayload({
    action: 'content.list',
    category: category ?? null,
    collectionId: collectionId ?? null,
    publicationState: PublicationState.PUBLISHED,
    publicVisible: true,
  });
  return {
    page: paginate({
      items,
      idOf: (item) => item.contentId,
      page: pageRequest,
      cursorKind: 'content',
      filterHash,
    }),
  };
}

async function getPublicContentRecord(
  dependencies: ContentApiDependencies,
  contentId: string,
  usage: 'THUMBNAIL' | 'DETAIL',
): Promise<ExtendedPublicContentProjection> {
  const raw = await dependencies.reads.getContentRecord(contentId);
  if (!isPublicCandidate(raw)) notFound('CONTENT', contentId);
  return projectContent(raw, usage, assertValidNow(dependencies.now()));
}

async function getContent(
  dependencies: ContentApiDependencies,
  payload: Readonly<Record<string, unknown>>,
): Promise<CloudActionData<'content.get'>> {
  requireExactKeys(payload, ['contractVersion', 'contentId']);
  validateContractVersion(payload);
  const contentId = requireStableId(payload.contentId, 'contentId');
  const content = await getPublicContentRecord(dependencies, contentId, 'DETAIL');
  const creatorRaw = await dependencies.reads.getCreatorRecord(content.creatorId);
  if (creatorRaw === null) notFound('CONTENT', contentId);
  const creator = parseCreator(creatorRaw);
  if (creator.creatorId !== content.creatorId) throw new Error('Creator projection does not match content creatorId');
  if (creator.displayName !== content.creatorDisplayName) {
    throw new Error('Creator displayName does not match content creatorDisplayName');
  }
  return { content, creator };
}

async function listCollections(
  dependencies: ContentApiDependencies,
  payload: Readonly<Record<string, unknown>>,
): Promise<CloudActionData<'content.listCollections'>> {
  requireExactKeys(payload, ['contractVersion', 'cursor', 'limit', 'category']);
  validateContractVersion(payload);
  const pageRequest = parsePageRequest(payload);
  const category = requireOptionalCategory(payload.category);
  const publicItems = (await dependencies.reads.listContentRecords())
    .filter(isPublicCandidate)
    .map((record) => tryProjectContent(record, 'THUMBNAIL', assertValidNow(dependencies.now())))
    .filter((record): record is ExtendedPublicContentProjection => record !== undefined);
  const publicCollectionIds = new Set(publicItems
    .filter((item) => category === undefined || item.category === category)
    .map((item) => item.collectionId)
    .filter((id): id is StableId<'collection'> => id !== undefined));
  const records = (await dependencies.reads.listCollectionRecords())
    .filter(isPublicCollection)
    .map(tryParseCollection)
    .filter((record): record is ExtendedContentCollectionProjection => record !== undefined)
    .filter((record) => publicCollectionIds.has(record.collectionId))
    .filter((record) => category === undefined || record.categories.includes(category))
    .sort((left, right) => {
      const byTime = right.updatedAt.localeCompare(left.updatedAt);
      return byTime === 0 ? left.collectionId.localeCompare(right.collectionId) : byTime;
    });
  const filterHash = fingerprintPayload({
    action: 'content.listCollections',
    category: category ?? null,
    publicationState: PublicationState.PUBLISHED,
    publicVisible: true,
  });
  return {
    page: paginate({
      items: records,
      idOf: (item) => item.collectionId,
      page: pageRequest,
      cursorKind: 'collection',
      filterHash,
    }),
  };
}

async function getCreator(
  dependencies: ContentApiDependencies,
  payload: Readonly<Record<string, unknown>>,
): Promise<CloudActionData<'content.getCreator'>> {
  requireExactKeys(payload, ['contractVersion', 'creatorId']);
  validateContractVersion(payload);
  const creatorId = requireStableId(payload.creatorId, 'creatorId');
  const hasPublicContent = (await dependencies.reads.listContentRecords()).some((record) => {
    if (!isPublicCandidate(record) || record.creatorId !== creatorId) return false;
    try {
      return projectContent(record, 'THUMBNAIL', assertValidNow(dependencies.now())).creatorId === creatorId;
    } catch {
      return false;
    }
  });
  if (!hasPublicContent) notFound('CREATOR', creatorId);
  const creatorRaw = await dependencies.reads.getCreatorRecord(creatorId);
  if (creatorRaw === null) notFound('CREATOR', creatorId);
  const creator = parseCreator(creatorRaw);
  if (creator.creatorId !== creatorId) throw new Error('Creator projection identifier mismatch');
  return { creator };
}

async function listRelatedEvents(
  dependencies: ContentApiDependencies,
  payload: Readonly<Record<string, unknown>>,
): Promise<CloudActionData<'content.listRelatedEvents'>> {
  requireExactKeys(payload, ['contractVersion', 'contentId', 'cityId']);
  validateContractVersion(payload);
  const contentId = requireStableId(payload.contentId, 'contentId');
  const cityId = payload.cityId === undefined ? undefined : requireCityId(payload.cityId);
  const contentRaw = await dependencies.reads.getContentRecord(contentId);
  if (!isPublicCandidate(contentRaw)) notFound('CONTENT', contentId);
  const content = parsePublishedContent(contentRaw);
  const candidates = await dependencies.reads.getRelatedEventCandidates(content.relatedEventIds);
  const relatedIds = new Set(content.relatedEventIds);
  const emittedIds = new Set<string>();
  const events: PublicEventProjection[] = [];
  let filteredUnavailableCount = 0;
  for (const candidate of candidates) {
    try {
      assertProjectionReadable(candidate.readState);
      const event = parseReadOnlyProjection('PublicEventProjection', candidate.projection);
      if (!relatedIds.has(event.eventId) || emittedIds.has(event.eventId)) {
        filteredUnavailableCount += 1;
        continue;
      }
      if (event.state !== EventState.PUBLISHED || event.publicationState !== PublicationState.PUBLISHED) {
        filteredUnavailableCount += 1;
        continue;
      }
      if (cityId !== undefined && event.cityId !== cityId) continue;
      events.push(event);
      emittedIds.add(event.eventId);
    } catch (error) {
      if (error instanceof SafeApiError && error.code === ApiErrorCode.PROJECTION_STALE) throw error;
      filteredUnavailableCount += 1;
    }
  }
  return { events: Object.freeze(events), filteredUnavailableCount };
}

function idempotencyPayload(value: Readonly<Record<string, JsonValue>>): JsonValue {
  return value;
}

async function createIntent(
  dependencies: ContentApiDependencies,
  payload: Readonly<Record<string, unknown>>,
  requestId: string,
): Promise<CloudActionData<'content.intent.create'>> {
  requireExactKeys(payload, ['contractVersion', 'idempotencyKey', 'expectedVersion', 'contentId', 'message']);
  validateContractVersion(payload);
  if (payload.expectedVersion !== undefined
      && (!Number.isSafeInteger(payload.expectedVersion) || (payload.expectedVersion as number) < 1)) {
    validationFailed('expectedVersion', 'POSITIVE_INTEGER_WHEN_REACTIVATING');
  }
  const expectedVersion = payload.expectedVersion as number | undefined;
  const contentId = requireStableId(payload.contentId, 'contentId') as ContentId;
  const purposeInput = parsePurpose(payload.message);
  const principal = await requireTrustedPrincipal(dependencies.getWxContext, dependencies.loadPrincipal);
  const userId = requirePrincipalUser(principal);
  const idempotencyKey = requireIdempotencyKey(payload.idempotencyKey);
  const now = assertValidNow(dependencies.now());
  const claim = createIdempotencyClaim({
    functionName: 'contentApi',
    action: 'content.intent.create',
    openId: principal.openId,
    key: idempotencyKey,
    payload: idempotencyPayload({
      contractVersion: payload.contractVersion === undefined ? null : '1.0.0',
      contentId,
      message: purposeInput.raw,
      expectedVersion: expectedVersion ?? null,
    }),
    requestId: requestId as RequestId,
    expiresAt: idempotencyExpiry(now),
  });
  return dependencies.intents.runTransaction(async (transaction) => {
    const existingKey = await transaction.getIdempotency(claim.namespace);
    const disposition = assertIdempotencyCompatible(claim, existingKey);
    if (disposition === 'REPLAY' && existingKey !== null) {
      assertReplayOwner(existingKey.responseData, userId);
      return existingKey.responseData;
    }
    if (disposition === 'IN_PROGRESS') conflict('IDEMPOTENCY_IN_PROGRESS');
    const contentRaw = await transaction.getContentRecord(contentId);
    if (!isPublicCandidate(contentRaw)) notFound('CONTENT', contentId);
    parsePublishedContent(contentRaw);
    const existingIntent = await transaction.getIntentByUserContent(userId, contentId);
    if (existingIntent?.state === 'ACTIVE') {
      if (expectedVersion !== undefined) requireExpectedVersion(expectedVersion, existingIntent.version);
      const responseData = deepFreezeClone({ intent: projectIntent(existingIntent) });
      await transaction.putIdempotency(completedIdempotency({ claim, responseData }));
      return responseData;
    }
    let intent: Readonly<ContentIntentRecord>;
    if (existingIntent?.state === 'CANCELLED') {
      if (expectedVersion === undefined) validationFailed('expectedVersion', 'REQUIRED_TO_REACTIVATE_CANCELLED_INTENT');
      requireExpectedVersion(expectedVersion, existingIntent.version);
      const version = (existingIntent.version + 1) as OptimisticVersion;
      const historyEntry: ContentIntentHistoryEntry = Object.freeze({
        state: 'ACTIVE',
        purpose: purposeInput.purpose,
        ...(purposeInput.message === undefined ? {} : { message: purposeInput.message }),
        version,
        recordedAt: now,
      });
      intent = Object.freeze({
        _id: existingIntent._id,
        contentId: existingIntent.contentId,
        userId: existingIntent.userId,
        purpose: purposeInput.purpose,
        ...(purposeInput.message === undefined ? {} : { message: purposeInput.message }),
        state: 'ACTIVE',
        version,
        createdAt: existingIntent.createdAt,
        updatedAt: now,
        history: Object.freeze([...existingIntent.history, historyEntry]),
      }) as Readonly<ContentIntentRecord>;
    } else {
      if (expectedVersion !== undefined) validationFailed('expectedVersion', 'NOT_APPLICABLE_TO_NEW_INTENT');
      const version = 1 as OptimisticVersion;
      const historyEntry: ContentIntentHistoryEntry = Object.freeze({
        state: 'ACTIVE',
        purpose: purposeInput.purpose,
        ...(purposeInput.message === undefined ? {} : { message: purposeInput.message }),
        version,
        recordedAt: now,
      });
      intent = Object.freeze({
        _id: requireInternalStableId(dependencies.newId('content-intent'), 'intentId') as ContentIntentId,
        contentId,
        userId,
        purpose: purposeInput.purpose,
        ...(purposeInput.message === undefined ? {} : { message: purposeInput.message }),
        state: 'ACTIVE',
        history: Object.freeze([historyEntry]),
        version,
        createdAt: now,
        updatedAt: now,
      });
    }
    const responseData = deepFreezeClone({ intent: projectIntent(intent) });
    await transaction.putIntent(intent);
    await transaction.appendAudit(auditEntry({
      dependencies, principal, action: 'content.intent.create', targetId: intent._id, requestId, occurredAt: now,
    }));
    await transaction.putIdempotency(completedIdempotency({ claim, responseData }));
    return responseData;
  });
}

async function cancelIntent(
  dependencies: ContentApiDependencies,
  payload: Readonly<Record<string, unknown>>,
  requestId: string,
): Promise<CloudActionData<'content.intent.cancel'>> {
  requireExactKeys(payload, ['contractVersion', 'idempotencyKey', 'expectedVersion', 'intentId']);
  validateContractVersion(payload);
  const intentId = requireStableId(payload.intentId, 'intentId') as ContentIntentId;
  if (!Number.isSafeInteger(payload.expectedVersion) || (payload.expectedVersion as number) < 1) {
    validationFailed('expectedVersion', 'POSITIVE_INTEGER_REQUIRED');
  }
  const expectedVersion = payload.expectedVersion as number;
  const principal = await requireTrustedPrincipal(dependencies.getWxContext, dependencies.loadPrincipal);
  const userId = requirePrincipalUser(principal);
  const idempotencyKey = requireIdempotencyKey(payload.idempotencyKey);
  const now = assertValidNow(dependencies.now());
  const claim = createIdempotencyClaim({
    functionName: 'contentApi',
    action: 'content.intent.cancel',
    openId: principal.openId,
    key: idempotencyKey,
    payload: idempotencyPayload({
      contractVersion: payload.contractVersion === undefined ? null : '1.0.0',
      intentId,
      expectedVersion,
    }),
    requestId: requestId as RequestId,
    expiresAt: idempotencyExpiry(now),
  });
  return dependencies.intents.runTransaction(async (transaction) => {
    const existingKey = await transaction.getIdempotency(claim.namespace);
    const disposition = assertIdempotencyCompatible(claim, existingKey);
    if (disposition === 'REPLAY' && existingKey !== null) {
      assertReplayOwner(existingKey.responseData, userId);
      return existingKey.responseData;
    }
    if (disposition === 'IN_PROGRESS') conflict('IDEMPOTENCY_IN_PROGRESS');
    const current = await transaction.getIntentById(intentId);
    if (current === null) notFound('CONTENT_INTENT', intentId);
    if (current.userId !== userId) {
      throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'The resource is not owned by this account.', {
        details: { code: ApiErrorCode.FORBIDDEN, policy: 'OBJECT_OWNER_REQUIRED' },
      });
    }
    if (current.state !== 'ACTIVE') conflict('INTENT_NOT_ACTIVE');
    requireExpectedVersion(expectedVersion, current.version);
    const cancelled = Object.freeze({
      ...current,
      state: 'CANCELLED' as const,
      version: (current.version + 1) as OptimisticVersion,
      updatedAt: now,
      history: Object.freeze([
        ...current.history,
        Object.freeze({
          state: 'CANCELLED' as const,
          purpose: current.purpose,
          ...(current.message === undefined ? {} : { message: current.message }),
          version: (current.version + 1) as OptimisticVersion,
          recordedAt: now,
        }),
      ]),
    });
    const responseData = deepFreezeClone({ intent: projectIntent(cancelled) });
    await transaction.putIntent(cancelled);
    await transaction.appendAudit(auditEntry({
      dependencies, principal, action: 'content.intent.cancel', targetId: intentId, requestId, occurredAt: now,
    }));
    await transaction.putIdempotency(completedIdempotency({ claim, responseData }));
    return responseData;
  });
}

async function dispatch(
  dependencies: ContentApiDependencies,
  action: ContentAction,
  payload: Readonly<Record<string, unknown>>,
  requestId: string,
): Promise<ContentActionResult> {
  switch (action) {
    case 'content.list': return listContent(dependencies, payload);
    case 'content.get': return getContent(dependencies, payload);
    case 'content.listCollections': return listCollections(dependencies, payload);
    case 'content.getCreator': return getCreator(dependencies, payload);
    case 'content.listRelatedEvents': return listRelatedEvents(dependencies, payload);
    case 'content.intent.create': return createIntent(dependencies, payload, requestId);
    case 'content.intent.cancel': return cancelIntent(dependencies, payload, requestId);
  }
}

export function createContentApiEndpoint(dependencies: ContentApiDependencies): ContentApiEndpoint {
  if (typeof dependencies?.getWxContext !== 'function'
      || typeof dependencies.loadPrincipal !== 'function'
      || typeof dependencies.now !== 'function'
      || typeof dependencies.newId !== 'function'
      || typeof dependencies.reads?.listContentRecords !== 'function'
      || typeof dependencies.intents?.runTransaction !== 'function') {
    throw new Error('ContentApiDependencies are incomplete');
  }
  const main = async (event: unknown): Promise<ApiResult<ContentActionResult>> => {
    const fallbackRequestId = responseRequestId(event);
    try {
      const request = validateCallEnvelope(event, ACTIONS);
      const data = await dispatch(dependencies, request.action, request.payload, request.requestId);
      return success(request.requestId, data);
    } catch (error) {
      return safeFailureFromError(
        fallbackRequestId,
        error instanceof Error ? error : new Error('Non-error thrown at contentApi boundary'),
      );
    }
  };
  return Object.freeze({
    actions: ACTIONS,
    writeGuardPlans: CONTRACT_ENDPOINT.writeGuardPlans,
    main,
  });
}
