import { randomBytes, randomUUID } from 'node:crypto';
import type {
  CloudAction,
  CloudActionData,
} from '../../miniprogram/shared/contracts';
import type { ApiResult, ApiSuccess } from '../../miniprogram/shared/types/api';
import { ApiErrorCode } from '../../miniprogram/shared/types/api';
import {
  EventState,
  PublicationState,
  RuntimeMode,
} from '../../miniprogram/shared/types/enums';
import type {
  CardGetForViewerResponse,
  CardGetMineResponse,
  CardRefreshProjectionResponse,
  IdentityBootstrapResponse,
  ProfileGetMineResponse,
  ProfileUpdateMineResponse,
  ShareCreateQrSceneResponse,
  ShareCreateResponse,
  ShareResolveResponse,
  ShareRevokeResponse,
} from '../../miniprogram/shared/contracts/action-types';
import type {
  CardId,
  IdempotencyKey,
  MediaAssetId,
  OptimisticVersion,
  RequestId,
  ShareTokenId,
  StableId,
  UserId,
  UtcInstant,
} from '../../miniprogram/shared/types/primitives';
import type {
  PublicCardProjection,
  PublicEventProjection,
  ShareResolutionProjection,
  ViewerRelationshipProjection,
} from '../../miniprogram/shared/types/projections';
import {
  asUserId,
  requireTrustedOpenId,
  requireTrustedPrincipal,
} from '../_shared/auth';
import type { TrustedPrincipal } from '../_shared/auth';
import { createAuditAppend } from '../_shared/audit';
import { SafeApiError, safeFailureFromError } from '../_shared/errors';
import {
  assertIdempotencyCompatible,
  createIdempotencyClaim,
  requireIdempotencyKey,
} from '../_shared/idempotency';
import { parseReadOnlyProjection } from '../_shared/projections';
import {
  defineWriteGuardPlan,
  isPlainRecord,
  isValidRequestId,
  requireExpectedVersion,
  validateCallEnvelope,
} from '../_shared/validation';
import type { WriteGuardPlan } from '../_shared/validation';
import {
  buildPublicCardRecord,
  buildViewerCard,
  DEFAULT_PROFILE_VISIBILITY,
  DEFAULT_SHARE_ALLOWED_FIELDS,
  defaultRelationship,
  deriveShareToken,
  hashPrivateIdentifier,
  hashShareToken,
  isSha256Digest,
  isKnownCityId,
  isValidQrScene,
  isValidRuntimeMode,
  isValidShareToken,
  profileCompletionPercent,
  relationshipTier,
  selectEffectiveClaims,
  selectVisibleProfileFields,
  toProfilePrivateDto,
  toPublicCardProjection,
} from './domain';
import type {
  IdentityReader,
  IdentityRuntime,
  IdentityTransaction,
  PrivateProfileRecord,
  PublicCardRecord,
  QrMediaRecord,
  ShareAllowedFieldKey,
  ShareTokenRecord,
  StoredIdempotencyRecord,
  UserRecord,
  ViewerTier,
} from './domain';

export const IDENTITY_ACTIONS = [
  'identity.bootstrap', 'profile.getMine', 'profile.updateMine', 'card.getMine',
  'card.getForViewer', 'card.refreshProjection', 'share.create', 'share.resolve',
  'share.revoke', 'share.createQrScene',
] as const satisfies readonly CloudAction[];

export type IdentityAction = (typeof IDENTITY_ACTIONS)[number];

export const IDENTITY_WRITE_ACTIONS = [
  'identity.bootstrap', 'profile.updateMine', 'card.refreshProjection',
  'share.create', 'share.revoke', 'share.createQrScene',
] as const satisfies readonly IdentityAction[];

type IdentityResponse = CloudActionData<IdentityAction>;

export interface IdentityEndpoint {
  readonly actions: readonly IdentityAction[];
  readonly writeGuardPlans: Readonly<Partial<Record<IdentityAction, WriteGuardPlan>>>;
  readonly main: (
    event: unknown,
    context?: Readonly<Record<string, unknown>>,
  ) => Promise<ApiResult<IdentityResponse>>;
}

interface WriteOutcome<Data> {
  readonly data: Data;
  readonly storedResult: unknown;
  readonly targetType: string;
  readonly targetId: StableId;
}

interface ResolvedCardContext {
  readonly card: PublicCardProjection;
  readonly relationship: ViewerRelationshipProjection;
}

const CONTRACT_VERSION = '1.0.0';
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SHARE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000;
const DISPLAY_NAME_MAX = 80;
const BIOGRAPHY_MAX = 500;
const ASSET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function responseRequestId(event: unknown): RequestId {
  if (isPlainRecord(event) && isValidRequestId(event.requestId)) return event.requestId as RequestId;
  return `srv_${randomUUID()}` as RequestId;
}

function now(runtime: IdentityRuntime): UtcInstant {
  const instant = runtime.now?.() ?? new Date();
  if (!(instant instanceof Date) || Number.isNaN(instant.getTime())) {
    throw new Error('Identity runtime returned an invalid clock value');
  }
  return instant.toISOString() as UtcInstant;
}

function plusMilliseconds(value: UtcInstant, milliseconds: number): UtcInstant {
  return new Date(Date.parse(value) + milliseconds).toISOString() as UtcInstant;
}

function randomStableId<Tag extends string>(prefix: string, bytes = 18): StableId<Tag> {
  return `${prefix}_${randomBytes(bytes).toString('base64url')}` as StableId<Tag>;
}

function success<Data>(requestId: RequestId, data: Data): ApiSuccess<Data> {
  return { ok: true, data, requestId };
}

function validation(field: string, rule: string, message = 'The request payload is invalid.'): never {
  throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, message, {
    details: { code: ApiErrorCode.VALIDATION_FAILED, issues: [{ field, rule }] },
  });
}

function invalidRequest(field: string, reason: string, message = 'The request payload is invalid.'): never {
  throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, message, {
    details: { code: ApiErrorCode.INVALID_REQUEST, field, reason },
  });
}

function notFound(resourceType: string, resourceId?: StableId): never {
  throw new SafeApiError(ApiErrorCode.NOT_FOUND, 'The requested resource was not found.', {
    details: {
      code: ApiErrorCode.NOT_FOUND,
      resourceType,
      ...(resourceId === undefined ? {} : { resourceId }),
    },
  });
}

function assertPayloadKeys(
  payload: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
): void {
  const allowedSet = new Set(allowed);
  const extra = Object.keys(payload).find((key) => !allowedSet.has(key));
  if (extra !== undefined) invalidRequest(extra, 'UNEXPECTED_FIELD');
  if (payload.contractVersion !== CONTRACT_VERSION) {
    invalidRequest('contractVersion', 'UNSUPPORTED_CONTRACT_VERSION');
  }
}

function requireStableString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !STABLE_ID_PATTERN.test(value)) invalidRequest(field, 'MALFORMED_STABLE_ID');
  return value;
}

function requireVersionValue(value: unknown, field = 'expectedVersion'): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) validation(field, 'POSITIVE_INTEGER');
  return value as number;
}

function assertCurrentVersion(value: unknown, currentVersion: number): void {
  requireExpectedVersion(requireVersionValue(value), currentVersion);
}

function assertCreationVersion(value: unknown): void {
  if (value !== undefined && value !== 0) validation('expectedVersion', 'ZERO_OR_OMITTED_FOR_CREATE');
}

function requireUtc(value: unknown, field: string): UtcInstant {
  if (typeof value !== 'string' || !UTC_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    validation(field, 'RFC3339_UTC');
  }
  return value as UtcInstant;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asJsonPayload(payload: Readonly<Record<string, unknown>>): {
  readonly [key: string]: import('../_shared/idempotency').JsonValue;
} {
  return cloneJson(payload) as { readonly [key: string]: import('../_shared/idempotency').JsonValue };
}

function actorRole(principal: TrustedPrincipal | null): 'MEMBER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN' | 'SYSTEM' {
  return principal?.roles[0] ?? 'SYSTEM';
}

function requireRuntime(runtime: IdentityRuntime): void {
  if (runtime === null || typeof runtime !== 'object') throw new Error('Identity runtime is required');
  if (typeof runtime.getWxContext !== 'function'
      || runtime.store === null
      || typeof runtime.store !== 'object'
      || typeof runtime.store.runTransaction !== 'function'
      || runtime.qrCode === null
      || typeof runtime.qrCode !== 'object'
      || typeof runtime.qrCode.generate !== 'function'
      || !isValidRuntimeMode(runtime.runtimeMode)) {
    throw new Error('Identity runtime adapter is incomplete');
  }
  // Validates secret length without persisting or logging it.
  deriveShareToken(runtime.tokenSigningKey, 'share_AAAAAAAAAAAAAAAAAAAAAAAA' as ShareTokenId);
}

async function loadPrincipal(
  runtime: IdentityRuntime,
  reader: IdentityReader = runtime.store,
): Promise<TrustedPrincipal> {
  return requireTrustedPrincipal(runtime.getWxContext, async (openId) => {
    const user = await reader.findUserByOpenIdHash(hashPrivateIdentifier(openId));
    if (user === null) return null;
    return {
      openId,
      userId: user._id,
      roles: user.roles,
      accountState: user.accountState,
    };
  });
}

async function loadOptionalPrincipal(runtime: IdentityRuntime): Promise<TrustedPrincipal | null> {
  try {
    const openId = requireTrustedOpenId(runtime.getWxContext);
    const user = await runtime.store.findUserByOpenIdHash(hashPrivateIdentifier(openId));
    // Public resolution remains available, but a disabled account is treated
    // as anonymous and can never retain FRIENDS_ONLY access.
    if (user === null || user.accountState !== 'ACTIVE') return null;
    return {
      openId,
      userId: user._id,
      roles: user.roles,
      accountState: user.accountState,
    };
  } catch (error) {
    if (error instanceof SafeApiError && error.code === ApiErrorCode.AUTH_REQUIRED) return null;
    throw error;
  }
}

async function assertPrincipalStillActive(
  transaction: IdentityTransaction,
  principal: TrustedPrincipal,
): Promise<void> {
  if (principal.userId === undefined) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, 'Authentication is required.', {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true },
    });
  }
  const user = await transaction.findUserById(principal.userId);
  if (user === null || user.accountState !== 'ACTIVE') {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'This account cannot perform the action.', {
      details: { code: ApiErrorCode.FORBIDDEN, policy: 'ACTIVE_ACCOUNT_REQUIRED' },
    });
  }
}

async function executeWrite<Data>(input: Readonly<{
  runtime: IdentityRuntime;
  action: IdentityAction;
  requestId: RequestId;
  payload: Readonly<Record<string, unknown>>;
  openIdHash: string;
  principal: TrustedPrincipal | null;
  operation: (transaction: IdentityTransaction, instant: UtcInstant) => Promise<WriteOutcome<Data>>;
  replay: (
    storedResult: unknown,
    transaction: IdentityTransaction,
    instant: UtcInstant,
  ) => Data | Promise<Data>;
}>): Promise<Data> {
  const key = requireIdempotencyKey(input.payload.idempotencyKey);
  const instant = now(input.runtime);
  const claim = createIdempotencyClaim({
    functionName: 'identityApi',
    action: input.action,
    // The shared helper names this field openId; pass only its one-way digest.
    openId: input.openIdHash,
    key,
    payload: asJsonPayload(input.payload),
    requestId: input.requestId,
    expiresAt: plusMilliseconds(instant, IDEMPOTENCY_TTL_MS),
  });

  return input.runtime.store.runTransaction(async (transaction) => {
    if (input.principal !== null) await assertPrincipalStillActive(transaction, input.principal);
    const existing = await transaction.findIdempotency(claim.namespace);
    const decision = assertIdempotencyCompatible(claim, existing);
    if (decision === 'REPLAY') return input.replay(existing?.result, transaction, instant);
    if (decision === 'IN_PROGRESS') {
      throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, 'The original request is still being processed.', {
        retryable: true,
        details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: 'identityApi.idempotency' },
      });
    }

    const outcome = await input.operation(transaction, instant);
    const audit = createAuditAppend({
      auditEntryId: randomStableId<'audit-entry'>('audit'),
      ...(input.principal?.userId === undefined ? {} : { actorUserId: input.principal.userId }),
      actorRole: actorRole(input.principal),
      action: input.action,
      targetType: outcome.targetType,
      targetId: outcome.targetId,
      requestId: input.requestId,
      occurredAt: instant,
      result: 'SUCCEEDED',
    });
    const idempotency: StoredIdempotencyRecord = Object.freeze({
      ...claim,
      status: 'COMPLETED',
      createdAt: instant,
      result: cloneJson(outcome.storedResult),
    });
    await transaction.appendAudit(audit);
    await transaction.saveIdempotency(idempotency);
    return outcome.data;
  });
}

function requireProfile(profile: Readonly<PrivateProfileRecord> | null): Readonly<PrivateProfileRecord> {
  if (profile === null) notFound('PROFILE');
  return profile;
}

function requireCard(card: Readonly<PublicCardRecord> | null): Readonly<PublicCardRecord> {
  if (card === null) notFound('CARD');
  return card;
}

function assertCardCurrent(card: Readonly<PublicCardRecord>, profile: Readonly<PrivateProfileRecord>): void {
  if (card.sourceProfileVersion !== profile.requiredProjectionVersion
      || card.sourceProfileVersion !== profile.version) {
    throw new SafeApiError(ApiErrorCode.PROJECTION_STALE, 'The card projection must be refreshed.', {
      details: {
        code: ApiErrorCode.PROJECTION_STALE,
        projectionType: 'PublicCardProjection',
        requiredSourceVersion: profile.version as OptimisticVersion,
      },
    });
  }
}

async function loadRelationship(
  reader: IdentityReader,
  viewerUserId: UserId,
  subjectUserId: UserId,
  instant: UtcInstant,
): Promise<Readonly<ViewerRelationshipProjection>> {
  if (viewerUserId === subjectUserId) return defaultRelationship(viewerUserId, subjectUserId, instant);
  const value = await reader.findRelationship(viewerUserId, subjectUserId);
  if (value === null) return defaultRelationship(viewerUserId, subjectUserId, instant);
  const relationship = parseReadOnlyProjection('ViewerRelationshipProjection', value);
  if (relationship.viewerUserId !== viewerUserId || relationship.subjectUserId !== subjectUserId) {
    throw new SafeApiError(
      ApiErrorCode.SERVICE_UNAVAILABLE,
      'The relationship projection is unavailable.',
      {
        retryable: false,
        details: {
          code: ApiErrorCode.SERVICE_UNAVAILABLE,
          service: 'ViewerRelationshipProjection.identity_binding',
        },
      },
    );
  }
  return relationship;
}

function assertNotBlocked(
  relationship: Readonly<ViewerRelationshipProjection>,
  forShare: boolean,
): void {
  if (!relationship.viewerBlockedSubject && !relationship.subjectBlockedViewer) return;
  if (forShare) {
    throw new SafeApiError(ApiErrorCode.TOKEN_INVALID, 'The share token is unavailable.', {
      details: { code: ApiErrorCode.TOKEN_INVALID, tokenKind: 'CARD_SHARE' },
    });
  }
  throw new SafeApiError(ApiErrorCode.BLOCKED_RELATIONSHIP, 'The relationship blocks card access.', {
    details: { code: ApiErrorCode.BLOCKED_RELATIONSHIP, blocksAccess: true },
  });
}

async function buildCardForViewer(input: Readonly<{
  reader: IdentityReader;
  ownerUserId: UserId;
  viewerUserId: UserId;
  instant: UtcInstant;
  forShare: boolean;
  allowedFields?: readonly ShareAllowedFieldKey[];
  ownerMaySeePrivate?: boolean;
}>): Promise<ResolvedCardContext> {
  const owner = await input.reader.findUserById(input.ownerUserId);
  if (owner === null || owner.accountState !== 'ACTIVE') notFound('CARD');
  const profile = requireProfile(await input.reader.findProfileByUserId(input.ownerUserId));
  const base = requireCard(await input.reader.findCardByOwnerUserId(input.ownerUserId));
  assertCardCurrent(base, profile);
  const relationship = await loadRelationship(
    input.reader,
    input.viewerUserId,
    input.ownerUserId,
    input.instant,
  );
  assertNotBlocked(relationship, input.forShare);
  let tier: ViewerTier = relationshipTier(input.viewerUserId, input.ownerUserId, relationship);
  if (input.forShare && tier === 'OWNER') tier = 'FRIEND';
  if (input.ownerMaySeePrivate === false && tier === 'OWNER') tier = 'STRANGER';
  const visible = selectVisibleProfileFields(profile, tier, input.allowedFields);
  const claims = selectEffectiveClaims(
    await input.reader.listVerificationClaims(input.ownerUserId),
    input.ownerUserId,
    input.instant,
  );
  const avatarUrl = visible.avatarAssetId === undefined
    ? undefined
    : await input.reader.findApprovedMediaUrl(visible.avatarAssetId) ?? undefined;
  const card = buildViewerCard(
    base,
    visible,
    claims,
    tier,
    avatarUrl,
    input.allowedFields,
  );
  return { card, relationship };
}

function validateShareAllowedFields(value: readonly ShareAllowedFieldKey[]): readonly ShareAllowedFieldKey[] {
  const allowed = new Set(DEFAULT_SHARE_ALLOWED_FIELDS);
  if (value.length === 0 || value.some((field) => !allowed.has(field))) {
    throw new Error('defaultShareAllowedFields contains an unsupported field');
  }
  return Object.freeze([...new Set(value)]);
}

async function currentTargetVersion(
  reader: IdentityReader,
  targetType: 'CARD' | 'EVENT',
  targetId: string,
): Promise<number> {
  if (targetType === 'CARD') {
    const card = await reader.findCardById(targetId as CardId);
    if (card === null) notFound('CARD', targetId as CardId);
    return card.version;
  }
  const event = await reader.findPublicEvent(targetId as StableId<'event'>);
  if (event === null) notFound('EVENT', targetId as StableId<'event'>);
  return event.version;
}

async function assertTargetOwnedBy(
  reader: IdentityReader,
  targetType: 'CARD' | 'EVENT',
  targetId: string,
  ownerUserId: UserId,
): Promise<number> {
  if (targetType === 'CARD') {
    const card = await reader.findCardById(targetId as CardId);
    if (card === null) notFound('CARD', targetId as CardId);
    if (card.ownerUserId !== ownerUserId) {
      throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'Only the target owner may share it.', {
        details: { code: ApiErrorCode.FORBIDDEN, policy: 'SHARE_TARGET_OWNER_REQUIRED' },
      });
    }
    return card.version;
  }
  const eventId = targetId as StableId<'event'>;
  const [event, eventOwner] = await Promise.all([
    reader.findPublicEvent(eventId),
    reader.findEventShareOwnerUserId(eventId),
  ]);
  if (event === null || eventOwner === null) notFound('EVENT', eventId);
  if (eventOwner !== ownerUserId) {
    throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'Only the target owner may share it.', {
      details: { code: ApiErrorCode.FORBIDDEN, policy: 'SHARE_TARGET_OWNER_REQUIRED' },
    });
  }
  return event.version;
}

function tokenInvalid(kind: 'CARD_SHARE' | 'EVENT_SHARE' = 'CARD_SHARE'): never {
  throw new SafeApiError(ApiErrorCode.TOKEN_INVALID, 'The share token is invalid.', {
    details: { code: ApiErrorCode.TOKEN_INVALID, tokenKind: kind },
  });
}

function isStoredShareWellFormed(share: Readonly<ShareTokenRecord>): boolean {
  const allowedFields = new Set(DEFAULT_SHARE_ALLOWED_FIELDS);
  const hasValidAllowedFields = Array.isArray(share.allowedFields)
    && share.allowedFields.length > 0
    && new Set(share.allowedFields).size === share.allowedFields.length
    && share.allowedFields.every((field) => allowedFields.has(field));
  const expiresAtValid = typeof share.expiresAt === 'string'
    && UTC_PATTERN.test(share.expiresAt)
    && !Number.isNaN(Date.parse(share.expiresAt));
  const revokedAtValid = share.revoked
    ? typeof share.revokedAt === 'string'
      && UTC_PATTERN.test(share.revokedAt)
      && !Number.isNaN(Date.parse(share.revokedAt))
    : share.revokedAt === undefined;
  return (share.targetType === 'CARD' || share.targetType === 'EVENT')
    && typeof share._id === 'string'
    && STABLE_ID_PATTERN.test(share._id)
    && typeof share.ownerUserId === 'string'
    && STABLE_ID_PATTERN.test(share.ownerUserId)
    && typeof share.targetId === 'string'
    && STABLE_ID_PATTERN.test(share.targetId)
    && isSha256Digest(share.tokenDigest)
    && share.purpose === 'WECHAT_FORWARD'
    && typeof share.revoked === 'boolean'
    && revokedAtValid
    && Number.isSafeInteger(share.version)
    && share.version >= 1
    && expiresAtValid
    && hasValidAllowedFields;
}

function assertShareUsable(share: Readonly<ShareTokenRecord>, instant: UtcInstant): void {
  if (!isStoredShareWellFormed(share)) {
    tokenInvalid(share.targetType === 'EVENT' ? 'EVENT_SHARE' : 'CARD_SHARE');
  }
  if (share.revoked) {
    throw new SafeApiError(ApiErrorCode.TOKEN_REVOKED, 'The share token was revoked.', {
      details: { code: ApiErrorCode.TOKEN_REVOKED, revokedAt: share.revokedAt as UtcInstant },
    });
  }
  if (Date.parse(share.expiresAt) <= Date.parse(instant)) {
    throw new SafeApiError(ApiErrorCode.TOKEN_EXPIRED, 'The share token expired.', {
      details: { code: ApiErrorCode.TOKEN_EXPIRED, expiredAt: share.expiresAt },
    });
  }
}

function requireStoredObject(value: unknown, fields: readonly string[]): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value) || fields.some((field) => !(field in value))) {
    throw new Error('Stored idempotency result is malformed');
  }
  return value;
}

async function handleBootstrap(
  runtime: IdentityRuntime,
  payload: Readonly<Record<string, unknown>>,
  requestId: RequestId,
): Promise<IdentityBootstrapResponse> {
  assertPayloadKeys(payload, ['contractVersion', 'idempotencyKey', 'expectedVersion', 'requestedRuntime']);
  if (payload.requestedRuntime !== undefined && payload.requestedRuntime !== 'CLOUD') {
    validation('requestedRuntime', 'CLOUD_ONLY');
  }
  const openId = requireTrustedOpenId(runtime.getWxContext);
  const openIdHash = hashPrivateIdentifier(openId);
  return executeWrite({
    runtime,
    action: 'identity.bootstrap',
    requestId,
    payload,
    openIdHash,
    principal: null,
    operation: async (transaction, instant) => {
      let user = await transaction.findUserByOpenIdHash(openIdHash);
      if (user === null) {
        assertCreationVersion(payload.expectedVersion);
        user = Object.freeze({
          _id: randomStableId<'user'>('user'),
          openIdHash,
          accountState: 'ACTIVE',
          roles: Object.freeze(['MEMBER'] as const),
          version: 1,
          createdAt: instant,
          updatedAt: instant,
        });
        await transaction.saveUser(user);
      } else {
        if (payload.expectedVersion !== undefined) assertCurrentVersion(payload.expectedVersion, user.version);
        if (user.accountState !== 'ACTIVE') {
          throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'This account cannot perform the action.', {
            details: { code: ApiErrorCode.FORBIDDEN, policy: 'ACTIVE_ACCOUNT_REQUIRED' },
          });
        }
      }
      const profile = await transaction.findProfileByUserId(user._id);
      const data: IdentityBootstrapResponse = {
        session: {
          userId: user._id,
          roles: user.roles,
          runtimeMode: runtime.runtimeMode,
          contractVersion: CONTRACT_VERSION,
          profileComplete: profile !== null && profileCompletionPercent(profile) === 100,
          expiresAt: plusMilliseconds(instant, runtime.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS),
        },
        ...(profile === null ? {} : { profile: toProfilePrivateDto(profile) }),
      };
      return {
        data,
        storedResult: data,
        targetType: 'USER',
        targetId: user._id,
      };
    },
    replay: async (stored, transaction) => {
      const data = cloneJson(requireStoredObject(stored, ['session'])) as unknown as IdentityBootstrapResponse;
      const user = await transaction.findUserById(data.session.userId);
      if (user === null || user.accountState !== 'ACTIVE') {
        throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'This account cannot perform the action.', {
          details: { code: ApiErrorCode.FORBIDDEN, policy: 'ACTIVE_ACCOUNT_REQUIRED' },
        });
      }
      return data;
    },
  });
}

async function handleProfileGetMine(
  runtime: IdentityRuntime,
  payload: Readonly<Record<string, unknown>>,
): Promise<ProfileGetMineResponse> {
  assertPayloadKeys(payload, ['contractVersion', 'includeCompletion']);
  if (typeof payload.includeCompletion !== 'boolean') {
    invalidRequest('includeCompletion', 'BOOLEAN_REQUIRED');
  }
  const principal = await loadPrincipal(runtime);
  const profile = requireProfile(await runtime.store.findProfileByUserId(principal.userId as UserId));
  return {
    profile: toProfilePrivateDto(profile),
    completionPercent: profileCompletionPercent(profile),
  };
}

function validateProfileInput(value: unknown): Readonly<{
  displayName: string;
  cityId?: import('../../miniprogram/shared/constants/geography').CityId;
  biography?: string;
  avatarAssetId?: MediaAssetId;
}> {
  if (!isPlainRecord(value)) validation('profile', 'OBJECT');
  const allowed = new Set(['displayName', 'cityId', 'biography', 'avatarAssetId']);
  const extra = Object.keys(value).find((key) => !allowed.has(key));
  if (extra !== undefined) invalidRequest(`profile.${extra}`, 'UNEXPECTED_FIELD');
  if (typeof value.displayName !== 'string') validation('profile.displayName', 'STRING');
  const displayName = value.displayName.trim();
  if (displayName.length === 0 || displayName.length > DISPLAY_NAME_MAX) {
    validation('profile.displayName', `TRIMMED_1_TO_${DISPLAY_NAME_MAX}_CHARS`);
  }
  const result: {
    displayName: string;
    cityId?: import('../../miniprogram/shared/constants/geography').CityId;
    biography?: string;
    avatarAssetId?: MediaAssetId;
  } = { displayName };
  if (value.cityId !== undefined) {
    if (typeof value.cityId !== 'string' || !isKnownCityId(value.cityId)) {
      validation('profile.cityId', 'FROZEN_CITY_ID');
    }
    result.cityId = value.cityId;
  }
  if (value.biography !== undefined) {
    if (typeof value.biography !== 'string' || value.biography.trim().length > BIOGRAPHY_MAX) {
      validation('profile.biography', `MAX_${BIOGRAPHY_MAX}_CHARS`);
    }
    const biography = value.biography.trim();
    if (biography.length > 0) result.biography = biography;
  }
  if (value.avatarAssetId !== undefined) {
    if (typeof value.avatarAssetId !== 'string' || !ASSET_ID_PATTERN.test(value.avatarAssetId)) {
      validation('profile.avatarAssetId', 'STABLE_MEDIA_ASSET_ID');
    }
    result.avatarAssetId = value.avatarAssetId as MediaAssetId;
  }
  return Object.freeze(result);
}

function updatedProfileRecord(
  current: Readonly<PrivateProfileRecord> | null,
  userId: UserId,
  profile: ReturnType<typeof validateProfileInput>,
  instant: UtcInstant,
): Readonly<PrivateProfileRecord> {
  const record: {
    _id: StableId<'profile'>;
    userId: UserId;
    displayName: string;
    avatarAssetId?: MediaAssetId;
    cityId?: import('../../miniprogram/shared/constants/geography').CityId;
    biography?: string;
    headline?: string;
    industry?: string;
    company?: string;
    position?: string;
    experience?: readonly string[];
    interests?: readonly string[];
    phone?: string;
    email?: string;
    governmentId?: string;
    verificationEvidenceUrls?: readonly string[];
    wechatIdentifiers?: Readonly<Record<string, string>>;
    riskControl?: import('./domain').InternalRiskFields;
    visibility: import('./domain').ProfileVisibility;
    requiredProjectionVersion: number;
    version: number;
    createdAt: UtcInstant;
    updatedAt: UtcInstant;
  } = {
    _id: current?._id ?? randomStableId<'profile'>('profile'),
    userId,
    displayName: profile.displayName,
    visibility: current?.visibility ?? DEFAULT_PROFILE_VISIBILITY,
    requiredProjectionVersion: (current?.version ?? 0) + 1,
    version: (current?.version ?? 0) + 1,
    createdAt: current?.createdAt ?? instant,
    updatedAt: instant,
  };
  if (profile.avatarAssetId !== undefined) record.avatarAssetId = profile.avatarAssetId;
  if (profile.cityId !== undefined) record.cityId = profile.cityId;
  if (profile.biography !== undefined) record.biography = profile.biography;
  if (current?.headline !== undefined) record.headline = current.headline;
  if (current?.industry !== undefined) record.industry = current.industry;
  if (current?.company !== undefined) record.company = current.company;
  if (current?.position !== undefined) record.position = current.position;
  if (current?.experience !== undefined) record.experience = Object.freeze([...current.experience]);
  if (current?.interests !== undefined) record.interests = Object.freeze([...current.interests]);
  if (current?.phone !== undefined) record.phone = current.phone;
  if (current?.email !== undefined) record.email = current.email;
  if (current?.governmentId !== undefined) record.governmentId = current.governmentId;
  if (current?.verificationEvidenceUrls !== undefined) {
    record.verificationEvidenceUrls = Object.freeze([...current.verificationEvidenceUrls]);
  }
  if (current?.wechatIdentifiers !== undefined) record.wechatIdentifiers = Object.freeze({ ...current.wechatIdentifiers });
  if (current?.riskControl !== undefined) record.riskControl = Object.freeze({ ...current.riskControl });
  return Object.freeze(record);
}

async function handleProfileUpdateMine(
  runtime: IdentityRuntime,
  payload: Readonly<Record<string, unknown>>,
  requestId: RequestId,
): Promise<ProfileUpdateMineResponse> {
  assertPayloadKeys(payload, ['contractVersion', 'idempotencyKey', 'expectedVersion', 'profile']);
  const inputProfile = validateProfileInput(payload.profile);
  const principal = await loadPrincipal(runtime);
  const userId = principal.userId as UserId;
  return executeWrite({
    runtime,
    action: 'profile.updateMine',
    requestId,
    payload,
    openIdHash: hashPrivateIdentifier(principal.openId),
    principal,
    operation: async (transaction, instant) => {
      const current = await transaction.findProfileByUserId(userId);
      if (current === null) assertCreationVersion(payload.expectedVersion);
      else assertCurrentVersion(payload.expectedVersion, current.version);
      const updated = updatedProfileRecord(current, userId, inputProfile, instant);
      await transaction.saveProfile(updated);
      const data: ProfileUpdateMineResponse = {
        profile: toProfilePrivateDto(updated),
        projectionRefreshRequested: true,
      };
      return {
        data,
        storedResult: data,
        targetType: 'PROFILE',
        targetId: updated._id,
      };
    },
    replay: (stored) => cloneJson(requireStoredObject(stored, ['profile', 'projectionRefreshRequested'])) as unknown as ProfileUpdateMineResponse,
  });
}

async function handleCardGetMine(
  runtime: IdentityRuntime,
  payload: Readonly<Record<string, unknown>>,
): Promise<CardGetMineResponse> {
  assertPayloadKeys(payload, ['contractVersion', 'includePrivatePreview']);
  if (typeof payload.includePrivatePreview !== 'boolean') {
    invalidRequest('includePrivatePreview', 'BOOLEAN_REQUIRED');
  }
  const includePrivatePreview = payload.includePrivatePreview;
  const principal = await loadPrincipal(runtime);
  let result: ResolvedCardContext;
  try {
    result = await buildCardForViewer({
      reader: runtime.store,
      ownerUserId: principal.userId as UserId,
      viewerUserId: principal.userId as UserId,
      instant: now(runtime),
      forShare: false,
      ownerMaySeePrivate: includePrivatePreview,
    });
  } catch (error) {
    if (error instanceof SafeApiError && error.code === ApiErrorCode.PROJECTION_STALE) {
      throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, 'The card is being refreshed. Please retry.', {
        retryable: true,
        details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: 'cards_public.projection' },
      });
    }
    throw error;
  }
  return { card: result.card };
}

async function handleCardGetForViewer(
  runtime: IdentityRuntime,
  payload: Readonly<Record<string, unknown>>,
): Promise<CardGetForViewerResponse> {
  assertPayloadKeys(payload, ['contractVersion', 'ownerUserId']);
  const ownerUserId = asUserId(requireStableString(payload.ownerUserId, 'ownerUserId'));
  const principal = await loadPrincipal(runtime);
  const result = await buildCardForViewer({
    reader: runtime.store,
    ownerUserId,
    viewerUserId: principal.userId as UserId,
    instant: now(runtime),
    forShare: false,
  });
  return {
    card: result.card,
    relationship: result.relationship,
    claims: result.card.claims,
  };
}

async function handleCardRefreshProjection(
  runtime: IdentityRuntime,
  payload: Readonly<Record<string, unknown>>,
  requestId: RequestId,
): Promise<CardRefreshProjectionResponse> {
  assertPayloadKeys(payload, ['contractVersion', 'idempotencyKey', 'expectedVersion', 'reason']);
  const reasons = ['PROFILE_CHANGED', 'RELATIONSHIP_CHANGED', 'VERIFICATION_CHANGED', 'MANUAL_REPAIR'];
  if (typeof payload.reason !== 'string' || !reasons.includes(payload.reason)) {
    validation('reason', 'FROZEN_REFRESH_REASON');
  }
  const principal = await loadPrincipal(runtime);
  const userId = principal.userId as UserId;
  return executeWrite({
    runtime,
    action: 'card.refreshProjection',
    requestId,
    payload,
    openIdHash: hashPrivateIdentifier(principal.openId),
    principal,
    operation: async (transaction, instant) => {
      const profile = requireProfile(await transaction.findProfileByUserId(userId));
      assertCurrentVersion(payload.expectedVersion, profile.version);
      const previous = await transaction.findCardByOwnerUserId(userId);
      const claims = selectEffectiveClaims(
        await transaction.listVerificationClaims(userId),
        userId,
        instant,
      );
      const publicSelection = selectVisibleProfileFields(profile, 'STRANGER');
      const avatarUrl = publicSelection.avatarAssetId === undefined
        ? undefined
        : await transaction.findApprovedMediaUrl(publicSelection.avatarAssetId) ?? undefined;
      const card = buildPublicCardRecord({
        profile,
        previous,
        claims,
        ...(avatarUrl === undefined ? {} : { avatarUrl }),
        now: instant,
      });
      await transaction.saveCard(card);
      const data: CardRefreshProjectionResponse = {
        card: toPublicCardProjection(card, claims),
        refreshedFromVersion: profile.version as OptimisticVersion,
      };
      return {
        data,
        storedResult: data,
        targetType: 'CARD',
        targetId: card.cardId,
      };
    },
    replay: (stored) => cloneJson(requireStoredObject(stored, ['card', 'refreshedFromVersion'])) as unknown as CardRefreshProjectionResponse,
  });
}

function validateTarget(payload: Readonly<Record<string, unknown>>): Readonly<{
  targetType: 'CARD' | 'EVENT';
  targetId: string;
}> {
  if (payload.targetType !== 'CARD' && payload.targetType !== 'EVENT') {
    validation('targetType', 'CARD_OR_EVENT');
  }
  return {
    targetType: payload.targetType,
    targetId: requireStableString(payload.targetId, 'targetId'),
  };
}

function validateExpiry(
  value: unknown,
  instant: UtcInstant,
  defaultTtlMs: number,
): UtcInstant {
  const expiresAt = value === undefined
    ? plusMilliseconds(instant, defaultTtlMs)
    : requireUtc(value, 'expiresAt');
  const ttl = Date.parse(expiresAt) - Date.parse(instant);
  if (ttl <= 0 || ttl > MAX_SHARE_TTL_MS) validation('expiresAt', 'FUTURE_WITHIN_30_DAYS');
  return expiresAt;
}

async function replayShareCreate(
  runtime: IdentityRuntime,
  stored: unknown,
  reader: IdentityReader,
): Promise<ShareCreateResponse> {
  const record = requireStoredObject(stored, ['shareTokenId', 'targetType', 'targetId', 'expiresAt']);
  if (record.targetType !== 'CARD' && record.targetType !== 'EVENT') {
    throw new Error('Stored share target type is malformed');
  }
  const shareTokenId = requireStableString(record.shareTokenId, 'stored.shareTokenId') as ShareTokenId;
  const token = deriveShareToken(runtime.tokenSigningKey, shareTokenId);
  const share = await reader.findShareById(shareTokenId);
  if (share === null
      || !isStoredShareWellFormed(share)
      || share.targetType !== record.targetType
      || share.targetId !== record.targetId
      || share.tokenDigest !== hashShareToken(token)) {
    throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, 'The share signing key is unavailable.', {
      retryable: false,
      details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: 'SHARE_TOKEN_SIGNING_KEY' },
    });
  }
  return {
    shareTokenId,
    token,
    targetType: record.targetType,
    targetId: requireStableString(record.targetId, 'stored.targetId') as CardId & StableId<'event'>,
    expiresAt: requireUtc(record.expiresAt, 'stored.expiresAt'),
  } as ShareCreateResponse;
}

async function handleShareCreate(
  runtime: IdentityRuntime,
  payload: Readonly<Record<string, unknown>>,
  requestId: RequestId,
): Promise<ShareCreateResponse> {
  assertPayloadKeys(payload, [
    'contractVersion', 'idempotencyKey', 'expectedVersion', 'targetType', 'targetId', 'expiresAt',
  ]);
  const target = validateTarget(payload);
  const principal = await loadPrincipal(runtime);
  const userId = principal.userId as UserId;
  const allowedFields = validateShareAllowedFields(
    runtime.defaultShareAllowedFields ?? DEFAULT_SHARE_ALLOWED_FIELDS,
  );
  return executeWrite({
    runtime,
    action: 'share.create',
    requestId,
    payload,
    openIdHash: hashPrivateIdentifier(principal.openId),
    principal,
    operation: async (transaction, instant) => {
      const targetVersion = await assertTargetOwnedBy(
        transaction,
        target.targetType,
        target.targetId,
        userId,
      );
      assertCurrentVersion(payload.expectedVersion, targetVersion);
      const expiresAt = validateExpiry(
        payload.expiresAt,
        instant,
        runtime.defaultShareTtlMs ?? DEFAULT_SHARE_TTL_MS,
      );
      const shareTokenId = randomStableId<'share-token'>('share', 24) as ShareTokenId;
      const token = deriveShareToken(runtime.tokenSigningKey, shareTokenId);
      const share: ShareTokenRecord = Object.freeze({
        _id: shareTokenId,
        ownerUserId: userId,
        targetType: target.targetType,
        targetId: target.targetId as CardId & StableId<'event'>,
        tokenDigest: hashShareToken(token),
        purpose: 'WECHAT_FORWARD',
        allowedFields,
        expiresAt,
        revoked: false,
        version: 1,
        createdAt: instant,
        updatedAt: instant,
      });
      await transaction.saveShare(share);
      const data = {
        shareTokenId,
        token,
        targetType: target.targetType,
        targetId: target.targetId,
        expiresAt,
      } as ShareCreateResponse;
      return {
        data,
        storedResult: {
          shareTokenId,
          targetType: target.targetType,
          targetId: target.targetId,
          expiresAt,
        },
        targetType: 'SHARE_TOKEN',
        targetId: shareTokenId,
      };
    },
    replay: (stored, transaction) => replayShareCreate(runtime, stored, transaction),
  });
}

async function resolveShareRecord(
  runtime: IdentityRuntime,
  payload: Readonly<Record<string, unknown>>,
): Promise<Readonly<ShareTokenRecord>> {
  const hasToken = payload.token !== undefined;
  const hasScene = payload.scene !== undefined;
  if (hasToken === hasScene) invalidRequest('payload', 'EXACTLY_ONE_OF_TOKEN_OR_SCENE');
  if (hasToken) {
    if (!isValidShareToken(payload.token)) tokenInvalid();
    const presentedDigest = hashShareToken(payload.token);
    const share = await runtime.store.findShareByTokenDigest(presentedDigest);
    if (share === null || share.tokenDigest !== presentedDigest) tokenInvalid();
    return share;
  }
  if (!isValidQrScene(payload.scene)) tokenInvalid();
  const presentedDigest = hashShareToken(payload.scene);
  const share = await runtime.store.findShareByTokenDigest(presentedDigest);
  if (share === null || share.tokenDigest !== presentedDigest) tokenInvalid();
  return share;
}

async function resolveEventShare(
  runtime: IdentityRuntime,
  share: Readonly<ShareTokenRecord>,
  instant: UtcInstant,
  viewer: TrustedPrincipal | null,
): Promise<Readonly<PublicEventProjection>> {
  const eventId = share.targetId as StableId<'event'>;
  const [event, eventOwnerUserId] = await Promise.all([
    runtime.store.findPublicEvent(eventId),
    runtime.store.findEventShareOwnerUserId(eventId),
  ]);
  if (event === null || eventOwnerUserId !== share.ownerUserId) tokenInvalid('EVENT_SHARE');
  const parsed = parseReadOnlyProjection('PublicEventProjection', event);
  if (parsed.state !== EventState.PUBLISHED || parsed.publicationState !== PublicationState.PUBLISHED) {
    tokenInvalid('EVENT_SHARE');
  }
  const owner = await runtime.store.findUserById(share.ownerUserId);
  if (owner === null || owner.accountState !== 'ACTIVE') tokenInvalid('EVENT_SHARE');
  if (viewer?.userId !== undefined) {
    const relationship = await loadRelationship(runtime.store, viewer.userId, share.ownerUserId, instant);
    assertNotBlocked(relationship, true);
  }
  return parsed;
}

async function handleShareResolve(
  runtime: IdentityRuntime,
  payload: Readonly<Record<string, unknown>>,
): Promise<ShareResolveResponse> {
  assertPayloadKeys(payload, ['contractVersion', 'token', 'scene']);
  const instant = now(runtime);
  const share = await resolveShareRecord(runtime, payload);
  assertShareUsable(share, instant);
  const viewer = await loadOptionalPrincipal(runtime);
  let resolution: ShareResolutionProjection;
  if (share.targetType === 'CARD') {
    const cardRecord = await runtime.store.findCardById(share.targetId as CardId);
    if (cardRecord === null || cardRecord.ownerUserId !== share.ownerUserId) tokenInvalid();
    const viewerUserId = viewer?.userId ?? randomStableId<'user'>('anonymous');
    let result: ResolvedCardContext;
    try {
      result = await buildCardForViewer({
        reader: runtime.store,
        ownerUserId: cardRecord.ownerUserId,
        viewerUserId,
        instant,
        forShare: true,
        allowedFields: share.allowedFields,
      });
    } catch (error) {
      if (error instanceof SafeApiError && error.code === ApiErrorCode.PROJECTION_STALE) {
        throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, 'The shared card is being refreshed. Please retry.', {
          retryable: true,
          details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: 'cards_public.projection' },
        });
      }
      throw error;
    }
    resolution = {
      tokenId: share._id,
      targetType: 'CARD',
      targetId: share.targetId as CardId,
      card: result.card,
      resolvedAt: instant,
      expiresAt: share.expiresAt,
      revoked: false,
    };
  } else {
    const event = await resolveEventShare(runtime, share, instant, viewer);
    resolution = {
      tokenId: share._id,
      targetType: 'EVENT',
      targetId: share.targetId as StableId<'event'>,
      event,
      resolvedAt: instant,
      expiresAt: share.expiresAt,
      revoked: false,
    };
  }
  return { resolution };
}

async function loadShareTargetVersion(
  reader: IdentityReader,
  share: Readonly<ShareTokenRecord>,
): Promise<number> {
  return currentTargetVersion(reader, share.targetType, share.targetId);
}

async function handleShareRevoke(
  runtime: IdentityRuntime,
  payload: Readonly<Record<string, unknown>>,
  requestId: RequestId,
): Promise<ShareRevokeResponse> {
  assertPayloadKeys(payload, ['contractVersion', 'idempotencyKey', 'expectedVersion', 'shareTokenId']);
  const shareTokenId = requireStableString(payload.shareTokenId, 'shareTokenId') as ShareTokenId;
  const principal = await loadPrincipal(runtime);
  const userId = principal.userId as UserId;
  return executeWrite({
    runtime,
    action: 'share.revoke',
    requestId,
    payload,
    openIdHash: hashPrivateIdentifier(principal.openId),
    principal,
    operation: async (transaction, instant) => {
      const share = await transaction.findShareById(shareTokenId);
      if (share === null) notFound('SHARE_TOKEN', shareTokenId);
      if (!isStoredShareWellFormed(share)) throw new Error('Stored share record is malformed');
      if (share.ownerUserId !== userId) {
        throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'Only the share owner may revoke it.', {
          details: { code: ApiErrorCode.FORBIDDEN, policy: 'SHARE_OWNER_REQUIRED' },
        });
      }
      assertCurrentVersion(payload.expectedVersion, await loadShareTargetVersion(transaction, share));
      const revokedAt = share.revokedAt ?? instant;
      if (!share.revoked) {
        await transaction.saveShare(Object.freeze({
          ...share,
          revoked: true,
          revokedAt,
          version: share.version + 1,
          updatedAt: instant,
        }));
      }
      const data: ShareRevokeResponse = { shareTokenId, revokedAt };
      return {
        data,
        storedResult: data,
        targetType: 'SHARE_TOKEN',
        targetId: shareTokenId,
      };
    },
    replay: (stored) => cloneJson(requireStoredObject(stored, ['shareTokenId', 'revokedAt'])) as unknown as ShareRevokeResponse,
  });
}

function qrPageForTarget(targetType: 'CARD' | 'EVENT'): 'pages/card-share/index' | 'pages/event-share/index' {
  return targetType === 'CARD' ? 'pages/card-share/index' : 'pages/event-share/index';
}

async function replayQrScene(
  runtime: IdentityRuntime,
  stored: unknown,
  reader: IdentityReader,
): Promise<ShareCreateQrSceneResponse> {
  const record = requireStoredObject(stored, [
    'shareTokenId', 'targetType', 'page', 'qrAssetId',
  ]);
  if ((record.targetType !== 'CARD' && record.targetType !== 'EVENT')
      || typeof record.shareTokenId !== 'string'
      || !STABLE_ID_PATTERN.test(record.shareTokenId)
      || record.page !== qrPageForTarget(record.targetType)
      || typeof record.qrAssetId !== 'string'
      || !STABLE_ID_PATTERN.test(record.qrAssetId)) {
    throw new Error('Stored QR idempotency result is malformed');
  }
  const shareTokenId = record.shareTokenId as ShareTokenId;
  const share = await reader.findShareById(shareTokenId);
  const scene = deriveShareToken(runtime.tokenSigningKey, shareTokenId);
  if (share === null
      || !isStoredShareWellFormed(share)
      || share.targetType !== record.targetType
      || share.tokenDigest !== hashShareToken(scene)
      || !isValidQrScene(scene)) {
    throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, 'The share signing key is unavailable.', {
      retryable: false,
      details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: 'SHARE_TOKEN_SIGNING_KEY' },
    });
  }
  return {
    shareTokenId,
    targetType: record.targetType,
    page: record.page,
    scene,
    qrAssetId: record.qrAssetId as MediaAssetId,
  } as ShareCreateQrSceneResponse;
}

async function handleShareCreateQrScene(
  runtime: IdentityRuntime,
  payload: Readonly<Record<string, unknown>>,
  requestId: RequestId,
): Promise<ShareCreateQrSceneResponse> {
  assertPayloadKeys(payload, [
    'contractVersion', 'idempotencyKey', 'expectedVersion', 'shareTokenId', 'targetType', 'page',
  ]);
  const shareTokenId = requireStableString(payload.shareTokenId, 'shareTokenId') as ShareTokenId;
  if (payload.targetType !== 'CARD' && payload.targetType !== 'EVENT') {
    validation('targetType', 'CARD_OR_EVENT');
  }
  const expectedPage = qrPageForTarget(payload.targetType);
  if (payload.page !== expectedPage) validation('page', 'TARGET_MATCHING_COLD_START_PAGE');
  const principal = await loadPrincipal(runtime);
  const userId = principal.userId as UserId;
  return executeWrite({
    runtime,
    action: 'share.createQrScene',
    requestId,
    payload,
    openIdHash: hashPrivateIdentifier(principal.openId),
    principal,
    operation: async (transaction, instant) => {
      const share = await transaction.findShareById(shareTokenId);
      if (share === null) notFound('SHARE_TOKEN', shareTokenId);
      if (!isStoredShareWellFormed(share)) throw new Error('Stored share record is malformed');
      if (share.ownerUserId !== userId) {
        throw new SafeApiError(ApiErrorCode.FORBIDDEN, 'Only the share owner may create its QR scene.', {
          details: { code: ApiErrorCode.FORBIDDEN, policy: 'SHARE_OWNER_REQUIRED' },
        });
      }
      if (share.targetType !== payload.targetType) validation('targetType', 'MUST_MATCH_SHARE_TARGET');
      if (share.revoked || Date.parse(share.expiresAt) <= Date.parse(instant)) {
        throw new SafeApiError(ApiErrorCode.CONFLICT, 'The share is no longer available for QR generation.', {
          details: { code: ApiErrorCode.CONFLICT, conflictType: 'SHARE_NOT_ACTIVE' },
        });
      }
      assertCurrentVersion(payload.expectedVersion, await loadShareTargetVersion(transaction, share));
      const scene = deriveShareToken(runtime.tokenSigningKey, shareTokenId);
      if (!isValidQrScene(scene)) throw new Error('Generated share ID is not a safe QR scene');
      if (hashShareToken(scene) !== share.tokenDigest) {
        throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, 'The share signing key is unavailable.', {
          retryable: false,
          details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: 'SHARE_TOKEN_SIGNING_KEY' },
        });
      }
      let generated: Readonly<{ storageFileId: string }>;
      try {
        generated = await runtime.qrCode.generate({
          operationKey: `qr:${shareTokenId}:${payload.idempotencyKey as string}`,
          page: expectedPage,
          scene,
        });
      } catch {
        throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, 'The mini program code could not be generated. Please retry.', {
          retryable: true,
          details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: 'WECHAT_QR_CODE' },
        });
      }
      if (typeof generated.storageFileId !== 'string'
          || generated.storageFileId.length === 0
          || generated.storageFileId.includes(scene)) {
        throw new SafeApiError(ApiErrorCode.SERVICE_UNAVAILABLE, 'The mini program code could not be generated. Please retry.', {
          retryable: true,
          details: { code: ApiErrorCode.SERVICE_UNAVAILABLE, service: 'WECHAT_QR_CODE' },
        });
      }
      const qrAssetId = randomStableId<'media-asset'>('media_qr') as MediaAssetId;
      const media: QrMediaRecord = Object.freeze({
        _id: qrAssetId,
        ownerUserId: userId,
        domain: payload.targetType === 'CARD' ? 'CARD_SHARE' : 'EVENT_SHARE',
        storageFileId: generated.storageFileId,
        rights: Object.freeze({
          state: 'CLAIMED',
          rightsHolderName: 'AB Club member generated share code',
          sourceDescription: 'Generated by the trusted WeChat mini program code service.',
          permittedUses: Object.freeze(['SHARE'] as const),
        }),
        publicState: 'PRIVATE',
        version: 1,
        createdAt: instant,
        updatedAt: instant,
      });
      await transaction.saveQrMedia(media);
      const data = {
        shareTokenId,
        targetType: payload.targetType,
        page: expectedPage,
        scene,
        qrAssetId,
      } as ShareCreateQrSceneResponse;
      return {
        data,
        storedResult: {
          shareTokenId,
          targetType: payload.targetType,
          page: expectedPage,
          qrAssetId,
        },
        targetType: 'MEDIA_ASSET',
        targetId: qrAssetId,
      };
    },
    replay: (stored, transaction) => replayQrScene(runtime, stored, transaction),
  });
}

async function dispatch(
  runtime: IdentityRuntime,
  action: IdentityAction,
  payload: Readonly<Record<string, unknown>>,
  requestId: RequestId,
): Promise<IdentityResponse> {
  switch (action) {
    case 'identity.bootstrap': return handleBootstrap(runtime, payload, requestId);
    case 'profile.getMine': return handleProfileGetMine(runtime, payload);
    case 'profile.updateMine': return handleProfileUpdateMine(runtime, payload, requestId);
    case 'card.getMine': return handleCardGetMine(runtime, payload);
    case 'card.getForViewer': return handleCardGetForViewer(runtime, payload);
    case 'card.refreshProjection': return handleCardRefreshProjection(runtime, payload, requestId);
    case 'share.create': return handleShareCreate(runtime, payload, requestId);
    case 'share.resolve': return handleShareResolve(runtime, payload);
    case 'share.revoke': return handleShareRevoke(runtime, payload, requestId);
    case 'share.createQrScene': return handleShareCreateQrScene(runtime, payload, requestId);
  }
}

export function createIdentityEndpoint(runtime: IdentityRuntime): IdentityEndpoint {
  requireRuntime(runtime);
  const writeGuardPlans: Partial<Record<IdentityAction, WriteGuardPlan>> = {};
  IDENTITY_WRITE_ACTIONS.forEach((action) => {
    writeGuardPlans[action] = defineWriteGuardPlan(action);
  });

  return Object.freeze({
    actions: Object.freeze([...IDENTITY_ACTIONS]),
    writeGuardPlans: Object.freeze({ ...writeGuardPlans }),
    main: async (event: unknown): Promise<ApiResult<IdentityResponse>> => {
      const fallbackRequestId = responseRequestId(event);
      try {
        const request = validateCallEnvelope(event, IDENTITY_ACTIONS);
        const requestId = request.requestId as RequestId;
        const data = await dispatch(runtime, request.action, request.payload, requestId);
        return success(requestId, data);
      } catch (error) {
        return safeFailureFromError(
          fallbackRequestId,
          error instanceof Error ? error : new Error('Non-error thrown at identityApi boundary'),
        );
      }
    },
  });
}

export const IDENTITY_RUNTIME_MODES = Object.freeze([
  RuntimeMode.LIVE,
  RuntimeMode.DEGRADED,
  RuntimeMode.OFFLINE_DEMO,
]);
