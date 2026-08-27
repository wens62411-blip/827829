import type { MediaRightsState } from './enums';

export const CONTRACT_VERSION = '1.0.0' as const;
export type ContractVersion = typeof CONTRACT_VERSION;

type TaggedString<Tag extends string> = string & { readonly __tag: Tag };
type TaggedNumber<Tag extends string> = number & { readonly __tag: Tag };

export type StableId<Tag extends string = string> = TaggedString<`id:${Tag}`>;
export type UserId = StableId<'user'>;
export type ProfileId = StableId<'profile'>;
export type CardId = StableId<'card'>;
export type ShareTokenId = StableId<'share-token'>;
export type FriendshipId = StableId<'friendship'>;
export type ReportId = StableId<'report'>;
export type VerificationRequestId = StableId<'verification-request'>;
export type VerificationClaimId = StableId<'verification-claim'>;
export type ClubNodeId = StableId<'club-node'>;
export type OrganizerId = StableId<'organizer'>;
export type EventId = StableId<'event'>;
export type EnrollmentId = StableId<'enrollment'>;
export type ContentId = StableId<'content'>;
export type CollectionId = StableId<'collection'>;
export type ContentIntentId = StableId<'content-intent'>;
export type MediaAssetId = StableId<'media-asset'>;
export type ReviewCaseId = StableId<'review-case'>;
export type AuditEntryId = StableId<'audit-entry'>;
export type ProjectionInvalidationId = StableId<'projection-invalidation'>;

/** RFC 3339 UTC instant ending in Z. Validation is required at every boundary. */
export type UtcInstant = TaggedString<'utc-instant'>;
/** Exact IANA zone names used by the frozen city directory. */
export const IanaTimezone = {
  ASIA_SHANGHAI: 'Asia/Shanghai',
  EUROPE_ZURICH: 'Europe/Zurich',
  EUROPE_ROME: 'Europe/Rome',
  EUROPE_PARIS: 'Europe/Paris',
  AUSTRALIA_MELBOURNE: 'Australia/Melbourne',
  AUSTRALIA_SYDNEY: 'Australia/Sydney',
  ASIA_SINGAPORE: 'Asia/Singapore',
  AMERICA_TORONTO: 'America/Toronto',
  AMERICA_VANCOUVER: 'America/Vancouver',
} as const;
export type IanaTimezone = (typeof IanaTimezone)[keyof typeof IanaTimezone];
export type PaginationCursor = TaggedString<'pagination-cursor'>;
export type OptimisticVersion = TaggedNumber<'optimistic-version'>;
export type IdempotencyKey = TaggedString<'idempotency-key'>;
export type RequestId = TaggedString<'request-id'>;
export type Sha256Digest = TaggedString<'sha256'>;

export interface CursorPageRequest {
  readonly cursor?: PaginationCursor;
  readonly limit: number;
}

export interface CursorPage<T> {
  readonly items: readonly T[];
  readonly nextCursor?: PaginationCursor;
  readonly hasMore: boolean;
}

export interface VersionedRecord {
  readonly version: OptimisticVersion;
  readonly createdAt: UtcInstant;
  readonly updatedAt: UtcInstant;
}

export interface IdempotentWrite {
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion?: OptimisticVersion;
}

export interface LocalizedName {
  readonly zh: string;
  readonly en: string;
}

export interface MediaRights {
  readonly state: MediaRightsState;
  readonly rightsHolderName: string;
  readonly sourceDescription: string;
  readonly permittedUses: readonly ('THUMBNAIL' | 'DETAIL' | 'SHARE')[];
  readonly validFrom?: UtcInstant;
  readonly validUntil?: UtcInstant;
  readonly reviewedAt?: UtcInstant;
  readonly evidenceDigest?: Sha256Digest;
}
