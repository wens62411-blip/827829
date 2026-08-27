import { createHash, createHmac } from 'node:crypto';
import type { CityId } from '../../miniprogram/shared/constants/geography';
import { CITY_DIRECTORY } from '../../miniprogram/shared/constants/geography';
import {
  FriendshipState,
  RecordOrigin,
  ReviewStatus,
  RuntimeMode,
  VerificationState,
  Visibility,
} from '../../miniprogram/shared/types/enums';
import type {
  RuntimeMode as RuntimeModeValue,
  Visibility as VisibilityValue,
} from '../../miniprogram/shared/types/enums';
import type {
  AuditEntryProjection,
  ProfilePrivateDto,
  PublicCardProjection,
  PublicEventProjection,
  PublicVerificationClaimProjection,
  ViewerRelationshipProjection,
} from '../../miniprogram/shared/types/projections';
import type {
  CardId,
  MediaAssetId,
  OptimisticVersion,
  RequestId,
  ShareTokenId,
  StableId,
  UserId,
  UtcInstant,
} from '../../miniprogram/shared/types/primitives';
import type { CloudAction } from '../../miniprogram/shared/contracts';
import type { TrustedWxContext } from '../_shared/auth';
import type { AuditAppend } from '../_shared/audit';
import { parseReadOnlyProjection } from '../_shared/projections';

export const PROFILE_FIELD_KEYS = [
  'displayName',
  'avatarAssetId',
  'cityId',
  'biography',
  'headline',
  'industry',
  'company',
  'position',
  'experience',
  'interests',
] as const;

export type ProfileFieldKey = (typeof PROFILE_FIELD_KEYS)[number];

export const PERMANENTLY_PRIVATE_FIELD_KEYS = [
  'phone',
  'email',
  'governmentId',
  'verificationEvidenceUrls',
  'wechatIdentifiers',
  'riskControl',
] as const;

export type PermanentlyPrivateFieldKey = (typeof PERMANENTLY_PRIVATE_FIELD_KEYS)[number];

export const SHARE_ALLOWED_FIELD_KEYS = [
  ...PROFILE_FIELD_KEYS,
  'claims',
] as const;

export type ShareAllowedFieldKey = (typeof SHARE_ALLOWED_FIELD_KEYS)[number];

export type ProfileVisibility = Readonly<Record<ProfileFieldKey, VisibilityValue>>
  & Readonly<Record<PermanentlyPrivateFieldKey, typeof Visibility.PRIVATE>>;

export interface InternalRiskFields {
  readonly flags: readonly string[];
  readonly lastEvaluatedAt?: UtcInstant;
}

/**
 * Authoritative private aggregate. Rich optional fields intentionally remain
 * internal until a future frozen DTO explicitly exposes them.
 */
export interface PrivateProfileRecord {
  readonly _id: StableId<'profile'>;
  readonly userId: UserId;
  readonly displayName: string;
  readonly avatarAssetId?: MediaAssetId;
  readonly cityId?: CityId;
  readonly biography?: string;
  readonly headline?: string;
  readonly industry?: string;
  readonly company?: string;
  readonly position?: string;
  readonly experience?: readonly string[];
  readonly interests?: readonly string[];
  readonly phone?: string;
  readonly email?: string;
  readonly governmentId?: string;
  readonly verificationEvidenceUrls?: readonly string[];
  readonly wechatIdentifiers?: Readonly<Record<string, string>>;
  readonly riskControl?: InternalRiskFields;
  readonly visibility: ProfileVisibility;
  /** Latest private aggregate version that cards_public must acknowledge. */
  readonly requiredProjectionVersion: number;
  readonly version: number;
  readonly createdAt: UtcInstant;
  readonly updatedAt: UtcInstant;
}

export interface UserRecord {
  readonly _id: UserId;
  readonly openIdHash: string;
  readonly accountState: 'ACTIVE' | 'DISABLED';
  readonly roles: readonly ('MEMBER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN')[];
  readonly version: number;
  readonly createdAt: UtcInstant;
  readonly updatedAt: UtcInstant;
}

/** The stored public aggregate contains no private-only fields. */
export interface PublicCardRecord extends PublicCardProjection {
  readonly sourceProfileVersion: OptimisticVersion;
}

export interface ShareTokenRecord {
  readonly _id: ShareTokenId;
  readonly ownerUserId: UserId;
  readonly targetType: 'CARD' | 'EVENT';
  readonly targetId: CardId | StableId<'event'>;
  readonly tokenDigest: string;
  readonly purpose: 'WECHAT_FORWARD' | 'MINIPROGRAM_QR';
  readonly allowedFields: readonly ShareAllowedFieldKey[];
  readonly expiresAt: UtcInstant;
  readonly revoked: boolean;
  readonly revokedAt?: UtcInstant;
  readonly version: number;
  readonly createdAt: UtcInstant;
  readonly updatedAt: UtcInstant;
}

export interface StoredIdempotencyRecord {
  readonly namespace: string;
  readonly requestFingerprint: string;
  readonly requestId: RequestId;
  readonly status: 'COMPLETED';
  readonly expiresAt: string;
  readonly createdAt: UtcInstant;
  /** Sanitized result only. Raw share tokens are never persisted here. */
  readonly result: unknown;
}

export interface QrMediaRecord {
  readonly _id: MediaAssetId;
  readonly ownerUserId: UserId;
  readonly domain: 'CARD_SHARE' | 'EVENT_SHARE';
  readonly storageFileId: string;
  readonly rights: {
    readonly state: 'CLAIMED';
    readonly rightsHolderName: string;
    readonly sourceDescription: string;
    readonly permittedUses: readonly ['SHARE'];
  };
  readonly publicState: 'PRIVATE';
  readonly version: 1;
  readonly createdAt: UtcInstant;
  readonly updatedAt: UtcInstant;
}

export interface IdentityReader {
  findUserByOpenIdHash(openIdHash: string): Promise<Readonly<UserRecord> | null>;
  findUserById(userId: UserId): Promise<Readonly<UserRecord> | null>;
  findProfileByUserId(userId: UserId): Promise<Readonly<PrivateProfileRecord> | null>;
  findCardByOwnerUserId(userId: UserId): Promise<Readonly<PublicCardRecord> | null>;
  findCardById(cardId: CardId): Promise<Readonly<PublicCardRecord> | null>;
  findShareById(shareTokenId: ShareTokenId): Promise<Readonly<ShareTokenRecord> | null>;
  findShareByTokenDigest(tokenDigest: string): Promise<Readonly<ShareTokenRecord> | null>;
  findRelationship(
    viewerUserId: UserId,
    subjectUserId: UserId,
  ): Promise<Readonly<ViewerRelationshipProjection> | null>;
  listVerificationClaims(subjectUserId: UserId): Promise<readonly unknown[]>;
  findApprovedMediaUrl(mediaAssetId: MediaAssetId): Promise<string | null>;
  findPublicEvent(eventId: StableId<'event'>): Promise<Readonly<PublicEventProjection> | null>;
  findEventShareOwnerUserId(eventId: StableId<'event'>): Promise<UserId | null>;
  findIdempotency(namespace: string): Promise<Readonly<StoredIdempotencyRecord> | null>;
}

export interface IdentityTransaction extends IdentityReader {
  saveUser(record: Readonly<UserRecord>): Promise<void>;
  saveProfile(record: Readonly<PrivateProfileRecord>): Promise<void>;
  saveCard(record: Readonly<PublicCardRecord>): Promise<void>;
  saveShare(record: Readonly<ShareTokenRecord>): Promise<void>;
  saveQrMedia(record: Readonly<QrMediaRecord>): Promise<void>;
  saveIdempotency(record: Readonly<StoredIdempotencyRecord>): Promise<void>;
  appendAudit(record: Readonly<AuditAppend>): Promise<void>;
}

export interface IdentityStore extends IdentityReader {
  runTransaction<Result>(
    operation: (transaction: IdentityTransaction) => Promise<Result>,
  ): Promise<Result>;
}

export interface QrCodeGenerator {
  /** Must be retry-safe for the supplied operationKey. */
  generate(input: Readonly<{
    operationKey: string;
    page: 'pages/card-share/index' | 'pages/event-share/index';
    scene: string;
  }>): Promise<Readonly<{ storageFileId: string }>>;
}

export interface IdentityRuntime {
  readonly getWxContext: () => TrustedWxContext;
  readonly store: IdentityStore;
  readonly qrCode: QrCodeGenerator;
  /** Server-managed secret with at least 256 bits of entropy. */
  readonly tokenSigningKey: string | Uint8Array;
  readonly runtimeMode: RuntimeModeValue;
  readonly now?: () => Date;
  readonly defaultShareTtlMs?: number;
  readonly sessionTtlMs?: number;
  readonly defaultShareAllowedFields?: readonly ShareAllowedFieldKey[];
}

export interface SelectedProfileFields {
  readonly displayName?: string;
  readonly avatarAssetId?: MediaAssetId;
  readonly cityId?: CityId;
  readonly biography?: string;
  readonly headline?: string;
  readonly industry?: string;
  readonly company?: string;
  readonly position?: string;
  readonly experience?: readonly string[];
  readonly interests?: readonly string[];
}

export type ViewerTier = 'OWNER' | 'FRIEND' | 'STRANGER';

export const DEFAULT_PROFILE_VISIBILITY: ProfileVisibility = Object.freeze({
  displayName: Visibility.PUBLIC,
  avatarAssetId: Visibility.PUBLIC,
  cityId: Visibility.PUBLIC,
  biography: Visibility.PUBLIC,
  headline: Visibility.PRIVATE,
  industry: Visibility.PRIVATE,
  company: Visibility.PRIVATE,
  position: Visibility.PRIVATE,
  experience: Visibility.PRIVATE,
  interests: Visibility.PRIVATE,
  phone: Visibility.PRIVATE,
  email: Visibility.PRIVATE,
  governmentId: Visibility.PRIVATE,
  verificationEvidenceUrls: Visibility.PRIVATE,
  wechatIdentifiers: Visibility.PRIVATE,
  riskControl: Visibility.PRIVATE,
});

export const DEFAULT_SHARE_ALLOWED_FIELDS: readonly ShareAllowedFieldKey[] = Object.freeze([
  ...SHARE_ALLOWED_FIELD_KEYS,
]);

const SAFE_ALIAS = 'AB Club 会员';
const TOKEN_PATTERN = /^sc_[A-Za-z0-9_-]{27}$/;
const SCENE_PATTERN = /^sc_[A-Za-z0-9_-]{27}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function visibilityAllows(value: VisibilityValue, tier: ViewerTier): boolean {
  if (tier === 'OWNER') return true;
  if (value === Visibility.PUBLIC) return true;
  return tier === 'FRIEND' && value === Visibility.FRIENDS_ONLY;
}

function allowedByShareScope(
  field: ProfileFieldKey,
  allowedFields: ReadonlySet<ShareAllowedFieldKey> | undefined,
): boolean {
  return allowedFields === undefined || allowedFields.has(field);
}

/**
 * Field-level privacy enforcement used before any DTO projection. Permanently
 * private fields are not part of the return type and therefore cannot be
 * selected even if a malformed record tries to mark them public.
 */
export function selectVisibleProfileFields(
  profile: Readonly<PrivateProfileRecord>,
  tier: ViewerTier,
  allowedFields?: readonly ShareAllowedFieldKey[],
): Readonly<SelectedProfileFields> {
  const scope = allowedFields === undefined ? undefined : new Set(allowedFields);
  const selected: {
    displayName?: string;
    avatarAssetId?: MediaAssetId;
    cityId?: CityId;
    biography?: string;
    headline?: string;
    industry?: string;
    company?: string;
    position?: string;
    experience?: readonly string[];
    interests?: readonly string[];
  } = {};

  for (const field of PROFILE_FIELD_KEYS) {
    if (!allowedByShareScope(field, scope)) continue;
    const visibility = profile.visibility[field];
    if (!visibilityAllows(visibility, tier)) continue;
    const value = profile[field];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      selected[field as 'experience' | 'interests'] = Object.freeze([...value]);
    } else {
      Object.assign(selected, { [field]: value });
    }
  }

  return Object.freeze(selected);
}

export function defaultRelationship(
  viewerUserId: UserId,
  subjectUserId: UserId,
  at: UtcInstant,
): Readonly<ViewerRelationshipProjection> {
  return Object.freeze({
    version: 1 as OptimisticVersion,
    createdAt: at,
    updatedAt: at,
    viewerUserId,
    subjectUserId,
    viewerBlockedSubject: false,
    subjectBlockedViewer: false,
    mayViewFriendsOnlyFields: false,
    sourceVersion: 1 as OptimisticVersion,
  });
}

export function relationshipTier(
  viewerUserId: UserId,
  subjectUserId: UserId,
  relationship: Readonly<ViewerRelationshipProjection>,
): ViewerTier {
  if (viewerUserId === subjectUserId) return 'OWNER';
  return relationship.friendshipState === FriendshipState.ACCEPTED
      && relationship.mayViewFriendsOnlyFields
      && !relationship.viewerBlockedSubject
      && !relationship.subjectBlockedViewer
    ? 'FRIEND'
    : 'STRANGER';
}

export function selectEffectiveClaims(
  values: readonly unknown[],
  subjectUserId: UserId,
  evaluatedAt: UtcInstant,
): readonly PublicVerificationClaimProjection[] {
  const evaluated = Date.parse(evaluatedAt);
  const result: PublicVerificationClaimProjection[] = [];

  for (const value of values) {
    try {
      const claim = parseReadOnlyProjection('PublicVerificationClaimProjection', value);
      const validUntil = claim.validUntil === undefined
        ? Number.POSITIVE_INFINITY
        : Date.parse(claim.validUntil);
      if (claim.subjectUserId !== subjectUserId
          || claim.reviewStatus !== ReviewStatus.APPROVED
          || claim.verificationState !== VerificationState.HUMAN_REVIEWED
          || claim.publicVisible !== true
          || evaluated < Date.parse(claim.validFrom)
          || evaluated >= validUntil) continue;
      result.push(claim);
    } catch {
      // A malformed, private, AI-only, non-approved, revoked, or expired record
      // is denied rather than partially projected.
    }
  }

  return Object.freeze(result);
}

export function profileCompletionPercent(profile: Readonly<PrivateProfileRecord>): number {
  const values = [profile.displayName, profile.avatarAssetId, profile.cityId, profile.biography];
  const complete = values.filter((value) => typeof value === 'string' && value.trim().length > 0).length;
  return complete * 25;
}

function maskPhone(value: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 4) return undefined;
  return `***${digits.slice(-4)}`;
}

function maskEmail(value: string): string | undefined {
  const separator = value.lastIndexOf('@');
  if (separator <= 0 || separator === value.length - 1) return undefined;
  const local = value.slice(0, separator);
  const domain = value.slice(separator + 1);
  return `${local.slice(0, 1)}***@${domain}`;
}

export function toProfilePrivateDto(
  profile: Readonly<PrivateProfileRecord>,
): Readonly<ProfilePrivateDto> {
  const dto: {
    profileId: StableId<'profile'>;
    userId: UserId;
    displayName: string;
    phoneMasked?: string;
    emailMasked?: string;
    cityId?: CityId;
    biography?: string;
    avatarAssetId?: MediaAssetId;
    version: OptimisticVersion;
    createdAt: UtcInstant;
    updatedAt: UtcInstant;
  } = {
    profileId: profile._id,
    userId: profile.userId,
    displayName: profile.displayName,
    version: profile.version as OptimisticVersion,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
  if (profile.phone !== undefined) {
    const masked = maskPhone(profile.phone);
    if (masked !== undefined) dto.phoneMasked = masked;
  }
  if (profile.email !== undefined) {
    const masked = maskEmail(profile.email);
    if (masked !== undefined) dto.emailMasked = masked;
  }
  if (profile.cityId !== undefined) dto.cityId = profile.cityId;
  if (profile.biography !== undefined) dto.biography = profile.biography;
  if (profile.avatarAssetId !== undefined) dto.avatarAssetId = profile.avatarAssetId;
  return Object.freeze(dto);
}

export function toPublicCardProjection(
  record: Readonly<PublicCardRecord>,
  claims: readonly PublicVerificationClaimProjection[],
): Readonly<PublicCardProjection> {
  const card: {
    cardId: CardId;
    ownerUserId: UserId;
    displayName: string;
    headline?: string;
    cityId?: CityId;
    avatarUrl?: string;
    biography?: string;
    visibility: VisibilityValue;
    claims: readonly PublicVerificationClaimProjection[];
    origin: typeof RecordOrigin.REAL;
    verificationState: typeof VerificationState.USER_DECLARED;
    version: OptimisticVersion;
    createdAt: UtcInstant;
    updatedAt: UtcInstant;
  } = {
    cardId: record.cardId,
    ownerUserId: record.ownerUserId,
    displayName: record.displayName,
    visibility: record.visibility,
    claims: Object.freeze([...claims]),
    origin: RecordOrigin.REAL,
    verificationState: VerificationState.USER_DECLARED,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
  if (record.headline !== undefined) card.headline = record.headline;
  if (record.cityId !== undefined) card.cityId = record.cityId;
  if (record.avatarUrl !== undefined) card.avatarUrl = record.avatarUrl;
  if (record.biography !== undefined) card.biography = record.biography;
  return Object.freeze(card);
}

export function buildViewerCard(
  base: Readonly<PublicCardRecord>,
  visible: Readonly<SelectedProfileFields>,
  claims: readonly PublicVerificationClaimProjection[],
  tier: ViewerTier,
  avatarUrl?: string,
  allowedFields?: readonly ShareAllowedFieldKey[],
): Readonly<PublicCardProjection> {
  const scope = allowedFields === undefined ? undefined : new Set(allowedFields);
  const card: {
    cardId: CardId;
    ownerUserId: UserId;
    displayName: string;
    headline?: string;
    cityId?: CityId;
    avatarUrl?: string;
    biography?: string;
    visibility: VisibilityValue;
    claims: readonly PublicVerificationClaimProjection[];
    origin: typeof RecordOrigin.REAL;
    verificationState: typeof VerificationState.USER_DECLARED;
    version: OptimisticVersion;
    createdAt: UtcInstant;
    updatedAt: UtcInstant;
  } = {
    cardId: base.cardId,
    ownerUserId: base.ownerUserId,
    displayName: visible.displayName ?? SAFE_ALIAS,
    visibility: tier === 'OWNER'
      ? Visibility.PRIVATE
      : tier === 'FRIEND' ? Visibility.FRIENDS_ONLY : Visibility.PUBLIC,
    claims: scope === undefined || scope.has('claims') ? Object.freeze([...claims]) : Object.freeze([]),
    origin: RecordOrigin.REAL,
    verificationState: VerificationState.USER_DECLARED,
    version: base.version,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  };
  if (visible.headline !== undefined) card.headline = visible.headline;
  if (visible.cityId !== undefined) card.cityId = visible.cityId;
  if (visible.biography !== undefined) card.biography = visible.biography;
  if (visible.avatarAssetId !== undefined && avatarUrl !== undefined) card.avatarUrl = avatarUrl;
  return Object.freeze(card);
}

export function buildPublicCardRecord(input: Readonly<{
  profile: PrivateProfileRecord;
  previous: PublicCardRecord | null;
  claims: readonly PublicVerificationClaimProjection[];
  avatarUrl?: string;
  now: UtcInstant;
}>): Readonly<PublicCardRecord> {
  const selected = selectVisibleProfileFields(input.profile, 'STRANGER');
  const record: {
    cardId: CardId;
    ownerUserId: UserId;
    displayName: string;
    headline?: string;
    cityId?: CityId;
    avatarUrl?: string;
    biography?: string;
    visibility: typeof Visibility.PUBLIC;
    claims: readonly PublicVerificationClaimProjection[];
    origin: typeof RecordOrigin.REAL;
    verificationState: typeof VerificationState.USER_DECLARED;
    sourceProfileVersion: OptimisticVersion;
    version: OptimisticVersion;
    createdAt: UtcInstant;
    updatedAt: UtcInstant;
  } = {
    cardId: input.previous?.cardId ?? (`card_${input.profile.userId}` as CardId),
    ownerUserId: input.profile.userId,
    displayName: selected.displayName ?? SAFE_ALIAS,
    visibility: Visibility.PUBLIC,
    claims: Object.freeze([...input.claims]),
    origin: RecordOrigin.REAL,
    verificationState: VerificationState.USER_DECLARED,
    sourceProfileVersion: input.profile.version as OptimisticVersion,
    version: ((input.previous?.version ?? 0) + 1) as OptimisticVersion,
    createdAt: input.previous?.createdAt ?? input.now,
    updatedAt: input.now,
  };
  if (selected.headline !== undefined) record.headline = selected.headline;
  if (selected.cityId !== undefined) record.cityId = selected.cityId;
  if (selected.biography !== undefined) record.biography = selected.biography;
  if (selected.avatarAssetId !== undefined && input.avatarUrl !== undefined) record.avatarUrl = input.avatarUrl;
  return Object.freeze(record);
}

export function validateProfileVisibility(value: unknown): value is ProfileVisibility {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Readonly<Record<string, unknown>>;
  const exactKeys = [...PROFILE_FIELD_KEYS, ...PERMANENTLY_PRIVATE_FIELD_KEYS].sort();
  const actualKeys = Object.keys(record).sort();
  if (actualKeys.length !== exactKeys.length
      || !actualKeys.every((key, index) => key === exactKeys[index])) return false;
  if (!PROFILE_FIELD_KEYS.every((key) => Object.values(Visibility).includes(record[key] as VisibilityValue))) {
    return false;
  }
  return PERMANENTLY_PRIVATE_FIELD_KEYS.every((key) => record[key] === Visibility.PRIVATE);
}

export function isKnownCityId(value: string): value is CityId {
  return CITY_DIRECTORY.some((city) => city.id === value);
}

export function hashPrivateIdentifier(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function deriveShareToken(signingKey: string | Uint8Array, shareTokenId: ShareTokenId): string {
  const keyLength = typeof signingKey === 'string'
    ? Buffer.byteLength(signingKey, 'utf8')
    : signingKey.byteLength;
  if (keyLength < 32) throw new Error('tokenSigningKey must contain at least 32 bytes');
  const bearer = createHmac('sha256', signingKey)
    .update(`ab-club-share:v1:${shareTokenId}`, 'utf8')
    .digest('base64url');
  return `sc_${bearer.slice(0, 27)}`;
}

export function hashShareToken(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function isValidShareToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

export function isValidQrScene(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 32 && SCENE_PATTERN.test(value);
}

export function isSha256Digest(value: unknown): value is string {
  return typeof value === 'string' && SHA256_PATTERN.test(value);
}

export function isValidRuntimeMode(value: unknown): value is RuntimeModeValue {
  return Object.values(RuntimeMode).includes(value as RuntimeModeValue);
}

export type SafeAuditProjection = Pick<AuditEntryProjection,
  'auditEntryId' | 'actorUserId' | 'actorRole' | 'action' | 'targetType'
  | 'targetId' | 'requestId' | 'occurredAt' | 'result' | 'reasonCode'>;

export interface WriteAuditTarget {
  readonly targetType: string;
  readonly targetId: StableId;
  readonly action: CloudAction;
}
